import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Send, Sparkles, Circle } from 'lucide-react';
import { runStudioAI, StudioState, TeamMember } from '../lib/studioStore';
import { GlassCardMotion } from './MotionPrimitives';

export const TeamWorkspaceView: React.FC<{
  state: StudioState;
  onUpdate: (next: StudioState) => void;
}> = ({ state, onUpdate }) => {
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<TeamMember['role']>('Developer');
  const [msgText, setMsgText] = useState('');
  const [aiHelperBusy, setAiHelperBusy] = useState(false);

  function inviteMember() {
    if (!memberName.trim()) return;
    const newMember: TeamMember = {
      id: `m_${Date.now()}`,
      name: memberName.trim(),
      role: memberRole,
      status: 'online',
      avatar: memberName.trim()[0],
    };
    onUpdate({
      ...state,
      members: [...state.members, newMember],
      teamChat: [
        ...state.teamChat,
        {
          id: `sys_${Date.now()}`,
          sender: 'نظام الاستوديو',
          role: 'System',
          text: `انضم ${newMember.name} (${newMember.role}) إلى مساحة العمل.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    });
    setMemberName('');
  }

  function sendTeamMessage() {
    if (!msgText.trim()) return;
    const me = state.members[0]?.name || 'عضو الفريق';
    onUpdate({
      ...state,
      teamChat: [
        ...state.teamChat,
        {
          id: `msg_${Date.now()}`,
          sender: me,
          role: 'Owner',
          text: msgText.trim(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    });
    setMsgText('');
  }

  async function askAIInTeamChat() {
    if (!msgText.trim() || aiHelperBusy) return;
    setAiHelperBusy(true);
    const prompt = msgText.trim();
    setMsgText('');
    try {
      const res = await runStudioAI(
        state,
        'You are GHAZAL Studio Team Copilot participating in a team workspace chat. Reply concisely in Arabic.',
        prompt
      );
      onUpdate({
        ...state,
        teamChat: [
          ...state.teamChat,
          {
            id: `u_${Date.now()}`,
            sender: state.members[0]?.name || 'أنت',
            role: 'Owner',
            text: prompt,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          {
            id: `ai_${Date.now()}`,
            sender: `وكيل غزال (${state.activeProvider.toUpperCase()})`,
            role: 'AI Copilot',
            text: res.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAiHelperBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Members Panel */}
      <GlassCardMotion className="p-5 lg:col-span-1">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5c3f2b]">
          <Users size={15} /> أعضاء مساحة العمل ({state.members.length})
        </div>

        <div className="space-y-2.5">
          {state.members.map((m) => (
            <motion.div
              key={m.id}
              whileHover={{ x: -3 }}
              className="flex items-center justify-between rounded-2xl border border-[#8c6244]/20 bg-white/55 px-3.5 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3a271c] text-xs font-bold text-[#f7f2eb]">
                  {m.avatar}
                </div>
                <div>
                  <p className="text-xs font-bold text-[#261b14]">{m.name}</p>
                  <p className="text-[10px] text-[#6e5442]">{m.role}</p>
                </div>
              </div>
              <Circle
                size={9}
                className={
                  m.status === 'online'
                    ? 'fill-emerald-600 text-emerald-600'
                    : 'fill-amber-500 text-amber-500'
                }
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-5 space-y-2 border-t border-[#8c6244]/20 pt-4">
          <p className="text-[11px] font-bold text-[#5c3f2b]">إضافة عضو جديد للفريق</p>
          <input
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder="اسم العضو أو البريد..."
            className="glass-input w-full rounded-xl px-3 py-2 text-xs"
          />
          <div className="flex gap-2">
            <select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value as TeamMember['role'])}
              className="glass-input flex-1 rounded-xl px-2.5 py-2 text-xs"
            >
              <option value="Developer">Developer</option>
              <option value="Social Lead">Social Lead</option>
              <option value="Editor">Editor</option>
            </select>
            <button
              onClick={inviteMember}
              className="inline-flex items-center gap-1 rounded-xl bg-[#3a271c] px-3.5 py-2 text-xs font-bold text-white"
            >
              <UserPlus size={14} /> دعوة
            </button>
          </div>
        </div>
      </GlassCardMotion>

      {/* Team Real-Time Collaboration Chat */}
      <GlassCardMotion delay={0.08} className="flex h-[64vh] flex-col p-5 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between border-b border-[#8c6244]/20 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5c3f2b]">
            غرفة تواصل الفريق والوكيل الذكي
          </h3>
          <span className="text-[11px] text-[#6e5442]">مزامنة فورية لمساحة العمل</span>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-1">
          {state.teamChat.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs ${
                c.role === 'AI Copilot'
                  ? 'border border-[#8c6244]/35 bg-[#8c6244]/15 text-[#261b14]'
                  : 'bg-white/75 text-[#261b14] shadow-2xs'
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-4 text-[10px] font-bold text-[#6e5442]">
                <span>{c.sender}</span>
                <span>{c.time}</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{c.text}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-[#8c6244]/20 pt-3">
          <input
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendTeamMessage()}
            placeholder="اكتب رسالة للفريق أو اسأل وكيل غزال..."
            className="glass-input flex-1 rounded-xl px-3.5 py-2.5 text-xs"
          />
          <button
            onClick={sendTeamMessage}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#3a271c] px-4 py-2.5 text-xs font-bold text-white"
          >
            <Send size={14} /> إرسال
          </button>
          <button
            onClick={askAIInTeamChat}
            disabled={aiHelperBusy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#8c6244] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            <Sparkles size={14} /> {aiHelperBusy ? '...' : 'رد AI'}
          </button>
        </div>
      </GlassCardMotion>
    </div>
  );
};
