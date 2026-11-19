import { useState } from 'react';
import { KeyRound, Check } from 'lucide-react';

type ProviderId = 'gemini' | 'claude' | 'openai';

interface Props {
  status: {
    activeProvider: ProviderId;
    models: Record<ProviderId, string>;
    configured: Record<ProviderId, boolean>;
  };
  onRefresh: () => void;
}

const LABELS: Record<ProviderId, { name: string; placeholder: string }> = {
  gemini: { name: 'Google Gemini', placeholder: 'AIza...' },
  claude: { name: 'Anthropic Claude', placeholder: 'sk-ant-...' },
  openai: { name: 'OpenAI ChatGPT', placeholder: 'sk-proj-...' },
};

export function ProviderVault({ status, onRefresh }: Props) {
  const [selected, setSelected] = useState<ProviderId>(status.activeProvider);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveKey() {
    if (!apiKey.trim()) return;
    setSaving(true);
    await fetch('http://localhost:4747/api/providers/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: selected, apiKey }),
    });
    await fetch('http://localhost:4747/api/providers/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: selected }),
    });
    setApiKey('');
    setSaving(false);
    onRefresh();
  }

  return (
    <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-[var(--accent-brown)]">
          <KeyRound size={14} /> Provider Vault
        </div>
        <span className="text-xs text-[var(--accent-brown-soft)]">AES-256 Local Storage</span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {(['gemini', 'claude', 'openai'] as ProviderId[]).map((id) => {
          const isActive = status.activeProvider === id;
          return (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition ${
                selected === id
                  ? 'border-[var(--ink-black)] bg-[var(--ink-black)] text-white'
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

      <div className="flex gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={`Enter ${LABELS[selected].name} API Key (${LABELS[selected].placeholder})`}
          className="flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 text-sm outline-none focus:border-[var(--accent-brown)]"
        />
        <button
          onClick={saveKey}
          disabled={saving}
          className="rounded-xl bg-[var(--accent-brown)] px-4 py-2 text-xs font-semibold tracking-wider uppercase text-white transition hover:bg-[var(--ink-black)] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Activate'}
        </button>
      </div>
    </section>
  );
}
