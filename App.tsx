import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Share2,
  Users,
  UserCheck,
  Sparkles,
  Instagram,
  Facebook,
  Youtube,
  Mail,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import {
  INITIAL_STATE,
  loadStudioState,
  runStudioAI,
  saveStudioState,
  StudioState,
} from './lib/studioStore';
import {
  GhazalEmblem,
  GlassCardMotion,
  KineticBadge,
} from './components/MotionPrimitives';
import { AccountAuthView } from './components/AccountAuthModal';
import { SocialHubView } from './components/SocialHubView';
import { TeamWorkspaceView } from './components/TeamWorkspaceView';

type StudioTab = 'studio' | 'social' | 'team' | 'accounts';

export default function App() {
  const [tab, setTab] = useState<StudioTab>('studio');
  const [state, setState] = useState<StudioState>(() => loadStudioState());
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickOutput, setQuickOutput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/state')
      .then((r) => (r.ok ? r.json() : null))
      .then((remote) => {
        if (remote && remote.aiAccounts) setState({ ...INITIAL_STATE, ...remote });
      })
      .catch(() => {});
  }, []);

  function updateState(next: StudioState) {
    setState(next);
    saveStudioState(next);
  }

  async function handleQuickCommand() {
    if (!quickPrompt.trim() || busy) return;
    setBusy(true);
    try {
      const res = await runStudioAI(
        state,
        'You are GHAZAL AI Studio Orchestrator. Reply in polished Arabic.',
        quickPrompt
      );
      setQuickOutput(res.text);
    } catch (e: any) {
      setQuickOutput(e.message);
    } finally {
      setBusy(false);
    }
  }

  const navItems: { id: StudioTab; label: string; icon: React.ReactNode }[] = [
    { id: 'studio', label: 'الاستوديو', icon: <LayoutGrid size={17} /> },
    { id: 'social', label: 'إدارة المنصات AI', icon: <Share2 size={17} /> },
    { id: 'team', label: 'الفريق والتواصل', icon: <Users size={17} /> },
    { id: 'accounts', label: 'حسابات AI', icon: <UserCheck size={17} /> },
  ];

  const activeAccount = state.aiAccounts[state.activeProvider];

  return (
    <div className="relative min-h-screen pb-24 md:pb-10">
      {/* Ambient Light-Brown Glass Orbs */}
      <div className="ambient-orb fixed -top-24 right-10 h-80 w-80 rounded-full bg-[#b5845e]/25 blur-3xl" />
      <div className="ambient-orb fixed bottom-10 left-10 h-96 w-96 rounded-full bg-[#8c6244]/20 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-6 md:px-8">
        {/* Top Studio Glass Header */}
        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel mb-7 flex flex-wrap items-center justify-between gap-4 rounded-3xl px-6 py-4"
        >
          <div className="flex items-center gap-3.5">
            <GhazalEmblem size={46} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-[0.14em] text-[#261b14]">
                  GHAZAL <span className="font-light text-[#8c6244]">STUDIO</span>
                </h1>
                <KineticBadge>v3.0 Glass</KineticBadge>
              </div>
              <p className="text-xs text-[#6e5442]">
                مساحة عمل ذكية لإدارة المشاريع، الفرق، والمنصات الاجتماعية
              </p>
            </div>
          </div>

          {/* Desktop Navigation Pills */}
          <nav className="hidden items-center gap-1.5 rounded-2xl bg-[#8c6244]/10 p-1.5 md:flex">
            {navItems.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                    active ? 'text-[#f7f2eb]' : 'text-[#4e3829] hover:text-[#261b14]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="studioActivePill"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className="absolute inset-0 rounded-xl bg-[#3a271c] shadow-sm"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {item.icon} {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Active AI Account Status Pill */}
          <button
            onClick={() => setTab('accounts')}
            className="flex items-center gap-2 rounded-2xl border border-[#8c6244]/30 bg-white/65 px-3.5 py-2 text-xs font-bold text-[#3a271c] transition hover:bg-white"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            <span className="uppercase">{state.activeProvider}</span>
            <span className="text-[10px] font-normal text-[#6e5442]">
              ({activeAccount.loggedIn ? 'جلسة نشطة' : 'غير متصل'})
            </span>
          </button>
        </motion.header>

        {/* Tab Views with Smooth Transitions */}
        <AnimatePresence mode="wait">
          {tab === 'studio' && (
            <motion.div
              key="studio"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              {/* Studio KPI Strip */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <GlassCardMotion delay={0.02} className="p-5">
                  <span className="text-xs text-[#6e5442]">المزود الذكي النشط</span>
                  <p className="mt-1 text-2xl font-black uppercase text-[#261b14]">{state.activeProvider}</p>
                  <span className="text-[11px] text-emerald-700">يعمل بجلسة الحساب مباشرة</span>
                </GlassCardMotion>

                <GlassCardMotion delay={0.06} className="p-5">
                  <span className="text-xs text-[#6e5442]">القنوات المُدارة AI</span>
                  <p className="mt-1 text-2xl font-black text-[#261b14]">
                    {state.socialChannels.filter((c) => c.connected).length} / 4
                  </p>
                  <span className="text-[11px] text-[#8c6244]">IG • FB • YT • Gmail</span>
                </GlassCardMotion>

                <GlassCardMotion delay={0.1} className="p-5">
                  <span className="text-xs text-[#6e5442]">أعضاء الاستوديو</span>
                  <p className="mt-1 text-2xl font-black text-[#261b14]">{state.members.length}</p>
                  <span className="text-[11px] text-[#8c6244]">مساحة عمل تشاركية</span>
                </GlassCardMotion>

                <GlassCardMotion delay={0.14} className="p-5">
                  <span className="text-xs text-[#6e5442]">المنشورات والردود</span>
                  <p className="mt-1 text-2xl font-black text-[#261b14]">{state.socialQueue.length}</p>
                  <span className="text-[11px] text-[#8c6244]">مجدولة وجاهزة للنشر</span>
                </GlassCardMotion>
              </div>

              {/* Studio AI Command Bar */}
              <GlassCardMotion delay={0.16} className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold text-[#5c3f2b]">
                    <Sparkles size={15} /> موجه استوديو غزال السريع (Gemini / ChatGPT / Claude)
                  </span>
                  <div className="flex gap-1.5">
                    {(['gemini', 'chatgpt', 'claude'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => updateState({ ...state, activeProvider: p })}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase ${
                          state.activeProvider === p
                            ? 'bg-[#3a271c] text-white'
                            : 'bg-white/60 text-[#5c3f2b]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <input
                    value={quickPrompt}
                    onChange={(e) => setQuickPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickCommand()}
                    placeholder="اطلب من غزال كتابة حملة إعلانية، الرد على بريد Gmail، أو تقسيم مهام الفريق..."
                    className="glass-input flex-1 rounded-2xl px-4 py-3 text-xs"
                  />
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleQuickCommand}
                    disabled={busy}
                    className="rounded-2xl bg-[#3a271c] px-6 py-3 text-xs font-bold text-[#f7f2eb] shadow-sm"
                  >
                    {busy ? 'جاري التنفيذ...' : 'تنفيذ الأمر'}
                  </motion.button>
                </div>

                {quickOutput && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 whitespace-pre-wrap rounded-2xl border border-[#8c6244]/25 bg-white/75 p-4 text-xs leading-relaxed text-[#261b14]"
                  >
                    {quickOutput}
                  </motion.div>
                )}
              </GlassCardMotion>

              {/* Quick Overview Cards: Social Channels + Active Workspace Tasks */}
              <div className="grid gap-6 md:grid-cols-2">
                <GlassCardMotion delay={0.2} className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#5c3f2b]">
                      حالة القنوات المتصلة
                    </h3>
                    <button onClick={() => setTab('social')} className="text-xs font-bold text-[#8c6244]">
                      إدارة الكل
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {state.socialChannels.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center justify-between rounded-2xl bg-white/65 px-3.5 py-2.5 text-xs"
                      >
                        <span className="flex items-center gap-2 font-bold">
                          {ch.id === 'instagram' && <Instagram size={14} className="text-pink-700" />}
                          {ch.id === 'facebook' && <Facebook size={14} className="text-blue-700" />}
                          {ch.id === 'youtube' && <Youtube size={14} className="text-red-700" />}
                          {ch.id === 'gmail' && <Mail size={14} className="text-amber-800" />}
                          {ch.name}
                        </span>
                        <CheckCircle2
                          size={14}
                          className={ch.connected ? 'text-emerald-700' : 'opacity-30'}
                        />
                      </div>
                    ))}
                  </div>
                </GlassCardMotion>

                <GlassCardMotion delay={0.24} className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#5c3f2b]">
                      مهام الاستوديو الجارية
                    </h3>
                    <button
                      onClick={() =>
                        updateState({
                          ...state,
                          studioNotes: [
                            ...state.studioNotes,
                            {
                              id: `n_${Date.now()}`,
                              title: 'مهمة إبداعية جديدة للفريق',
                              tag: 'Studio',
                              status: 'active',
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#8c6244]"
                    >
                      <Plus size={13} /> إضافة
                    </button>
                  </div>
                  <div className="space-y-2">
                    {state.studioNotes.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-center justify-between rounded-2xl bg-white/65 px-3.5 py-2.5 text-xs"
                      >
                        <span className="font-semibold">{n.title}</span>
                        <span className="rounded-full bg-[#8c6244]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#5c3f2b]">
                          {n.tag}
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassCardMotion>
              </div>
            </motion.div>
          )}

          {tab === 'social' && (
            <motion.div
              key="social"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <SocialHubView state={state} onUpdate={updateState} />
            </motion.div>
          )}

          {tab === 'team' && (
            <motion.div
              key="team"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <TeamWorkspaceView state={state} onUpdate={updateState} />
            </motion.div>
          )}

          {tab === 'accounts' && (
            <motion.div
              key="accounts"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <AccountAuthView state={state} onUpdate={updateState} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Bottom Glass Navigation */}
      <nav className="glass-panel fixed inset-x-3 bottom-3 z-50 flex items-center justify-around rounded-2xl py-2 md:hidden">
        {navItems.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1 text-[10px] font-bold ${
                active ? 'text-[#3a271c]' : 'text-[#6e5442]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
