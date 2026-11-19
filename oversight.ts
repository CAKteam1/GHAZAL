import fs from 'fs';
import path from 'path';
import cron, { ScheduledTask } from 'node-cron';
import { EventEmitter } from 'events';
import { MultiProviderRouter } from '../providers/router.js';
import { scanProject } from './scanner.js';
import { getGitDiffText } from './git.js';
import { StateStore, ScheduledJob } from '../storage/store.js';
import { AlertNotifier } from './notifier.js';

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
  status: 'open' | 'delegated' | 'resolved';
}

export interface AuditRun {
  runId: string;
  startedAt: string;
  completedAt: string;
  projectPath: string;
  provider: string;
  mode: 'full' | 'diff';
  healthScore: number;
  findings: AuditFinding[];
}

const AGENT_PROMPTS: Record<AgentRole, string> = {
  SECURITY_SENTINEL:
    'You are GHAZAL Security Sentinel. Identify leaked secrets, injection vectors, unsafe auth, CORS/XSS flaws, or dependency risks.',
  CODE_HEALTH:
    'You are GHAZAL Code Health Auditor. Identify dead code, architectural bottlenecks, missing error handling, and typing issues.',
  TASK_DELEGATOR:
    'You are GHAZAL Task Manager. Convert TODOs, incomplete modules, and structural gaps into prioritized engineering tasks.',
  PERFORMANCE_PRO:
    'You are GHAZAL Performance Engineer. Identify memory leaks, blocking I/O, redundant re-renders, N+1 loops, and heavy bundle patterns.',
  DOCS_ARCHITECT:
    'You are GHAZAL Docs Architect. Identify missing README instructions, undocumented APIs, env var drift, and unclear onboarding steps.',
};

export class OversightEngine extends EventEmitter {
  private jobTimers = new Map<string, ScheduledTask>();
  private legacyTask: ScheduledTask | null = null;
  private projectPath = process.env.GHAZAL_PROJECT_PATH || process.cwd();
  private cronExpression = '0 * * * *';
  private isRunning = false;
  private notifier = new AlertNotifier();

  constructor(private router: MultiProviderRouter, private store: StateStore) {
    super();
    this.syncSchedules();
  }

  configure(projectPath: string, cronExpression = '0 * * * *') {
    this.projectPath = path.resolve(projectPath);
    this.cronExpression = cronExpression;
    if (this.legacyTask) {
      this.stop();
      this.start();
    }
    this.emit('log', { message: `Active workspace set to: ${this.projectPath}`, level: 'info' });
  }

  start() {
    if (this.legacyTask) return;
    this.legacyTask = cron.schedule(this.cronExpression, () => {
      this.runAudit().catch((err) => this.emit('log', { message: `Audit error: ${err.message}`, level: 'error' }));
    });
    this.emit('log', { message: `Autonomous hourly schedule armed (${this.cronExpression})`, level: 'info' });
  }

  stop() {
    this.legacyTask?.stop();
    this.legacyTask = null;
    this.emit('log', { message: 'Autonomous hourly schedule paused', level: 'info' });
  }

  syncSchedules() {
    for (const timer of this.jobTimers.values()) timer.stop();
    this.jobTimers.clear();

    for (const job of this.store.state.schedules) {
      if (!job.enabled || !cron.validate(job.cronExpression)) continue;
      const timer = cron.schedule(job.cronExpression, () => {
        this.executeScheduledJob(job.id).catch((err) =>
          this.emit('log', { message: `Schedule "${job.name}" failed: ${err.message}`, level: 'error' })
        );
      });
      this.jobTimers.set(job.id, timer);
    }
  }

  createSchedule(input: Omit<ScheduledJob, 'id' | 'runCount'>): ScheduledJob {
    if (!cron.validate(input.cronExpression)) {
      throw new Error(`Invalid cron expression: ${input.cronExpression}`);
    }
    const job: ScheduledJob = {
      ...input,
      id: `job_${Date.now()}`,
      projectPath: path.resolve(input.projectPath || this.projectPath),
      runCount: 0,
    };
    this.store.state.schedules.unshift(job);
    this.store.save();
    this.syncSchedules();
    this.emit('log', { message: `Scheduled task created: ${job.name} (${job.cronExpression})`, level: 'info' });
    return job;
  }

  toggleSchedule(id: string, enabled: boolean) {
    const job = this.store.state.schedules.find((s) => s.id === id);
    if (!job) throw new Error('Schedule not found');
    job.enabled = enabled;
    this.store.save();
    this.syncSchedules();
    return job;
  }

  deleteSchedule(id: string) {
    this.store.state.schedules = this.store.state.schedules.filter((s) => s.id !== id);
    this.store.save();
    this.syncSchedules();
  }

  async executeScheduledJob(id: string) {
    const job = this.store.state.schedules.find((s) => s.id === id);
    if (!job) throw new Error('Schedule not found');
    this.emit('log', { message: `Executing scheduled task: ${job.name}`, level: 'info' });
    const run = await this.runAudit({
      projectPath: job.projectPath,
      agents: job.agents,
      mode: job.mode,
    });
    job.lastRunAt = run.completedAt;
    job.lastHealthScore = run.healthScore;
    job.runCount += 1;
    this.store.save();
    return run;
  }

  getState() {
    return {
      projectPath: this.projectPath,
      cronExpression: this.cronExpression,
      scheduled: Boolean(this.legacyTask),
      isRunning: this.isRunning,
      history: this.store.state.history,
    };
  }

  async runAudit(options?: {
    projectPath?: string;
    agents?: AgentRole[];
    mode?: 'full' | 'diff';
  }): Promise<AuditRun> {
    if (this.isRunning) throw new Error('Audit already in progress');
    this.isRunning = true;

    const targetPath = path.resolve(options?.projectPath || this.projectPath);
    const mode = options?.mode || 'full';
    const roles: AgentRole[] =
      options?.agents && options.agents.length > 0
        ? options.agents
        : ['SECURITY_SENTINEL', 'CODE_HEALTH', 'TASK_DELEGATOR'];

    const runId = `audit_${Date.now()}`;
    const startedAt = new Date().toISOString();

    this.emit('log', { message: `Starting ${mode.toUpperCase()} audit on: ${targetPath}`, level: 'info' });

    try {
      const snapshot = scanProject(targetPath);
      const gitDiff = mode === 'diff' ? getGitDiffText(targetPath) : '';

      const contextPayload = JSON.stringify(
        mode === 'diff' && gitDiff
          ? { mode: 'git-diff', fileCount: snapshot.fileCount, diff: gitDiff }
          : { mode: 'full', fileCount: snapshot.fileCount, tree: snapshot.tree, samples: snapshot.samples }
      );

      const findings: AuditFinding[] = [];
      let usedProvider = 'unknown';

      const results = await Promise.all(
        roles.map(async (role) => {
          this.emit('log', { message: `Dispatching agent: ${role}`, level: 'agent' });
          const response = await this.router.generate({
            systemPrompt: `${AGENT_PROMPTS[role]} Return strict JSON only: { "findings": [{ "severity": "low|medium|high|critical", "title": string, "file": string, "recommendation": string }] }`,
            userPrompt: `Audit this project payload:\n${contextPayload}`,
            jsonMode: true,
          });

          usedProvider = `${response.provider}:${response.model}`;
          this.store.recordMetric({
            timestamp: new Date().toISOString(),
            provider: response.provider,
            model: response.model,
            latencyMs: response.latencyMs,
            approxTokens: Math.ceil((contextPayload.length + response.text.length) / 4),
            purpose: 'audit',
          });

          const cleaned = response.text.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleaned || '{"findings":[]}');
          return (parsed.findings || []).map((f: any, idx: number): AuditFinding => ({
            id: `${runId}_${role}_${idx}`,
            timestamp: new Date().toISOString(),
            agent: role,
            severity: ['low', 'medium', 'high', 'critical'].includes(f.severity) ? f.severity : 'medium',
            title: f.title || 'Untitled Finding',
            file: f.file,
            recommendation: f.recommendation || '',
            status: 'open',
          }));
        })
      );

      results.forEach((group) => findings.push(...group));

      const penalty = findings.reduce(
        (acc, f) => acc + ({ critical: 20, high: 10, medium: 5, low: 2 }[f.severity] || 0),
        0
      );

      const run: AuditRun = {
        runId,
        startedAt,
        completedAt: new Date().toISOString(),
        projectPath: targetPath,
        provider: usedProvider,
        mode,
        healthScore: Math.max(0, 100 - penalty),
        findings,
      };

      if (snapshot.config.saveReportsToProject) {
        const reportsDir = path.join(targetPath, '.ghazal', 'reports');
        fs.mkdirSync(reportsDir, { recursive: true });
        fs.writeFileSync(path.join(reportsDir, `${runId}.json`), JSON.stringify(run, null, 2), 'utf8');
      }

      this.store.addAuditRun(run);
      await this.notifier.notifyAudit(this.store.state.alerts, run);
      this.emit('auditComplete', run);
      this.emit('log', { message: `Audit complete — Health Score: ${run.healthScore}/100`, level: 'info' });
      return run;
    } finally {
      this.isRunning = false;
    }
  }
}
