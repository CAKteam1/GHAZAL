import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ShieldCheck, Activity } from 'lucide-react';
import { GhazalLogo } from './components/GhazalLogo';
import { ProviderVault } from './components/ProviderVault';
import { ProjectAttacher } from './components/ProjectAttacher';

const API = 'http://localhost:4747';

export default function App() {
  const [providers, setProviders] = useState<any>(null);
  const [oversight, setOversight] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [logs, setLogs] = useState<{ message: string; level: string }[]>([]);

  async function refresh() {
    const [p, o, proj] = await Promise.all([
      fetch(`${API}/api/providers`).then((r) => r.json()),
      fetch(`${API}/api/oversight/state`).then((r) => r.json()),
      fetch(`${API}/api/projects`).then((r) => r.json()),
    ]);
    setProviders(p);
    setOversight(o);
    setProjects(proj);
  }

  useEffect(() => {
    refresh();
    const es = new EventSource(`${API}/api/stream`);
    es.addEventListener('log', (e) => {
      setLogs((prev) => [JSON.parse(e.data), ...prev].slice(0, 30));
    });
    es.addEventListener('auditComplete', () => refresh());
    return () => es.close();
  }, []);

  async function runAuditNow() {
    await fetch(`${API}/api/oversight/run`, { method: 'POST' });
    refresh();
  }

  async function toggleSchedule() {
    await fetch(`${API}/api/oversight/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !oversight?.scheduled }),
    });
    refresh();
  }

  const latestRun = oversight?.history?.[0];

  return (
    <div className="min-h-screen px-6 py-10 md:px-14">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col justify-between gap-6 border-b border-[var(--border-hairline)] pb-8 md:flex-row md:items-end">
          <div className="flex items-center gap-4">
            <GhazalLogo size={58} />
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-3xl font-bold tracking-[0.18em] text-[var(--ink-black)]"
              >
                GHAZAL <span className="font-light text-[var(--accent-brown)]">AI AGENT</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-[11px] font-medium tracking-[0.3em] uppercase text-[var(--accent-brown-soft)]"
              >
                Intelligent Project Oversight
              </motion.p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleSchedule}
              className="flex items-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-card)] px-4 py-2 text-xs font-semibold tracking-wider uppercase transition hover:border-[var(--ink-black)]"
            >
              {oversight?.scheduled ? <Pause size={13} /> : <Play size={13} />}
              {oversight?.scheduled ? 'Hourly Active' : 'Arm Hourly'}
            </button>
            <button
              onClick={runAuditNow}
              disabled={oversight?.isRunning}
              className="rounded-full bg-[var(--ink-black)] px-5 py-2 text-xs font-semibold tracking-wider uppercase text-white transition hover:bg-[var(--accent-brown)] disabled:opacity-50"
            >
              {oversight?.isRunning ? 'Auditing...' : 'Run Audit Now'}
            </button>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {providers && <ProviderVault status={providers} onRefresh={refresh} />}
          {oversight && (
            <ProjectAttacher
              activePath={oversight.projectPath}
              projects={projects}
              healthScore={latestRun?.healthScore}
              onRefresh={refresh}
            />
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-[var(--accent-brown)]">
              <ShieldCheck size={14} /> Delegated Agent Findings
            </div>
            <AnimatePresence>
              {(latestRun?.findings || []).map((f: any) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[var(--accent-brown-soft)]">
                      {f.agent}
                    </span>
                    <span className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--ink-black)]">
                      {f.severity}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--ink-black)]">{f.title}</h3>
                  {f.file && <p className="mt-0.5 font-mono text-[11px] text-[var(--accent-brown)]">{f.file}</p>}
                  <p className="mt-2 text-xs leading-relaxed text-[var(--accent-brown-soft)]">{f.recommendation}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <aside className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-[var(--accent-brown)]">
              <Activity size={14} /> Live Agent Stream
            </div>
            <div className="space-y-2 font-mono text-[11px] text-[var(--accent-brown-soft)]">
              {logs.length === 0 && <p className="opacity-60">Awaiting agent telemetry...</p>}
              {logs.map((l, i) => (
                <div key={i} className="border-l-2 border-[var(--accent-brown)] pl-2.5">
                  {l.message}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
