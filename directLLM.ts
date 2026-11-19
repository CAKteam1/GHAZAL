export type ProviderId = 'gemini' | 'claude' | 'openai';

export interface ProviderConfig {
  activeProvider: ProviderId;
  models: Record<ProviderId, string>;
  keys: Partial<Record<ProviderId, string>>;
}

const STORAGE_KEY = 'ghazal_standalone_vault_v1';

const DEFAULT_CONFIG: ProviderConfig = {
  activeProvider: 'gemini',
  models: {
    gemini: 'gemini-2.5-flash',
    claude: 'claude-sonnet-4-20250514',
    openai: 'gpt-4o-mini',
  },
  keys: {},
};

export function loadVault(): ProviderConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      models: { ...DEFAULT_CONFIG.models, ...(parsed.models || {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveVault(cfg: ProviderConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export async function callDirectLLM(params: {
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
}): Promise<{ text: string; provider: ProviderId; model: string; latencyMs: number }> {
  const vault = loadVault();
  const provider = vault.activeProvider;
  const apiKey = vault.keys[provider]?.trim();
  const model = vault.models[provider];

  if (!apiKey) {
    throw new Error(`يرجى إضافة مفتاح API الخاص بـ ${provider.toUpperCase()} في تبويب الإعدادات أولاً.`);
  }

  const start = Date.now();
  let text = '';

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
        generationConfig: params.jsonMode ? { responseMimeType: 'application/json' } : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `Gemini HTTP ${res.status}`);
    text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: params.systemPrompt,
        messages: [{ role: 'user', content: params.userPrompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `Claude HTTP ${res.status}`);
    text = data.content?.find((b: any) => b.type === 'text')?.text || '';
  } else if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: params.jsonMode ? { type: 'json_object' } : undefined,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `OpenAI HTTP ${res.status}`);
    text = data.choices?.[0]?.message?.content || '';
  }

  return {
    text,
    provider,
    model,
    latencyMs: Date.now() - start,
  };
}
