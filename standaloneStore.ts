import { callDirectLLM } from './directLLM';
import { ProjectSnapshot } from './projectSource';

export type AgentRole =
  | 'SECURITY_SENTINEL'
  | 'CODE_HEALTH'
  | 'TASK_DELEGATOR'
  | 'PERFORMANCE_PRO'
  | 'DOCS_ARCHITECT';

export const ALL_AGENTS: AgentRole[] = [
  'SECURITY_SENTINEL',
  'CODE_HEALTH',
  'TASK_DELEGATOR',
  'PERFORMANCE_PRO',
  'DOCS_ARCHITECT',
];

export interface AuditFinding {
  id: string;
  timestamp: string;
  agent: AgentRole;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  file?: string;
  recommendation: string;
}

export interface AuditRun {
  runId: string;
  completedAt: string;
  sourceLabel: string;
  provider: string;
  healthScore: number;
  findings: AuditFinding[];
}

export interface BoardTask {
  id: string;
  title: string;
  description: string;
  file?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'done';
  aiFixSuggestion?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  latencyMs?: number;
  timestamp: string;
}

export interface ScheduledRule {
  id: string;
  name: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRunAt?: string;
}

export interface StandaloneDB {
  history: AuditRun[];
  tasks: BoardTask[];
  chat: ChatMessage[];
  schedules: ScheduledRule[];
  metrics: { provider: string; latencyMs: number; approxTokens: number }[];
}

const DB_KEY = 'ghazal_standalone_db_v1';

const AGENT_PROMPTS: Record<AgentRole, string> = {
  SECURITY_SENTINEL:
    'You are GHAZAL Security Sentinel. Find leaked API keys, injection risks, weak auth, or XSS/CORS issues.',
  CODE_HEALTH:
    'You are GHAZAL Code Health Auditor. Find architectural flaws, missing error handling, dead code, and type bugs.',
  TASK_DELEGATOR:
    'You are GHAZAL Task Manager. Turn TODOs and incomplete parts into actionable engineering tasks.',
  PERFORMANCE_PRO:
    'You are GHAZAL Performance Engineer. Find slow loops, memory leaks, unnecessary re-renders, and heavy assets.',
  DOCS_ARCHITECT:
    'You are GHAZAL Docs Architect. Find missing README instructions, undocumented APIs, and setup gaps.',
};

export function loadDB(): StandaloneDB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return { history: [], tasks: [], chat: [], schedules: [], metrics: [] };
    return {
      history: [],
      tasks: [],
      chat: [],
      schedules: [],
      metrics: [],
      ...JSON.parse(raw),
    };
  } catch {
    return { history: [], tasks: [], chat: [], schedules: [], metrics: [] };
  }
}

export function saveDB(db: StandaloneDB) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export async function runStandaloneAudit(
  snapshot: ProjectSnapshot,
  agents: AgentRole[],
  onLog: (msg: string) => void
): Promise<AuditRun> {
  const runId = `audit_${Date.now()}`;
  const payload = JSON.stringify({
    source: snapshot.sourceLabel,
    fileCount: snapshot.fileCount,
    tree: snapshot.tree,
    samples: snapshot.samples,
  });

  const findings: AuditFinding[] = [];
  let usedProvider = 'unknown';

  const results = await Promise.all(
    agents.map(async (role) => {
      onLog(`Dispatching agent: ${role}`);
      const res = await callDirectLLM({
        systemPrompt: `${AGENT_PROMPTS[role]} Return strict JSON only: { "findings": [{ "severity": "low|medium|high|critical", "title": string, "file": string, "recommendation": string }] }`,
        userPrompt: `Audit this project snapshot:\n${payload}`,
        jsonMode: true,
      });

      usedProvider = `${res.provider}:${res.model}`;
      const db = loadDB();
      db.metrics.unshift({
        provider: res.provider,
        latencyMs: res.latencyMs,
        approxTokens: Math.ceil((payload.length + res.text.length) / 4),
      });
      db.metrics = db.metrics.slice(0, 200);
      saveDB(db);

      const cleaned = res.text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned || '{"findings":[]}');
      return (parsed.findings || []).map((f: any, idx: number): AuditFinding => ({
        id: `${runId}_${role}_${idx}`,
        timestamp: new Date().toISOString(),
        agent: role,
        severity: ['low', 'medium', 'high', 'critical'].includes(f.severity) ? f.severity : 'medium',
        title: f.title || 'Untitled Finding',
        file: f.file,
        recommendation: f.recommendation || '',
      }));
    })
  );

  results.forEach((g) => findings.push(...g));

  const penalty = findings.reduce(
    (acc, f) => acc + ({ critical: 20, high: 10, medium: 5, low: 2 }[f.severity] || 0),
    0
  );

  const run: AuditRun = {
    runId,
    completedAt: new Date().toISOString(),
    sourceLabel: snapshot.sourceLabel,
    provider: usedProvider,
    healthScore: Math.max(0, 100 - penalty),
    findings,
  };

  const db = loadDB();
  db.history.unshift(run);
  db.history = db.history.slice(0, 40);
  saveDB(db);

  onLog(`Audit completed — Health Score: ${run.healthScore}/100`);
  return run;
}
