import { useState } from 'react';
import { CalendarClock, Play, Pause, Trash2, Plus } from 'lucide-react';
import { apiFetch } from '../lib/api';

const PRESETS = [
  { label: 'Every 15 min', cron: '*/15 * * * *' },
  { label: 'Hourly', cron: '0 * * * *' },
  { label: 'Every 6 hours', cron: '0 */6 * * *' },
  { label: 'Daily 02:00', cron: '0 2 * * *' },
  { label: 'Weekly Sun', cron: '0 3 * * 0' },
];

const AGENT_LIST = [
  'SECURITY_SENTINEL',
  'CODE_HEALTH',
  'TASK_DELEGATOR',
  'PERFORMANCE_PRO',
  'DOCS_ARCHITECT',
];

export function SchedulesView({
  schedules,
  activeProject,
  onRefresh,
}: {
  schedules: any[];
  activeProject: string;
  onRefresh: () => void;
}) {
  const [name, setName] = useState('Hourly Deep Oversight');
  const [cronExpression, setCronExpression] = useState('0 * * * *');
  const [mode, setMode] = useState<'full' | 'diff'>('full');
  const [agents, setAgents] = useState<string[]>(['SECURITY_SENTINEL', 'CODE_HEALTH', 'TASK_DELEGATOR']);
  const [busy, setBusy] = useState(false);

  function toggleAgent(a: string) {
    setAgents((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  async function createJob() {
    if (!name.trim() || agents.length === 0) return;
    setBusy(true);
    try {
      await apiFetch('/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          name,
          projectPath: activeProject,
          cronExpression,
          mode,
          agents,
          enabled: true,
        }),
      });
      onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleJob(id: string, enabled: boolean) {
    await apiFetch(`/api/schedules/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) });
    onRefresh();
  }

  async function runNow(id: string) {
    await apiFetch(`/api/schedules/${id}/run`, { method: 'POST' });
    onRefresh();
  }

  async function removeJob(id: string) {
    await apiFetch(`/api/schedules/${id}`, { method: 'DELETE' });
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-[var(--accent-brown)]">
          <CalendarClock size={14} /> New Scheduled Oversight Job
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Job Name"
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 text-xs outline-none"
          />
          <input
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            placeholder="Cron (e.g. 0 * * * *)"
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 font-mono text-xs outline-none"
          />
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'full' | 'diff')}
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 text-xs outline-none"
          >
            <option value="full">Full Codebase Audit</option>
            <option value="diff">Fast Git Diff Audit</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.cron}
              onClick={() => setCronExpression(p.cron)}
              className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3 py-1 text-[11px] hover:border-[var(--accent-brown)]"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {AGENT_LIST.map((a) => (
            <button
              key={a}
              onClick={() => toggleAgent(a)}
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-mono ${
                agents.includes(a)
                  ? 'border-[var(--ink-black)] bg-[var(--ink-black)] text-[var(--bg-matte)]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-matte)]'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <button
          onClick={createJob}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent-brown)] px-4 py-2 text-xs font-semibold uppercase text-white"
        >
          <Plus size={14} /> Add Schedule
        </button>
      </section>

      <div className="space-y-3">
        {schedules.map((job) => (
          <div
            key={job.id}
            className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-4 sm:flex-row sm:items-center"
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{job.name}</h3>
                <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10px]">
                  {job.cronExpression}
                </span>
                <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] uppercase">
                  {job.mode}
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-[var(--accent-brown-soft)]">
                Runs: {job.runCount} • Last Score: {job.lastHealthScore ?? '—'} • {job.agents.join(', ')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => runNow(job.id)}
                className="rounded-lg border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-medium hover:border-[var(--ink-black)]"
              >
                Run
              </button>
              <button
                onClick={() => toggleJob(job.id, !job.enabled)}
                className="rounded-lg bg-[var(--bg-subtle)] p-2"
                title={job.enabled ? 'Pause' : 'Resume'}
              >
                {job.enabled ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button
                onClick={() => removeJob(job.id)}
                className="rounded-lg bg-[var(--bg-subtle)] p-2 text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
