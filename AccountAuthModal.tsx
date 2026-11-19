import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, LogIn, LogOut, ShieldCheck, Sparkles, KeyRound, ExternalLink } from 'lucide-react';
import { AIProvider, StudioState } from '../lib/studioStore';
import { GlassCardMotion } from './MotionPrimitives';

const PROVIDERS: {
  id: AIProvider;
  title: string;
  subtitle: string;
  loginUrl: string;
  badge: string;
}[] = [
  {
    id: 'gemini',
    title: 'Google Gemini',
    subtitle: 'تسجيل الدخول بحساب Google / Gemini مباشرة دون API',
    loginUrl: 'https://gemini.google.com',
    badge: 'Gemini 2.5 Session',
  },
  {
    id: 'chatgpt',
    title: 'OpenAI ChatGPT',
    subtitle: 'تسجيل الدخول بحساب ChatGPT (Plus / Free) مباشرة',
    loginUrl: 'https://chatgpt.com',
    badge: 'ChatGPT Web Session',
  },
  {
    id: 'claude',
    title: 'Anthropic Claude',
    subtitle: 'تسجيل الدخول بحساب Claude Pro / Sonnet مباشرة',
    loginUrl: 'https://claude.ai',
    badge: 'Claude Web Session',
  },
];

export const AccountAuthView: React.FC<{
  state: StudioState;
  onUpdate: (next: StudioState) => void;
}> = ({ state, onUpdate }) => {
  const [emails, setEmails] = useState<Record<AIProvider, string>>({
    gemini: state.aiAccounts.gemini.email || '',
    chatgpt: state.aiAccounts.chatgpt.email || '',
    claude: state.aiAccounts.claude.email || '',
  });
  const [showOptionalKey, setShowOptionalKey] = useState<Record<AIProvider, boolean>>({
    gemini: false,
    chatgpt: false,
    claude: false,
  });
  const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({
    gemini: state.aiAccounts.gemini.apiKey || '',
    chatgpt: state.aiAccounts.chatgpt.apiKey || '',
    claude: state.aiAccounts.claude.apiKey || '',
  });

  function loginWithAccount(id: AIProvider) {
    const email = emails[id].trim() || `member@${id}.session`;
    const next: StudioState = {
      ...state,
      activeProvider: id,
      aiAccounts: {
        ...state.aiAccounts,
        [id]: {
          ...state.aiAccounts[id],
          loggedIn: true,
          email,
          mode: apiKeys[id].trim() ? 'api_key' : 'web_session',
          apiKey: apiKeys[id].trim(),
        },
      },
    };
    onUpdate(next);
  }

  function logoutAccount(id: AIProvider) {
    const next: StudioState = {
      ...state,
      aiAccounts: {
        ...state.aiAccounts,
        [id]: { ...state.aiAccounts[id], loggedIn: false, email: '' },
      },
    };
    onUpdate(next);
  }

  return (
    <div className="space-y-6">
      <GlassCardMotion className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#261b14]">
              تسجيل الدخول بحسابات الذكاء الاصطناعي (بدون الحاجة لمفاتيح API)
            </h3>
            <p className="mt-1 text-xs text-[#6e5442]">
              اربط جلسة حسابك الشخصي في Gemini أو ChatGPT أو Claude بنقرة واحدة، أو استخدم مفتاح API كخيار إضافي.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8c6244]/15 px-3.5 py-1.5 text-xs font-semibold text-[#5c3f2b]">
            <ShieldCheck size={15} /> مصادقة جلسة مباشرة
          </span>
        </div>
      </GlassCardMotion>

      <div className="grid gap-5 md:grid-cols-3">
        {PROVIDERS.map((p, idx) => {
          const acc = state.aiAccounts[p.id];
          const isActive = state.activeProvider === p.id;
          return (
            <GlassCardMotion key={p.id} delay={idx * 0.08} className="flex flex-col justify-between p-5">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-[#8c6244]/15 px-3 py-1 text-[11px] font-bold text-[#5c3f2b]">
                    {p.badge}
                  </span>
                  {acc.loggedIn && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={15} /> متصل
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-extrabold text-[#261b14]">{p.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-[#6e5442]">{p.subtitle}</p>

                <div className="mt-4 space-y-2.5">
                  <input
                    value={emails[p.id]}
                    onChange={(e) => setEmails({ ...emails, [p.id]: e.target.value })}
                    placeholder="البريد الإلكتروني للحساب (مثال: you@gmail.com)"
                    className="glass-input w-full rounded-xl px-3.5 py-2.5 text-xs"
                  />

                  <AnimatePresence>
                    {showOptionalKey[p.id] && (
                      <motion.input
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        type="password"
                        value={apiKeys[p.id]}
                        onChange={(e) => setApiKeys({ ...apiKeys, [p.id]: e.target.value })}
                        placeholder="مفتاح API اختياري (اتركه فارغاً للدخول بالحساب)"
                        className="glass-input w-full rounded-xl px-3.5 py-2 text-xs"
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => loginWithAccount(p.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#3a271c] px-3 py-2.5 text-xs font-bold text-[#f7f2eb] shadow-sm transition hover:bg-[#5c3f2b]"
                  >
                    <LogIn size={14} /> {acc.loggedIn ? 'تحديث الجلسة' : 'تسجيل الدخول بالحساب'}
                  </motion.button>
                  <a
                    href={p.loginUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="فتح صفحة الحساب الرسمية"
                    className="flex items-center justify-center rounded-xl border border-[#8c6244]/30 bg-white/60 px-3 text-[#4e3829] hover:bg-white"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    onClick={() => setShowOptionalKey({ ...showOptionalKey, [p.id]: !showOptionalKey[p.id] })}
                    className="inline-flex items-center gap-1 text-[#6e5442] hover:text-[#261b14]"
                  >
                    <KeyRound size={12} /> {showOptionalKey[p.id] ? 'إخفاء API' : 'خيار API إضافي'}
                  </button>

                  {acc.loggedIn && (
                    <div className="flex items-center gap-2">
                      {!isActive && (
                        <button
                          onClick={() => onUpdate({ ...state, activeProvider: p.id })}
                          className="font-bold text-[#8c6244] underline"
                        >
                          تعيين كافتراضي
                        </button>
                      )}
                      <button onClick={() => logoutAccount(p.id)} className="inline-flex items-center gap-1 text-red-700">
                        <LogOut size={12} /> خروج
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </GlassCardMotion>
          );
        })}
      </div>
    </div>
  );
};
