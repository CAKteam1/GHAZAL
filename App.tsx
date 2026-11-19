import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BarChart3,
  CalendarClock,
  KanbanSquare,
  MessageSquareCode,
  Settings,
  ShieldCheck,
  Activity,
  Github,
  FolderUp,
  Moon,
  Sun,
  Languages,
  SendToBack,
  Sparkles,
  Send,
  Trash2,
  Plus,
  Play,
  Pause,
} from 'lucide-react';
import { GhazalLogo } from './components/GhazalLogo';
import { ProviderVault } from './components/ProviderVault';
import { callDirectLLM, loadVault } from './lib/directLLM';
import { ProjectSnapshot, scanGitHubRepo, scanLocalFileList } from './lib/projectSource';
import {
  ALL_AGENTS,
  AuditFinding,
  loadDB,
  runStandaloneAudit,
  saveDB,
} from './lib/standaloneStore';

type TabId = 'overview' | 'analytics' | 'schedules' | 'tasks' | 'chat' | 'settings';

export default function App() {
  const [tab, setTab] = useState<TabId>('overview');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [dark, setDark] = useState(false);

  const [repoUrl, setRepoUrl] = useState('https://github.com/facebook/react');
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorBanner, setErrorBanner] = useState('');

  const [db, setDb] = useState(() => loadDB());
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [schedName, setSchedName] = useState('فحص تلقائي كل ساعة');
  const [schedMins, setSchedMins] = useState(60);

  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const refreshDB = () => setDb(loadDB());
  const addLog = (msg: string) =>
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 35));

  // Browser-based Autonomous Scheduler while tab is open
  useEffect(() => {
    const timer = setInterval(() => {
      if (!snapshot || isAuditing) return;
      const current = loadDB();
      const now = Date.now();
      for (const rule of current.schedules) {
        if (!rule.enabled) continue;
        const last = rule.lastRunAt ? new Date(rule.lastRunAt).getTime() : 0;
        if (now - last >= rule.intervalMinutes * 60 * 1000) {
          rule.lastRunAt = new Date().toISOString();
          saveDB(current);
          refreshDB();
          addLog(`تشغيل المهمة المجدولة: ${rule.name}`);
          runStandaloneAudit(snapshot, ['SECURITY_SENTINEL', 'CODE_HEALTH', 'TASK_DELEGATOR'], addLog)
            .then(() => refreshDB())
            .catch((e) => setErrorBanner(e.message));
          break;
        }
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [snapshot, isAuditing]);

  async function handleGitHubAudit() {
    setErrorBanner('');
    setIsAuditing(true);
    try {
      addLog(`جاري جلب ملفات المستودع من GitHub: ${repoUrl}`);
      const snap = await scanGitHubRepo(repoUrl);
      setSnapshot(snap);
      addLog(`تم فهرسة ${snap.fileCount} ملفاً (${snap.samples.length} عينة كود)`);
      await runStandaloneAudit(snap, ['SECURITY_SENTINEL', 'CODE_HEALTH', 'TASK_DELEGATOR'], addLog);
      refreshDB();
    } catch (err: any) {
      setErrorBanner(err.message);
      addLog(`خطأ: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  }

  async function handleFolderPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorBanner('');
    setIsAuditing(true);
    try {
      addLog('جاري قراءة مجلد المشروع من جهازك...');
      const snap = await scanLocalFileList(files);
      setSnapshot(snap);
      addLog(`تم تحميل ${snap.fileCount} ملفاً من ${snap.sourceLabel}`);
      await runStandaloneAudit(snap, ['SECURITY_SENTINEL', 'CODE_HEALTH', 'TASK_DELEGATOR'], addLog);
      refreshDB();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setIsAuditing(false);
      e.target.value = '';
    }
  }

  function promoteFinding(f: AuditFinding) {
    const current = loadDB();
    current.tasks.unshift({
      id: `task_${Date.now()}`,
      title: f.title,
      description: f.recommendation,
      file: f.file,
      severity: f.severity,
      status: 'todo',
      createdAt: new Date().toISOString(),
    });
    saveDB(current);
    refreshDB();
    setTab('tasks');
  }

  async function sendChat(text = chatInput) {
    if (!text.trim() || chatBusy) return;
    setChatBusy(true);
    setErrorBanner('');
    try {
      const current = loadDB();
      current.chat.push({
        id: `u_${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      });
      saveDB(current);
      refreshDB();
      setChatInput('');

      const ctx = snapshot
        ? `\n[Project: ${snapshot.sourceLabel}, files=${snapshot.fileCount}, sample tree=${snapshot.tree.slice(0, 35).join(', ')}]`
        : '';

      const res = await callDirectLLM({
        systemPrompt:
          'You are GHAZAL AI Agent. Answer clearly in Arabic or English matching the user prompt.',
        userPrompt: `${text}${ctx}`,
      });

      const after = loadDB();
      after.chat.push({
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: res.text,
        provider: `${res.provider}:${res.model}`,
        latencyMs: res.latencyMs,
        timestamp: new Date().toISOString(),
      });
      saveDB(after);
      refreshDB();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setChatBusy(false);
    }
  }

  async function suggestFixForTask(taskId: string) {
    const current = loadDB();
    const task = current.tasks.find((t) => t.id === taskId);
    if (!task) return;
    setFixingId(taskId);
    try {
      const res = await callDirectLLM({
        systemPrompt: 'Provide a concise code fix and verification steps.',
        userPrompt: `Task: ${task.title}\nFile: ${task.file || 'N/A'}\nDetails: ${task.description}`,
      });
      task.aiFixSuggestion = res.text;
      saveDB(current);
      refreshDB();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setFixingId(null);
    }
  }

  const vault = loadVault();
  const hasAnyKey = Boolean(vault.keys.gemini || vault.keys.claude || vault.keys.openai);
  const latestRun = db.history[0];

  const navItems: { id: TabId; label: string; icon: any }[] = [
    { id: 'overview', label: lang === 'ar' ? 'الرئيسية' : 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: lang === 'ar' ? 'الإحصائيات' : 'Analytics', icon: BarChart3 },
    { id: 'schedules', label: lang === 'ar' ? 'المجدول' : 'Schedules', icon: CalendarClock },
    { id: 'tasks', label: lang === 'ar' ? 'المهام' : 'Tasks', icon: KanbanSquare },
    { id: 'chat', label: lang === 'ar' ? 'المحادثة' : 'Chat', icon: MessageSquareCode },
    { id: 'settings', label: lang === 'ar' ? 'المفاتيح' : 'API Keys', icon: Settings },
  ];

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`min-h-screen ${dark ? 'theme-espresso' : ''} bg-[var(--bg-matte)] text-[var(--ink-black)]`}
    >
      <div className="mx-auto flex max-w-6xl flex-col md:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden w-60 shrink-0 border-e border-[var(--border-hairline)] p-6 md:flex md:flex-col md:justify-between">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <GhazalLogo size={40} />
              <div>
                <h1 className="text-lg font-bold tracking-[0.16em]">GHAZAL</h1>
                <p className="text-[10px] uppercase tracking-wider text-[var(--accent-brown-soft)]">Web Standalone</p>
              </div>
            </div>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
                      tab === item.id
                        ? 'bg-[var(--ink-black)] text-[var(--bg-matte)]'
                        : 'hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex gap-2 border-t border-[var(--border-hairline)] pt-4">
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-[var(--border-hairline)] py-2 text-xs"
            >
              <Languages size={14} /> {lang === 'ar' ? 'EN' : 'عربي'}
            </button>
            <button
              onClick={() => setDark(!dark)}
              className="rounded-xl border border-[var(--border-hairline)] px-3 py-2"
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8">
          <header className="mb-5 flex items-center justify-between border-b border-[var(--border-hairline)] pb-4">
            <div className="flex items-center gap-3">
              <div className="md:hidden">
                <GhazalLogo size={36} animated={false} />
              </div>
              <div>
                <h2 className="text-lg font-bold md:text-2xl">
                  {navItems.find((n) => n.id === tab)?.label}
                </h2>
                <p className="text-[11px] text-[var(--accent-brown-soft)]">
                  يعمل مباشرة من المتصفح بدون أي سيرفر
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                className="rounded-full border border-[var(--border-hairline)] p-2"
              >
                <Languages size={14} />
              </button>
              <button
                onClick={() => setDark(!dark)}
                className="rounded-full border border-[var(--border-hairline)] p-2"
              >
                {dark ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          </header>

          {!hasAnyKey && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/50 bg-amber-500/10 px-4 py-3 text-xs">
              <span>لم تضف مفتاح AI بعد — أضف مفتاح Gemini أو Claude أو OpenAI للبدء فوراً.</span>
              <button
                onClick={() => setTab('settings')}
                className="rounded-lg bg-[var(--ink-black)] px-3 py-1.5 text-[11px] font-semibold text-[var(--bg-matte)]"
              >
                إضافة مفتاح API
              </button>
            </div>
          )}

          {errorBanner && (
            <div className="mb-5 rounded-2xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-xs text-red-700">
              {errorBanner}
            </div>
          )}

          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Dual Source Selector: GitHub URL OR Pick Local Folder from Phone */}
              <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-brown)]">
                  اختر مصدر المشروع للفحص الفوري
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3">
                    <Github size={15} className="shrink-0 opacity-60" />
                    <input
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="رابط مستودع GitHub (مثال: user/repo)"
                      className="w-full bg-transparent py-2.5 font-mono text-xs outline-none"
                    />
                  </div>
                  <button
                    onClick={handleGitHubAudit}
                    disabled={isAuditing}
                    className="rounded-xl bg-[var(--ink-black)] px-4 py-2.5 text-xs font-semibold text-[var(--bg-matte)] disabled:opacity-50"
                  >
                    {isAuditing ? 'جاري الفحص...' : 'فحص رابط GitHub'}
                  </button>
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    disabled={isAuditing}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-4 py-2.5 text-xs font-semibold"
                  >
                    <FolderUp size={15} /> رفع مجلد من جهازك
                  </button>
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    {...({ webkitdirectory: '', directory: '' } as any)}
                    onChange={handleFolderPicked}
                    className="hidden"
                  />
                </div>
              </section>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-4">
                  <p className="text-[11px] text-[var(--accent-brown-soft)]">صحة المشروع</p>
                  <p className="mt-1 text-2xl font-bold">
                    {latestRun ? `${latestRun.healthScore}/100` : '—'}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-4">
                  <p className="text-[11px] text-[var(--accent-brown-soft)]">المزود النشط</p>
                  <p className="mt-1 text-lg font-bold uppercase">{vault.activeProvider}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-4">
                  <p className="text-[11px] text-[var(--accent-brown-soft)]">المهام المفتوحة</p>
                  <p className="mt-1 text-2xl font-bold">
                    {db.tasks.filter((t) => t.status !== 'done').length}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-4">
                  <p className="text-[11px] text-[var(--accent-brown-soft)]">الفحوصات المنجزة</p>
                  <p className="mt-1 text-2xl font-bold">{db.history.length}</p>
                </div>
              </div>

              {/* Findings + Live Log */}
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-3 lg:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-brown)]">
                    <ShieldCheck size={14} /> نتائج التدقيق ({latestRun?.findings.length || 0})
                  </div>
                  <AnimatePresence>
                    {(latestRun?.findings || []).map((f) => (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-4"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-[var(--accent-brown-soft)]">
                            {f.agent}
                          </span>
                          <span className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-[10px] font-semibold uppercase">
                            {f.severity}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold">{f.title}</h3>
                        {f.file && (
                          <p className="mt-0.5 font-mono text-[11px] text-[var(--accent-brown)]">{f.file}</p>
                        )}
                        <p className="mt-1.5 text-xs text-[var(--accent-brown-soft)]">{f.recommendation}</p>
                        <button
                          onClick={() => promoteFinding(f)}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] px-2.5 py-1 text-[11px]"
                        >
                          <SendToBack size={12} /> تحويل إلى مهمة
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <aside className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-brown)]">
                    <Activity size={14} /> سجل العمليات المباشر
                  </div>
                  <div className="max-h-80 space-y-2 overflow-y-auto font-mono text-[11px] text-[var(--accent-brown-soft)]">
                    {logs.length === 0 && <p className="opacity-60">في انتظار بدء الفحص...</p>}
                    {logs.map((l, i) => (
                      <div key={i} className="border-s-2 border-[var(--accent-brown)] ps-2">
                        {l}
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            </div>
          )}

          {tab === 'analytics' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5">
                <h3 className="mb-4 text-xs font-semibold uppercase text-[var(--accent-brown)]">
                  تطور نقاط صحة الكود (Health Trend)
                </h3>
                {db.history.length === 0 ? (
                  <p className="text-xs text-[var(--accent-brown-soft)]">أجرِ فحصاً لعرض الإحصائيات.</p>
                ) : (
                  <div className="flex h-40 items-end gap-2">
                    {db.history
                      .slice(0, 12)
                      .reverse()
                      .map((r) => (
                        <div key={r.runId} className="flex flex-1 flex-col items-center gap-1">
                          <span className="text-[10px] font-bold">{r.healthScore}</span>
                          <div
                            className="w-full max-w-[32px] rounded-t-lg bg-[var(--accent-brown)]"
                            style={{ height: `${Math.max(10, r.healthScore)}%` }}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase text-[var(--accent-brown)]">
                  إحصائيات الاستجابة والاستهلاك
                </h3>
                <p className="text-xs">إجمالي طلبات الذكاء الاصطناعي: {db.metrics.length}</p>
                <p className="mt-1 text-xs">
                  متوسط سرعة الاستجابة:{' '}
                  {db.metrics.length
                    ? Math.round(db.metrics.reduce((a, b) => a + b.latencyMs, 0) / db.metrics.length)
                    : 0}{' '}
                  ms
                </p>
              </div>
            </div>
          )}

          {tab === 'schedules' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5 sm:flex-row">
                <input
                  value={schedName}
                  onChange={(e) => setSchedName(e.target.value)}
                  className="flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 text-xs"
                  placeholder="اسم المهمة المجدولة"
                />
                <select
                  value={schedMins}
                  onChange={(e) => setSchedMins(Number(e.target.value))}
                  className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 text-xs"
                >
                  <option value={15}>كل 15 دقيقة</option>
                  <option value={60}>كل ساعة</option>
                  <option value={360}>كل 6 ساعات</option>
                </select>
                <button
                  onClick={() => {
                    const current = loadDB();
                    current.schedules.unshift({
                      id: `sch_${Date.now()}`,
                      name: schedName,
                      intervalMinutes: schedMins,
                      enabled: true,
                    });
                    saveDB(current);
                    refreshDB();
                  }}
                  className="flex items-center justify-center gap-1 rounded-xl bg-[var(--accent-brown)] px-4 py-2 text-xs font-semibold text-white"
                >
                  <Plus size={14} /> إضافة جدول
                </button>
              </div>

              {db.schedules.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-4"
                >
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-xs text-[var(--accent-brown-soft)]">كل {s.intervalMinutes} دقيقة</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const current = loadDB();
                        const item = current.schedules.find((x) => x.id === s.id);
                        if (item) item.enabled = !item.enabled;
                        saveDB(current);
                        refreshDB();
                      }}
                      className="rounded-lg bg-[var(--bg-subtle)] p-2"
                    >
                      {s.enabled ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      onClick={() => {
                        const current = loadDB();
                        current.schedules = current.schedules.filter((x) => x.id !== s.id);
                        saveDB(current);
                        refreshDB();
                      }}
                      className="rounded-lg bg-[var(--bg-subtle)] p-2 text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="أضف مهمة برمجية جديدة..."
                  className="flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] px-4 py-2.5 text-xs"
                />
                <button
                  onClick={() => {
                    if (!newTaskTitle.trim()) return;
                    const current = loadDB();
                    current.tasks.unshift({
                      id: `t_${Date.now()}`,
                      title: newTaskTitle,
                      description: '',
                      severity: 'medium',
                      status: 'todo',
                      createdAt: new Date().toISOString(),
                    });
                    saveDB(current);
                    setNewTaskTitle('');
                    refreshDB();
                  }}
                  className="rounded-xl bg-[var(--ink-black)] px-4 py-2 text-xs font-semibold text-[var(--bg-matte)]"
                >
                  إضافة
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {(['todo', 'in_progress', 'done'] as const).map((st) => (
                  <div key={st} className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-4">
                    <p className="mb-3 text-xs font-bold uppercase text-[var(--accent-brown)]">
                      {st === 'todo' ? 'قيد الانتظار' : st === 'in_progress' ? 'قيد التنفيذ' : 'مكتمل'}
                    </p>
                    <div className="space-y-2.5">
                      {db.tasks
                        .filter((t) => t.status === st)
                        .map((t) => (
                          <div key={t.id} className="rounded-xl bg-[var(--bg-card)] p-3 text-xs">
                            <p className="font-semibold">{t.title}</p>
                            {t.description && (
                              <p className="mt-1 text-[11px] text-[var(--accent-brown-soft)]">{t.description}</p>
                            )}
                            {t.aiFixSuggestion && (
                              <pre className="mt-2 max-h-36 overflow-auto rounded-lg bg-[var(--bg-matte)] p-2 font-mono text-[10px] whitespace-pre-wrap">
                                {t.aiFixSuggestion}
                              </pre>
                            )}
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              <button
                                onClick={() => suggestFixForTask(t.id)}
                                disabled={fixingId === t.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-brown)] px-2.5 py-1 text-[10px] text-white"
                              >
                                <Sparkles size={11} /> {fixingId === t.id ? 'جاري الحل...' : 'اقتراح حل'}
                              </button>
                              {st !== 'done' && (
                                <button
                                  onClick={() => {
                                    const current = loadDB();
                                    const item = current.tasks.find((x) => x.id === t.id);
                                    if (item) item.status = st === 'todo' ? 'in_progress' : 'done';
                                    saveDB(current);
                                    refreshDB();
                                  }}
                                  className="rounded-lg border border-[var(--border-hairline)] px-2.5 py-1 text-[10px]"
                                >
                                  نقل للمرحلة التالية
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'chat' && (
            <div className="flex h-[68vh] flex-col rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)]">
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {db.chat.length === 0 && (
                  <p className="pt-10 text-center text-xs text-[var(--accent-brown-soft)]">
                    اسأل غزال عن أي شيء في مشروعك أو اطلب منه كتابة كود جديد...
                  </p>
                )}
                {db.chat.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'ms-auto bg-[var(--ink-black)] text-[var(--bg-matte)]'
                        : 'bg-[var(--bg-subtle)]'
                    }`}
                  >
                    {m.content}
                    {m.provider && (
                      <div className="mt-1 font-mono text-[9px] opacity-60">
                        {m.provider} • {m.latencyMs}ms
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t border-[var(--border-hairline)] p-3">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                  placeholder="اكتب سؤالك هنا..."
                  className="flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 text-xs outline-none"
                />
                <button
                  onClick={() => sendChat()}
                  disabled={chatBusy}
                  className="rounded-xl bg-[var(--accent-brown)] px-4 py-2 text-white"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}

          {tab === 'settings' && <ProviderVault onRefresh={refreshDB} />}
        </main>
      </div>

      {/* Bottom Mobile Navigation */}
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
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
