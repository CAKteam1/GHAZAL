import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BarChart3,
  CalendarClock,
  KanbanSquare,
  MessageSquareCode,
  Settings,
  Play,
  Pause,
  ShieldCheck,
  Activity,
  GitBranch,
  Moon,
  Sun,
  Languages,
  SendToBack,
} from 'lucide-react';
import { GhazalLogo } from './components/GhazalLogo';
import { AnalyticsView } from './components/AnalyticsView';
import { SchedulesView } from './components/SchedulesView';
import { TasksView } from './components/TasksView';
import { ChatView } from './components/ChatView';
import { SettingsView } from './components/SettingsView';
import { apiFetch, getApiBase } from './lib/api';
import { DICT, Lang } from './lib/i18n';

type TabId = 'overview' | 'analytics' | 'schedules' | 'tasks' | 'chat' | 'settings';

export default function App() {
  const [tab, setTab] = useState<TabId>('overview');
  const [lang, setLang] = useState<Lang>('ar');
  const [dark, setDark] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const [providers, setProviders] = useState<any>(null);
  const [oversight, setOversight] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [gitInfo, setGitInfo] = useState<any>(null);
  const [mobileInfo, setMobileInfo] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [logs, setLogs] = useState<{ message: string; level: string }[]>([]);

  const t = DICT[lang];

  async function refresh() {
    try {
      const [p, o, proj, an, sch, tsk, ch, git, mob, al] = await Promise.all([
        apiFetch('/api/providers'),
        apiFetch('/api/oversight/state'),
        apiFetch('/api/projects'),
        apiFetch('/api/analytics'),
        apiFetch('/api/schedules'),
        apiFetch('/api/tasks'),
        apiFetch('/api/chat/history'),
        apiFetch('/api/git'),
        apiFetch('/api/mobile/connect'),
        apiFetch('/api/alerts'),
      ]);
      setProviders(p);
      setOversight(o);
      setProjects(proj);
      setAnalytics(an);
      setSchedules(sch);
      setTasks(tsk);
      setChatHistory(ch);
      setGitInfo(git);
      setMobileInfo(mob);
      setAlerts(al);
    } catch (err: any) {
      setLogs((prev) => [{ message: `Connection: ${err.message}`, level: 'error' }, ...prev]);
    }
  }

  useEffect(() => {
    refresh();
    const es = new EventSource(`${getApiBase()}/api/stream`);
    es.addEventListener('log', (e) => {
      setLogs((prev) => [JSON.parse(e.data), ...prev].slice(0, 40));
    });
    es.addEventListener('auditComplete', () => refresh());
    return () => es.close();
  }, []);

  async function runAudit(mode: 'full' | 'diff') {
    await apiFetch('/api/oversight/run', { method: 'POST', body: JSON.stringify({ mode }) });
    refresh();
  }

  async function toggleHourly() {
    await apiFetch('/api/oversight/toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled: !oversight?.scheduled }),
    });
    refresh();
  }

  async function promoteFinding(finding: any) {
    await apiFetch('/api/tasks/promote', {
      method: 'POST',
      body: JSON.stringify({ finding, projectPath: oversight?.projectPath }),
    });
    refresh();
    setTab('tasks');
  }

  const latestRun = oversight?.history?.[0];
  const filteredFindings = (latestRun?.findings || []).filter(
    (f: any) => severityFilter === 'all' || f.severity === severityFilter
  );

  const navItems: { id: TabId; label: string; icon: any }[] = [
    { id: 'overview', label: t.navOverview, icon: LayoutDashboard },
    { id: 'analytics', label: t.navAnalytics, icon: BarChart3 },
    { id: 'schedules', label: t.navSchedules, icon: CalendarClock },
    { id: 'tasks', label: t.navTasks, icon: KanbanSquare },
    { id: 'chat', label: t.navChat, icon: MessageSquareCode },
    { id: 'settings', label: t.navSettings, icon: Settings },
  ];

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`min-h-screen ${dark ? 'theme-espresso' : ''} bg-[var(--bg-matte)] text-[var(--ink-black)]`}>
      <div className="mx-auto flex max-w-7xl flex-col md:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 border-e border-[var(--border-hairline)] p-6 md:flex md:flex-col md:justify-between">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <GhazalLogo size={42} />
              <div>
                <h1 className="text-lg font-bold tracking-[0.16em]">GHAZAL</h1>
                <p className="text-[10px] uppercase tracking-wider text-[var(--accent-brown-soft)]">v2.0 Command</p>
              </div>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
                      active
                        ? 'bg-[var(--ink-black)] text-[var(--bg-matte)]'
                        : 'text-[var(--ink-black)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-2 border-t border-[var(--border-hairline)] pt-4">
            <div className="flex gap-2">
              <button
                onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-hairline)] py-2 text-xs"
              >
                <Languages size={14} /> {lang === 'ar' ? 'EN' : 'عربي'}
              </button>
              <button
                onClick={() => setDark(!dark)}
                className="flex items-center justify-center rounded-xl border border-[var(--border-hairline)] px-3 py-2"
              >
                {dark ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8">
          {/* Mobile Top Bar */}
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] pb-4">
            <div className="flex items-center gap-3">
              <div className="md:hidden"><GhazalLogo size={36} animated={false} /></div>
              <div>
                <h2 className="text-lg font-bold tracking-wide md:text-2xl">
                  {navItems.find((n) => n.id === tab)?.label}
                </h2>
                <div className="flex items-center gap-2 text-[11px] text-[var(--accent-brown-soft)]">
                  <span>{t.brandSub}</span>
                  {gitInfo?.isGitRepo && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10px]">
                      <GitBranch size={10} /> {gitInfo.branch} ({gitInfo.changedFiles.length})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                className="rounded-full border border-[var(--border-hairline)] p-2 md:hidden"
              >
                <Languages size={14} />
              </button>
              <button
                onClick={() => setDark(!dark)}
                className="rounded-full border border-[var(--border-hairline)] p-2 md:hidden"
              >
                {dark ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <button
                onClick={toggleHourly}
                className="hidden items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-semibold sm:flex"
              >
                {oversight?.scheduled ? <Pause size={13} /> : <Play size={13} />}
                {oversight?.scheduled ? t.hourlyActive : t.armHourly}
              </button>
              <button
                onClick={() => runAudit('diff')}
                disabled={oversight?.isRunning}
                className="hidden rounded-full border border-[var(--border-hairline)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-semibold lg:block"
              >
                {t.runDiffAudit}
              </button>
              <button
                onClick={() => runAudit('full')}
                disabled={oversight?.isRunning}
                className="rounded-full bg-[var(--ink-black)] px-4 py-2 text-xs font-semibold text-[var(--bg-matte)] disabled:opacity-50"
              >
                {oversight?.isRunning ? t.auditing : t.runFullAudit}
              </button>
            </div>
          </header>

          {tab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Strip */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: t.healthScore, val: latestRun ? `${latestRun.healthScore}/100` : '—' },
                  { label: t.activeSchedules, val: analytics?.summary?.activeSchedules ?? 0 },
                  { label: t.openTasks, val: analytics?.summary?.openTasks ?? 0 },
                  { label: t.totalAudits, val: analytics?.summary?.totalAudits ?? 0 },
                ].map((k) => (
                  <div key={k.label} className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-4">
                    <p className="text-[11px] text-[var(--accent-brown-soft)]">{k.label}</p>
                    <p className="mt-1 text-2xl font-bold">{k.val}</p>
                  </div>
                ))}
              </div>

              {/* Findings & Live Stream */}
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-3 lg:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-brown)]">
                      <ShieldCheck size={14} /> {t.findingsTitle}
                    </div>
                    <div className="flex gap-1">
                      {['all', 'critical', 'high', 'medium', 'low'].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSeverityFilter(s)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase ${
                            severityFilter === s
                              ? 'bg-[var(--ink-black)] text-[var(--bg-matte)]'
                              : 'bg-[var(--bg-subtle)]'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredFindings.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[var(--border-hairline)] p-8 text-center text-xs text-[var(--accent-brown-soft)]">
                      {t.noFindings}
                    </div>
                  )}

                  <AnimatePresence>
                    {filteredFindings.map((f: any) => (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-4"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold uppercase text-[var(--accent-brown-soft)]">
                            {f.agent}
                          </span>
                          <span className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-[10px] font-semibold uppercase">
                            {f.severity}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold">{f.title}</h3>
                        {f.file && <p className="mt-0.5 font-mono text-[11px] text-[var(--accent-brown)]">{f.file}</p>}
                        <p className="mt-1.5 text-xs leading-relaxed text-[var(--accent-brown-soft)]">{f.recommendation}</p>
                        <button
                          onClick={() => promoteFinding(f)}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] px-2.5 py-1 text-[11px] font-medium hover:border-[var(--ink-black)]"
                        >
                          <SendToBack size={12} /> {t.sendToBoard}
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <aside className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-brown)]">
                    <Activity size={14} /> {t.liveStream}
                  </div>
                  <div className="max-h-96 space-y-2 overflow-y-auto font-mono text-[11px] text-[var(--accent-brown-soft)]">
                    {logs.length === 0 && <p className="opacity-60">Awaiting telemetry...</p>}
                    {logs.map((l, i) => (
                      <div key={i} className="border-s-2 border-[var(--accent-brown)] ps-2.5">
                        {l.message}
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            </div>
          )}

          {tab === 'analytics' && <AnalyticsView analytics={analytics} />}
          {tab === 'schedules' && (
            <SchedulesView
              schedules={schedules}
              activeProject={oversight?.projectPath || ''}
              onRefresh={refresh}
            />
          )}
          {tab === 'tasks' && <TasksView tasks={tasks} onRefresh={refresh} />}
          {tab === 'chat' && <ChatView history={chatHistory} onRefresh={refresh} />}
          {tab === 'settings' && (
            <SettingsView
              providers={providers}
              oversight={oversight}
              projects={projects}
              mobileInfo={mobileInfo}
              alerts={alerts}
              onRefresh={refresh}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-[var(--border-hairline)] bg-[var(--bg-card)]/95 px-1 pt-2 backdrop-blur md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] ${
                active ? 'font-bold text-[var(--accent-brown)]' : 'text-[var(--accent-brown-soft)]'
              }`}
            >
              <Icon size={18} />
              <span className="truncate max-w-[56px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
