import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Instagram,
  Facebook,
  Youtube,
  Mail,
  Sparkles,
  Bot,
  Send,
  CheckCircle2,
  Clock,
  Power,
} from 'lucide-react';
import { runStudioAI, SocialChannel, StudioState } from '../lib/studioStore';
import { GlassCardMotion } from './MotionPrimitives';

const ICONS: Record<SocialChannel['id'], React.ReactNode> = {
  instagram: <Instagram size={18} className="text-pink-700" />,
  facebook: <Facebook size={18} className="text-blue-700" />,
  youtube: <Youtube size={18} className="text-red-700" />,
  gmail: <Mail size={18} className="text-amber-800" />,
};

export const SocialHubView: React.FC<{
  state: StudioState;
  onUpdate: (next: StudioState) => void;
}> = ({ state, onUpdate }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialChannel['id']>('instagram');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);

  function toggleChannelProp(id: SocialChannel['id'], prop: 'connected' | 'autoReply' | 'autoPost') {
    const next: StudioState = {
      ...state,
      socialChannels: state.socialChannels.map((ch) =>
        ch.id === id ? { ...ch, [prop]: !ch[prop] } : ch
      ),
    };
    onUpdate(next);
  }

  async function generateSmartPost() {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    try {
      const res = await runStudioAI(
        state,
        `You are GHAZAL Social Media AI Manager for ${selectedPlatform}. Write an engaging Arabic post or reply.`,
        topic
      );
      const next: StudioState = {
        ...state,
        socialQueue: [
          {
            id: `sq_${Date.now()}`,
            platform: selectedPlatform,
            type: selectedPlatform === 'gmail' ? 'مسودة رد بريد ذكي' : 'محتوى مولّد بالذكاء الاصطناعي',
            content: res.text,
            status: 'scheduled',
            time: 'مجدول تلقائياً',
          },
          ...state.socialQueue,
        ],
      };
      onUpdate(next);
      setTopic('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Connected Platforms Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {state.socialChannels.map((ch, i) => (
          <GlassCardMotion key={ch.id} delay={i * 0.06} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/75 shadow-xs">
                  {ICONS[ch.id]}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#261b14]">{ch.name}</h4>
                  <p className="font-mono text-[11px] text-[#6e5442]">{ch.handle}</p>
                </div>
              </div>
              <button
                onClick={() => toggleChannelProp(ch.id, 'connected')}
                className={`rounded-full p-2 transition ${
                  ch.connected ? 'bg-emerald-600/15 text-emerald-800' : 'bg-black/10 text-[#6e5442]'
                }`}
                title="تبديل حالة الاتصال"
              >
                <Power size={14} />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#8c6244]/10 px-3 py-2 text-xs">
              <span className="font-semibold text-[#4e3829]">{ch.followers}</span>
              <span className="text-[11px] text-[#6e5442]">{ch.pendingDMs} رسائل بانتظار الرد</span>
            </div>

            <div className="mt-3 flex gap-2 text-[11px]">
              <button
                onClick={() => toggleChannelProp(ch.id, 'autoReply')}
                className={`flex-1 rounded-xl py-1.5 font-semibold transition ${
                  ch.autoReply
                    ? 'bg-[#3a271c] text-[#f7f2eb]'
                    : 'border border-[#8c6244]/25 bg-white/50 text-[#5c3f2b]'
                }`}
              >
                رد AI {ch.autoReply ? 'مفعّل' : 'متوقف'}
              </button>
              <button
                onClick={() => toggleChannelProp(ch.id, 'autoPost')}
                className={`flex-1 rounded-xl py-1.5 font-semibold transition ${
                  ch.autoPost
                    ? 'bg-[#8c6244] text-white'
                    : 'border border-[#8c6244]/25 bg-white/50 text-[#5c3f2b]'
                }`}
              >
                نشر AI {ch.autoPost ? 'مفعّل' : 'متوقف'}
              </button>
            </div>
          </GlassCardMotion>
        ))}
      </div>

      {/* AI Social & Gmail Composer */}
      <GlassCardMotion className="p-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#5c3f2b]">
          <Bot size={16} /> مولّد المنشورات والردود التلقائية (Instagram • Facebook • YouTube • Gmail)
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value as SocialChannel['id'])}
            className="glass-input rounded-xl px-3.5 py-2.5 text-xs font-semibold sm:w-44"
          >
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="youtube">YouTube</option>
            <option value="gmail">Gmail</option>
          </select>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generateSmartPost()}
            placeholder="اكتب فكرة المنشور أو موضوع الرسالة ليتولى الذكاء الاصطناعي صياغتها وجدولتها..."
            className="glass-input flex-1 rounded-xl px-4 py-2.5 text-xs"
          />
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={generateSmartPost}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3a271c] px-5 py-2.5 text-xs font-bold text-[#f7f2eb] shadow-sm disabled:opacity-50"
          >
            <Sparkles size={14} /> {generating ? 'جاري التوليد...' : 'توليد وجدولة'}
          </motion.button>
        </div>
      </GlassCardMotion>

      {/* Automated Publishing & Replies Queue */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#5c3f2b]">
          طابور النشر والردود المُدارة بالذكاء الاصطناعي ({state.socialQueue.length})
        </h3>
        {state.socialQueue.map((item, idx) => (
          <GlassCardMotion key={item.id} delay={idx * 0.05} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {ICONS[item.platform]}
                <span className="text-xs font-bold uppercase text-[#3a271c]">{item.platform}</span>
                <span className="rounded-full bg-[#8c6244]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#5c3f2b]">
                  {item.type}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#6e5442]">
                <Clock size={12} /> {item.time}
                <button
                  onClick={() =>
                    onUpdate({
                      ...state,
                      socialQueue: state.socialQueue.map((q) =>
                        q.id === item.id ? { ...q, status: 'published', time: 'تم النشر' } : q
                      ),
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-[#3a271c] px-2.5 py-1 text-[10px] font-bold text-white"
                >
                  {item.status === 'published' ? (
                    <>
                      <CheckCircle2 size={11} /> منشور
                    </>
                  ) : (
                    <>
                      <Send size={11} /> نشر الآن
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="mt-2.5 whitespace-pre-wrap text-xs leading-relaxed text-[#261b14]">
              {item.content}
            </p>
          </GlassCardMotion>
        ))}
      </div>
    </div>
  );
};
