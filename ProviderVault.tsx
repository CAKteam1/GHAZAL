import { useState } from 'react';
import { KeyRound, Check } from 'lucide-react';
import { apiFetch } from '../lib/api';

type ProviderId = 'gemini' | 'claude' | 'openai';

interface Props {
  status: {
    activeProvider: ProviderId;
    models: Record<ProviderId, string>;
    configured: Record<ProviderId, boolean>;
  };
  onRefresh: () => void;
}

const LABELS: Record<ProviderId, { name: string; placeholder: string; defaultModel: string }> = {
  gemini: { name: 'Google Gemini', placeholder: 'AIza...', defaultModel: 'gemini-2.5-pro' },
  claude: { name: 'Anthropic Claude', placeholder: 'sk-ant-...', defaultModel: 'claude-sonnet-4-20250514' },
  openai: { name: 'OpenAI ChatGPT', placeholder: 'sk-proj-...', defaultModel: 'gpt-4o' },
};

export function ProviderVault({ status, onRefresh }: Props) {
  const [selected, setSelected] = useState<ProviderId>(status.activeProvider);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(status.models[status.activeProvider] || '');
  const [saving, setSaving] = useState(false);

  function selectProvider(id: ProviderId) {
    setSelected(id);
    setModel(status.models[id] || LABELS[id].defaultModel);
  }

  async function saveKey() {
    setSaving(true);
    try {
      if (apiKey.trim()) {
        await apiFetch('/api/providers/key', {
          method: 'POST',
          body: JSON.stringify({ provider: selected, apiKey, model }),
        });
      }
      await apiFetch('/api/providers/active', {
        method: 'POST',
        body: JSON.stringify({ provider: selected }),
      });
      setApiKey('');
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-[var(--accent-brown)]">
          <KeyRound size={14} /> Provider Vault
        </div>
        <span className="text-[11px] text-[var(--accent-brown-soft)]">AES-256 Encrypted</span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {(['gemini', 'claude', 'openai'] as ProviderId[]).map((id) => {
          const isActive = status.activeProvider === id;
          return (
            <button
              key={id}
              onClick={() => selectProvider(id)}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                selected === id
                  ? 'border-[var(--ink-black)] bg-[var(--ink-black)] text-[var(--bg-matte)]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-matte)] text-[var(--ink-black)] hover:border-[var(--accent-brown)]'
              }`}
            >
              <span>{LABELS[id].name.split(' ')[1]}</span>
              {status.configured[id] && (
                <Check size={13} className={isActive ? 'text-emerald-400' : 'opacity-60'} />
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="Model ID"
          className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 font-mono text-xs outline-none focus:border-[var(--accent-brown)]"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`${LABELS[selected].name} API Key (${LABELS[selected].placeholder})`}
            className="flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 text-xs outline-none focus:border-[var(--accent-brown)]"
          />
          <button
            onClick={saveKey}
            disabled={saving}
            className="rounded-xl bg-[var(--accent-brown)] px-4 py-2 text-xs font-semibold tracking-wider uppercase text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? '...' : 'Save & Activate'}
          </button>
        </div>
      </div>
    </section>
  );
}
