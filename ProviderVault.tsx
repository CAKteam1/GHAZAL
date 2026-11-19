import { useState } from 'react';
import { KeyRound, Check } from 'lucide-react';
import { loadVault, saveVault, ProviderId } from '../lib/directLLM';

const LABELS: Record<ProviderId, { name: string; placeholder: string; defaultModel: string }> = {
  gemini: { name: 'Google Gemini', placeholder: 'AIza...', defaultModel: 'gemini-2.5-flash' },
  claude: { name: 'Anthropic Claude', placeholder: 'sk-ant-...', defaultModel: 'claude-sonnet-4-20250514' },
  openai: { name: 'OpenAI ChatGPT', placeholder: 'sk-proj-...', defaultModel: 'gpt-4o-mini' },
};

export function ProviderVault({ onRefresh }: { onRefresh: () => void }) {
  const vault = loadVault();
  const [selected, setSelected] = useState<ProviderId>(vault.activeProvider);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(vault.models[vault.activeProvider] || '');
  const [savedMsg, setSavedMsg] = useState('');

  function selectProvider(id: ProviderId) {
    setSelected(id);
    setModel(vault.models[id] || LABELS[id].defaultModel);
    const updated = { ...vault, activeProvider: id };
    saveVault(updated);
    onRefresh();
  }

  function handleSave() {
    const current = loadVault();
    const updated = {
      ...current,
      activeProvider: selected,
      models: { ...current.models, [selected]: model.trim() || LABELS[selected].defaultModel },
      keys: apiKey.trim() ? { ...current.keys, [selected]: apiKey.trim() } : current.keys,
    };
    saveVault(updated);
    setApiKey('');
    setSavedMsg(`تم تفعيل ${LABELS[selected].name} بنجاح!`);
    setTimeout(() => setSavedMsg(''), 2500);
    onRefresh();
  }

  return (
    <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase text-[var(--accent-brown)]">
          <KeyRound size={14} /> خزنة المزودين (Provider Vault)
        </div>
        <span className="text-[11px] text-[var(--accent-brown-soft)]">محفوظ في متصفحك محلياً</span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {(['gemini', 'claude', 'openai'] as ProviderId[]).map((id) => {
          const isActive = vault.activeProvider === id;
          const isConfigured = Boolean(vault.keys[id]);
          return (
            <button
              key={id}
              onClick={() => selectProvider(id)}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                selected === id
                  ? 'border-[var(--ink-black)] bg-[var(--ink-black)] text-[var(--bg-matte)]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-matte)] text-[var(--ink-black)]'
              }`}
            >
              <span>{LABELS[id].name.split(' ')[1]}</span>
              {isConfigured && <Check size={13} className={isActive ? 'text-emerald-400' : 'opacity-60'} />}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="اسم الموديل (Model ID)"
          className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 font-mono text-xs outline-none"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`أدخل مفتاح ${LABELS[selected].name} (${LABELS[selected].placeholder})`}
            className="flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 text-xs outline-none"
          />
          <button
            onClick={handleSave}
            className="rounded-xl bg-[var(--accent-brown)] px-4 py-2 text-xs font-semibold text-white"
          >
            حفظ وتفعيل
          </button>
        </div>
        {savedMsg && <p className="text-xs text-emerald-700">{savedMsg}</p>}
      </div>
    </section>
  );
}
