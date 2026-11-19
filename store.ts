import fs from 'fs';
import path from 'path';
import os from 'os';
import { AuditRun, AuditFinding, AgentRole } from '../agents/oversight.js';

export interface ScheduledJob {
  id: string;
  name: string;
  projectPath: string;
  cronExpression: string;
  agents: AgentRole[];
  mode: 'full' | 'diff';
  enabled: boolean;
  lastRunAt?: string;
  lastHealthScore?: number;
  runCount: number;
}

export interface BoardTask {
  id: string;
  title: string;
  description: string;
  file?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  agent: AgentRole | 'MANUAL';
  status: 'todo' | 'in_progress' | 'done';
  projectPath: string;
  aiFixSuggestion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  latencyMs?: number;
  timestamp: string;
}

export interface AlertConfig {
  telegramBotToken: string;
  telegramChatId: string;
  discordWebhookUrl: string;
  customWebhookUrl: string;
  notifyOnSeverity: ('critical' | 'high' | 'medium' | 'low')[];
  notifyOnScheduleComplete: boolean;
}

export interface ProviderMetric {
  timestamp: string;
  provider: string;
  model: string;
  latencyMs: number;
  approxTokens: number;
  purpose: 'audit' | 'chat' | 'autofix';
}

export interface PersistedState {
  history: AuditRun[];
  schedules: ScheduledJob[];
  tasks: BoardTask[];
  chat: ChatMessage[];
  alerts: AlertConfig;
  metrics: ProviderMetric[];
}

const DATA_DIR = path.join(os.homedir(), '.ghazal');
const DATA_FILE = path.join(DATA_DIR, 'store.v2.json');

export class StateStore {
  public state: PersistedState = {
    history: [],
    schedules: [],
    tasks: [],
    chat: [],
    alerts: {
      telegramBotToken: '',
      telegramChatId: '',
      discordWebhookUrl: '',
      customWebhookUrl: '',
      notifyOnSeverity: ['critical', 'high'],
      notifyOnScheduleComplete: true,
    },
    metrics: [],
  };

  constructor() {
    this.load();
  }

  private load() {
    if (!fs.existsSync(DATA_FILE)) return;
    try {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      this.state = {
        ...this.state,
        ...parsed,
        alerts: { ...this.state.alerts, ...(parsed.alerts || {}) },
      };
    } catch {
      console.warn('[GHAZAL Store] Starting with fresh v2 store.');
    }
  }

  save() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2), 'utf8');
  }

  addAuditRun(run: AuditRun) {
    this.state.history.unshift(run);
    this.state.history = this.state.history.slice(0, 100);
    this.save();
  }

  recordMetric(metric: ProviderMetric) {
    this.state.metrics.unshift(metric);
    this.state.metrics = this.state.metrics.slice(0, 500);
    this.save();
  }

  promoteFindingToTask(finding: AuditFinding, projectPath: string): BoardTask {
    const existing = this.state.tasks.find(
      (t) => t.title === finding.title && t.projectPath === projectPath
    );
    if (existing) return existing;

    const now = new Date().toISOString();
    const task: BoardTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: finding.title,
      description: finding.recommendation,
      file: finding.file,
      severity: finding.severity,
      agent: finding.agent,
      status: 'todo',
      projectPath,
      createdAt: now,
      updatedAt: now,
    };
    this.state.tasks.unshift(task);
    this.save();
    return task;
  }

  getAnalytics() {
    const history = this.state.history;
    const tasks = this.state.tasks;
    const metrics = this.state.metrics;

    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    const agentCounts: Record<string, number> = {};

    for (const run of history) {
      for (const f of run.findings) {
        severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1;
        agentCounts[f.agent] = (agentCounts[f.agent] || 0) + 1;
      }
    }

    const healthTrend = history
      .slice(0, 14)
      .reverse()
      .map((r) => ({
        runId: r.runId,
        date: r.completedAt,
        score: r.healthScore,
        findings: r.findings.length,
        mode: r.mode || 'full',
      }));

    const providerStats: Record<string, { calls: number; avgLatencyMs: number; approxTokens: number }> = {};
    for (const m of metrics) {
      if (!providerStats[m.provider]) {
        providerStats[m.provider] = { calls: 0, avgLatencyMs: 0, approxTokens: 0 };
      }
      const p = providerStats[m.provider];
      p.avgLatencyMs = Math.round((p.avgLatencyMs * p.calls + m.latencyMs) / (p.calls + 1));
      p.calls += 1;
      p.approxTokens += m.approxTokens;
    }

    const avgHealth =
      history.length > 0
        ? Math.round(history.reduce((s, r) => s + r.healthScore, 0) / history.length)
        : 0;

    return {
      summary: {
        totalAudits: history.length,
        avgHealthScore: avgHealth,
        latestHealthScore: history[0]?.healthScore ?? null,
        openTasks: tasks.filter((t) => t.status !== 'done').length,
        completedTasks: tasks.filter((t) => t.status === 'done').length,
        activeSchedules: this.state.schedules.filter((s) => s.enabled).length,
        totalApiCalls: metrics.length,
      },
      severityCounts,
      agentCounts,
      healthTrend,
      providerStats,
    };
  }
}
