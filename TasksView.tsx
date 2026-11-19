import { useState } from 'react';
import { Sparkles, Trash2, Plus, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/api';

const COLUMNS = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
] as const;

export function TasksView({ tasks, onRefresh }: { tasks: any[]; onRefresh: () => void }) {
  const [title, setTitle] = useState('');
  const [loadingFix, setLoadingFix] = useState<string | null>(null);

  async function addTask() {
    if (!title.trim()) return;
    await apiFetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, severity: 'medium', status: 'todo' }),
    });
    setTitle('');
    onRefresh();
  }

  async function moveTask(id: string, status: string) {
    await apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    onRefresh();
  }

  async function removeTask(id: string) {
    await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
    onRefresh();
  }

  async function suggestFix(id: string) {
    setLoadingFix(id);
    try {
      await apiFetch(`/api/tasks/${id}/autofix`, { method: 'POST' });
      onRefresh();
    } finally {
      setLoadingFix(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Add engineering task manually..."
          className="flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] px-4 py-2.5 text-xs outline-none"
        />
        <button
          onClick={addTask}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--ink-black)] px-4 py-2 text-xs font-semibold uppercase text-[var(--bg-matte)]"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-4">
              <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--accent-brown)]">
                <span>{col.label}</span>
                <span>{colTasks.length}</span>
              </div>

              <div className="space-y-3">
                {colTasks.map((t) => (
                  <div key={t.id} className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-3.5">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[9px] font-bold uppercase">
                        {t.severity}
                      </span>
                      <button onClick={() => removeTask(t.id)} className="opacity-50 hover:opacity-100">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <h4 className="text-xs font-semibold">{t.title}</h4>
                    {t.file && <p className="mt-0.5 font-mono text-[10px] text-[var(--accent-brown)]">{t.file}</p>}
                    {t.description && <p className="mt-1.5 text-[11px] text-[var(--accent-brown-soft)]">{t.description}</p>}

                    {t.aiFixSuggestion && (
                      <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-[var(--bg-matte)] p-2 font-mono text-[10px] whitespace-pre-wrap">
                        {t.aiFixSuggestion}
                      </pre>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => suggestFix(t.id)}
                        disabled={loadingFix === t.id}
                        className="flex items-center gap-1 rounded-lg bg-[var(--accent-brown)] px-2.5 py-1 text-[10px] font-semibold text-white"
                      >
                        <Sparkles size={11} /> {loadingFix === t.id ? 'Thinking...' : 'AI Fix'}
                      </button>
                      {col.id !== 'done' && (
                        <button
                          onClick={() => moveTask(t.id, col.id === 'todo' ? 'in_progress' : 'done')}
                          className="flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] px-2.5 py-1 text-[10px]"
                        >
                          Move <ArrowRight size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
