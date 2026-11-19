import fs from 'fs';
import path from 'path';
import cron, { ScheduledTask } from 'node-cron';
import { EventEmitter } from 'events';
import { MultiProviderRouter } from '../providers/router.js';
import { scanProject } from './scanner.js';

export type AgentRole = 'SECURITY_SENTINEL' | 'CODE_HEALTH' | 'TASK_DELEGATOR';

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
  healthScore: number;
  findings: AuditFinding[];
}

const AGENT_PROMPTS: Record<AgentRole, string> = {
  SECURITY_SENTINEL:
    'You are GHAZAL Security Sentinel. Identify leaked secrets, injection vectors, unsafe auth, or dependency risks.',
  CODE_HEALTH:
    'You are GHAZAL Code Health Auditor. Identify dead code, architectural bottlenecks, missing error handling, and typing issues.',
  TASK_DELEGATOR:
    'You are GHAZAL Task Manager. Convert TODOs, incomplete modules, and structural gaps into prioritized engineering tasks.',
};

export class OversightEngine extends EventEmitter {
  private task: ScheduledTask | null = null;
  private history: AuditRun[] = [];
  private projectPath = process.env.GHAZAL_PROJECT_PATH || process.cwd();
  private cronExpression = '0 * * * *';
  private isRunning = false;

  constructor(private router: MultiProviderRouter) {
    super();
  }

  configure(projectPath: string, cronExpression = '0 * * * *') {
    this.projectPath = path.resolve(projectPath);
    this.cronExpression = cronExpression;
    if (this.task) {
      this.stop();
      this.start();
    }
    this.emit('log', { message: `Active workspace set to: ${this.projectPath}`, level: 'info' });
  }

  start() {
    if (this.task) return;
    this.task = cron.schedule(this.cronExpression, () => {
      this.runAudit().catch((err) => this.emit('error', err.message));
    });
    this.emit('log', { message: `Autonomous schedule armed (${this.cronExpression})`, level: 'info' });
  }

  stop() {
    this.task?.stop();
    this.task = null;
    this.emit('log', { message: 'Autonomous schedule paused', level: 'info' });
  }

  getState() {
    return {
      projectPath: this.projectPath,
      cronExpression: this.cronExpression,
      scheduled: Boolean(this.task),
      isRunning: this.isRunning,
      history: this.history,
    };
  }

  async runAudit(): Promise<AuditRun> {
    if (this.isRunning) throw new Error('Audit already in progress');
    this.isRunning = true;
    const runId = `audit_${Date.now()}`;
    const startedAt = new Date().toISOString();

    this.emit('log', { message: `Scanning workspace: ${this.projectPath}`, level: 'info' });

    try {
      const snapshot = scanProject(this.projectPath);
      const contextPayload = JSON.stringify({
        fileCount: snapshot.fileCount,
        tree: snapshot.tree,
        samples: snapshot.samples,
      });

      const roles: AgentRole[] = ['SECURITY_SENTINEL', 'CODE_HEALTH', 'TASK_DELEGATOR'];
      const findings: AuditFinding[] = [];
      let usedProvider = 'unknown';

      const results = await Promise.all(
        roles.map(async (role) => {
          this.emit('log', { message: `Dispatching agent: ${role}`, level: 'agent' });
          const response = await this.router.generate({
            systemPrompt: `${AGENT_PROMPTS[role]} Return strict JSON only: { "findings": [{ "severity": "low|medium|high|critical", "title": string, "file": string, "recommendation": string }] }`,
            userPrompt: `Audit this project snapshot:\n${contextPayload}`,
            jsonMode: true,
          });
          usedProvider = `${response.provider}:${response.model}`;
          const cleaned = response.text.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleaned || '{"findings":[]}');
          return (parsed.findings || []).map((f: any, idx: number): AuditFinding => ({
            id: `${runId}_${role}_${idx}`,
            timestamp: new Date().toISOString(),
            agent: role,
            severity: f.severity || 'medium',
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
        projectPath: this.projectPath,
        provider: usedProvider,
        healthScore: Math.max(0, 100 - penalty),
        findings,
      };

      // Persist report inside <project>/.ghazal/reports/ if configured
      if (snapshot.config.saveReportsToProject) {
        const reportsDir = path.join(this.projectPath, '.ghazal', 'reports');
        fs.mkdirSync(reportsDir, { recursive: true });
        fs.writeFileSync(path.join(reportsDir, `${runId}.json`), JSON.stringify(run, null, 2), 'utf8');
        this.emit('log', { message: `Report saved to .ghazal/reports/${runId}.json`, level: 'info' });
      }

      this.history.unshift(run);
      this.history = this.history.slice(0, 25);
      this.emit('auditComplete', run);
      return run;
    } finally {
      this.isRunning = false;
    }
  }
}
