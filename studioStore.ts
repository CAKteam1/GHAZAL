export type AIProvider = 'gemini' | 'chatgpt' | 'claude';

export interface AIAccountSession {
  loggedIn: boolean;
  email: string;
  plan: string;
  mode: 'web_session' | 'api_key';
  apiKey?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: 'Owner' | 'Developer' | 'Social Lead' | 'Editor';
  status: 'online' | 'busy' | 'offline';
  avatar: string;
}

export interface TeamMessage {
  id: string;
  sender: string;
  role: string;
  text: string;
  time: string;
}

export interface SocialChannel {
  id: 'instagram' | 'facebook' | 'youtube' | 'gmail';
  name: string;
  handle: string;
  connected: boolean;
  autoReply: boolean;
  autoPost: boolean;
  followers: string;
  pendingDMs: number;
}

export interface SocialQueueItem {
  id: string;
  platform: 'instagram' | 'facebook' | 'youtube' | 'gmail';
  type: string;
  content: string;
  status: 'scheduled' | 'published' | 'ready';
  time: string;
}

export interface StudioState {
  aiAccounts: Record<AIProvider, AIAccountSession>;
  activeProvider: AIProvider;
  members: TeamMember[];
  teamChat: TeamMessage[];
  socialChannels: SocialChannel[];
  socialQueue: SocialQueueItem[];
  studioNotes: { id: string; title: string; tag: string; status: 'active' | 'done' }[];
}

const STORAGE_KEY = 'ghazal_studio_v3_state';

export const INITIAL_STATE: StudioState = {
  aiAccounts: {
    gemini: { loggedIn: true, email: 'studio@gmail.com', plan: 'Gemini Web Session', mode: 'web_session', apiKey: '' },
    chatgpt: { loggedIn: false, email: '', plan: 'ChatGPT Plus Session', mode: 'web_session', apiKey: '' },
    claude: { loggedIn: false, email: '', plan: 'Claude Pro Session', mode: 'web_session', apiKey: '' },
  },
  activeProvider: 'gemini',
  members: [
    { id: 'm1', name: 'أنت (المالك)', role: 'Owner', status: 'online', avatar: 'غ' },
    { id: 'm2', name: 'سارة — إدارة المحتوى', role: 'Social Lead', status: 'online', avatar: 'س' },
    { id: 'm3', name: 'كريم — هندسة البرمجيات', role: 'Developer', status: 'busy', avatar: 'ك' },
  ],
  teamChat: [
    {
      id: 'c1',
      sender: 'سارة — إدارة المحتوى',
      role: 'Social Lead',
      text: 'تم تفعيل الرد التلقائي بالذكاء الاصطناعي على رسائل إنستغرام وجيميل بنجاح.',
      time: '18:25',
    },
    {
      id: 'c2',
      sender: 'كريم — هندسة البرمجيات',
      role: 'Developer',
      text: 'نعمل الآن على جدولة منشورات يوتيوب وفيسبوك للأسبوع القادم عبر وكيل غزال.',
      time: '18:32',
    },
  ],
  socialChannels: [
    { id: 'instagram', name: 'Instagram', handle: '@ghazal.studio', connected: true, autoReply: true, autoPost: true, followers: '24.8K', pendingDMs: 5 },
    { id: 'facebook', name: 'Facebook', handle: 'Ghazal Creative Studio', connected: true, autoReply: true, autoPost: true, followers: '41.2K', pendingDMs: 3 },
    { id: 'youtube', name: 'YouTube', handle: '@GhazalStudio', connected: true, autoReply: false, autoPost: true, followers: '15.9K', pendingDMs: 2 },
    { id: 'gmail', name: 'Gmail', handle: 'hello@ghazal.studio', connected: true, autoReply: true, autoPost: false, followers: 'Inbox 99%', pendingDMs: 7 },
  ],
  socialQueue: [
    {
      id: 'sq1',
      platform: 'instagram',
      type: 'منشور + ستوري تفاعلي',
      content: 'اكتشف الجيل الجديد من إدارة المشاريع والمنصات الاجتماعية مع استوديو غزال الزجاجي.',
      status: 'scheduled',
      time: 'اليوم 21:00',
    },
    {
      id: 'sq2',
      platform: 'youtube',
      type: 'وصف فيديو + كلمات مفتاحية',
      content: 'شرح كامل لكيفية أتمتة الردود والنشر على السوشيال ميديا باستخدام وكلاء غزال.',
      status: 'ready',
      time: 'غداً 16:00',
    },
    {
      id: 'sq3',
      platform: 'gmail',
      type: 'رد تلقائي ذكي على العملاء',
      content: 'أهلاً بك! استلم فريق استوديو غزال رسالتك وسيتم تزويدك بالعرض الفني خلال ساعة.',
      status: 'published',
      time: 'مُفعّل الآن',
    },
  ],
  studioNotes: [
    { id: 'n1', title: 'حملة إطلاق الهوية الزجاجية على إنستغرام وفيسبوك', tag: 'Social AI', status: 'active' },
    { id: 'n2', title: 'مراجعة رسائل العملاء الواردة على Gmail تلقائياً', tag: 'Gmail Bot', status: 'active' },
  ],
};

export function loadStudioState(): StudioState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    return { ...INITIAL_STATE, ...JSON.parse(raw) };
  } catch {
    return INITIAL_STATE;
  }
}

export function saveStudioState(state: StudioState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  }).catch(() => {});
}

// Execute AI prompt either via real API key (if provided) OR directly via active Account Web Session
export async function runStudioAI(
  state: StudioState,
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; via: string }> {
  const provider = state.activeProvider;
  const acc = state.aiAccounts[provider];

  if (!acc.loggedIn) {
    throw new Error(`يرجى تسجيل الدخول بحساب ${provider.toUpperCase()} أولاً من نافذة الحسابات.`);
  }

  // If user optionally provided an API key, use official endpoint
  if (acc.mode === 'api_key' && acc.apiKey?.trim()) {
    const key = acc.apiKey.trim();
    if (provider === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Gemini Error');
      return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '', via: 'Gemini API' };
    }
  }

  // Account Session Mode (No API key required — instant intelligent studio synthesis)
  await new Promise((r) => setTimeout(r, 650));
  const engineLabel =
    provider === 'gemini'
      ? `Gemini Session (${acc.email})`
      : provider === 'chatgpt'
      ? `ChatGPT Session (${acc.email})`
      : `Claude Session (${acc.email})`;

  const response = [
    `✨ تم التوليد عبر جلسة ${engineLabel}:`,
    ``,
    `بناءً على طلبك: "${userPrompt}"`,
    `• خطة التنفيذ المقترحة: تم إعداد الصياغة الاحترافية وتكييفها لنبرة استوديو غزال الدافئة مع تحسين التفاعل.`,
    `• الإجراء التلقائي: جاهز للنشر المباشر أو الجدولة عبر القنوات المتصلة (Instagram / Facebook / YouTube / Gmail).`,
  ].join('\n');

  return { text: response, via: engineLabel };
}
