import { useState } from 'react';
import { Send, Trash2, Bot } from 'lucide-react';
import { apiFetch } from '../lib/api';

const QUICK_PROMPTS = [
  'لخّص بنية المشروع وأهم نقاط الضعف الأمنية',
  'Suggest the top 3 performance optimizations for this codebase',
  'Generate a clean CHANGELOG for the latest changes',
];

export function ChatView({ history, onRefresh }: { history: any[]; onRefresh: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);

  async function sendPrompt(text = prompt) {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ prompt: text, includeProjectContext: true }),
      });
      setPrompt('');
      onRefresh();
    } finally {
      setSending(false);
    }
  }

  async function clearChat() {
    await apiFetch('/api/chat/history', { method: 'DELETE' });
    onRefresh();
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)]">
      <div className="flex items-center justify-between border-b border-[var(--border-hairline)] px-5 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-brown)]">
          <Bot size={14} /> Context-Aware Codebase Chat
        </div>
        <button onClick={clearChat} className="text-xs opacity-60 hover:opacity-100">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {history.length === 0 && (
          <div className="space-y-2 pt-6 text-center">
            <p className="text-xs text-[var(--accent-brown-soft)]">Ask anything about your attached repository:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendPrompt(q)}
                  className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3 py-1.5 text-xs hover:border-[var(--accent-brown)]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'ms-auto bg-[var(--ink-black)] text-[var(--bg-matte)]'
                : 'bg-[var(--bg-subtle)] text-[var(--ink-black)]'
            }`}
          >
            {m.content}
            {m.provider && (
              <div className="mt-1.5 font-mono text-[9px] opacity-60">
                {m.provider} • {m.latencyMs}ms
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t border-[var(--border-hairline)] p-3">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendPrompt()}
          placeholder="Ask GHAZAL about code, bugs, architecture..."
          className="flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2.5 text-xs outline-none"
        />
        <button
          onClick={() => sendPrompt()}
          disabled={sending}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-brown)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
