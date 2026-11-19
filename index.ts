import express from 'express';
import cors from 'cors';
import { KeyVault, ProviderId } from './security/vault.js';
import { MobileAuthManager } from './security/auth.js';
import { MultiProviderRouter } from './providers/router.js';
import { OversightEngine, ALL_AGENTS } from './agents/oversight.js';
import { attachGhazalToProject, scanProject } from './agents/scanner.js';
import { inspectGitRepo } from './agents/git.js';
import { StateStore } from './storage/store.js';
import { AlertNotifier } from './agents/notifier.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const PORT = Number(process.env.PORT || 4747);
const vault = new KeyVault();
const store = new StateStore();
const auth = new MobileAuthManager();
const router = new MultiProviderRouter(vault);
const engine = new OversightEngine(router, store);
const notifier = new AlertNotifier();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

app.use('/api', auth.middleware);

// 1. Mobile Connect & Pairing Info
app.get('/api/mobile/connect', (_req, res) => {
  res.json(auth.getConnectionInfo(PORT));
});

app.post('/api/mobile/auth', (req, res) => {
  if (typeof req.body.requireAuth === 'boolean') auth.setRequireAuth(req.body.requireAuth);
  if (req.body.regenerate) auth.regenerateToken();
  res.json(auth.getConnectionInfo(PORT));
});

// 2. Provider Vault
app.get('/api/providers', (_req, res) => res.json(vault.getPublicStatus()));

app.post('/api/providers/key', (req, res) => {
  const { provider, apiKey, model } = req.body as {
    provider: ProviderId;
    apiKey: string;
    model?: string;
  };
  if (!provider || !apiKey) return res.status(400).json({ error: 'provider and apiKey required' });
  vault.setProviderKey(provider, apiKey, model);
  res.json(vault.getPublicStatus());
});

app.post('/api/providers/active', (req, res) => {
  const { provider } = req.body as { provider: ProviderId };
  vault.setActiveProvider(provider);
  res.json(vault.getPublicStatus());
});

// 3. Multi-Project Attachment & Git Inspection
app.get('/api/projects', (_req, res) => res.json(vault.getProjects()));

app.post('/api/projects/attach', (req, res) => {
  try {
    const { projectPath, schedule } = req.body as { projectPath: string; schedule?: string };
    if (!projectPath) return res.status(400).json({ error: 'projectPath is required' });
    const attached = attachGhazalToProject(projectPath, schedule || '0 * * * *');
    const projects = vault.addProject(attached.resolved);
    engine.configure(attached.resolved, attached.config.schedule);
    res.json({ attached, projects, state: engine.getState() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/projects', (req, res) => {
  res.json(vault.removeProject(req.body.projectPath));
});

app.get('/api/git', (_req, res) => {
  res.json(inspectGitRepo(engine.getState().projectPath));
});

// 4. Autonomous Oversight & Custom Schedules
app.get('/api/oversight/state', (_req, res) => {
  res.json({ ...engine.getState(), availableAgents: ALL_AGENTS });
});

app.post('/api/oversight/config', (req, res) => {
  engine.configure(req.body.projectPath, req.body.cronExpression);
  res.json(engine.getState());
});

app.post('/api/oversight/toggle', (req, res) => {
  req.body.enabled ? engine.start() : engine.stop();
  res.json(engine.getState());
});

app.post('/api/oversight/run', async (req, res) => {
  try {
    const run = await engine.runAudit({
      projectPath: req.body?.projectPath,
      agents: req.body?.agents,
      mode: req.body?.mode || 'full',
    });
    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/schedules', (_req, res) => res.json(store.state.schedules));

app.post('/api/schedules', (req, res) => {
  try {
    const job = engine.createSchedule(req.body);
    res.json(job);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/schedules/:id', (req, res) => {
  try {
    res.json(engine.toggleSchedule(req.params.id, Boolean(req.body.enabled)));
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/schedules/:id/run', async (req, res) => {
  try {
    res.json(await engine.executeScheduledJob(req.params.id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/schedules/:id', (req, res) => {
  engine.deleteSchedule(req.params.id);
  res.json({ ok: true });
});

// 5. Kanban Tasks & AI Auto-Fix Suggestions
app.get('/api/tasks', (_req, res) => res.json(store.state.tasks));

app.post('/api/tasks', (req, res) => {
  const now = new Date().toISOString();
  const task = {
    id: `task_${Date.now()}`,
    title: req.body.title,
    description: req.body.description || '',
    file: req.body.file || '',
    severity: req.body.severity || 'medium',
    agent: req.body.agent || 'MANUAL',
    status: req.body.status || 'todo',
    projectPath: req.body.projectPath || engine.getState().projectPath,
    createdAt: now,
    updatedAt: now,
  };
  store.state.tasks.unshift(task);
  store.save();
  res.json(task);
});

app.post('/api/tasks/promote', (req, res) => {
  const task = store.promoteFindingToTask(req.body.finding, req.body.projectPath || engine.getState().projectPath);
  res.json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const task = store.state.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.body.status) task.status = req.body.status;
  if (req.body.title) task.title = req.body.title;
  if (req.body.description !== undefined) task.description = req.body.description;
  task.updatedAt = new Date().toISOString();
  store.save();
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  store.state.tasks = store.state.tasks.filter((t) => t.id !== req.params.id);
  store.save();
  res.json({ ok: true });
});

app.post('/api/tasks/:id/autofix', async (req, res) => {
  const task = store.state.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  try {
    const result = await router.generate({
      systemPrompt:
        'You are GHAZAL Senior Patch Engineer. Provide a concise, concrete code fix and verification steps for the reported task.',
      userPrompt: `Task: ${task.title}\nSeverity: ${task.severity}\nFile: ${task.file || 'N/A'}\nDetails: ${task.description}`,
    });
    task.aiFixSuggestion = result.text;
    task.updatedAt = new Date().toISOString();
    store.recordMetric({
      timestamp: new Date().toISOString(),
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      approxTokens: Math.ceil(result.text.length / 4),
      purpose: 'autofix',
    });
    store.save();
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Context-Aware AI Codebase Chat
app.get('/api/chat/history', (_req, res) => res.json(store.state.chat));

app.delete('/api/chat/history', (_req, res) => {
  store.state.chat = [];
  store.save();
  res.json({ ok: true });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, includeProjectContext = true, providerOverride } = req.body;
    const projectPath = engine.getState().projectPath;
    let contextBlock = '';

    if (includeProjectContext) {
      const snap = scanProject(projectPath, 10, 1500);
      const latest = store.state.history[0];
      contextBlock = `\n[Active Project Context: ${projectPath}, ${snap.fileCount} files, latest health=${latest?.healthScore ?? 'N/A'}/100]\nFile tree sample: ${snap.tree.slice(0, 40).join(', ')}`;
    }

    const userMsg = {
      id: `msg_u_${Date.now()}`,
      role: 'user' as const,
      content: prompt,
      timestamp: new Date().toISOString(),
    };
    store.state.chat.push(userMsg);

    const result = await router.generate({
      systemPrompt:
        'You are GHAZAL v2.0, an elite engineering oversight agent. Be concise, actionable, and answer in the user language (Arabic or English).',
      userPrompt: `${prompt}${contextBlock}`,
      providerOverride,
    });

    const botMsg = {
      id: `msg_a_${Date.now()}`,
      role: 'assistant' as const,
      content: result.text,
      provider: `${result.provider}:${result.model}`,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString(),
    };
    store.state.chat.push(botMsg);
    store.state.chat = store.state.chat.slice(-80);
    store.recordMetric({
      timestamp: new Date().toISOString(),
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      approxTokens: Math.ceil((prompt.length + result.text.length) / 4),
      purpose: 'chat',
    });
    store.save();
    res.json({ userMsg, botMsg });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Analytics & Alerts
app.get('/api/analytics', (_req, res) => res.json(store.getAnalytics()));

app.get('/api/alerts', (_req, res) => res.json(store.state.alerts));

app.post('/api/alerts', (req, res) => {
  store.state.alerts = { ...store.state.alerts, ...req.body };
  store.save();
  res.json(store.state.alerts);
});

app.post('/api/alerts/test', async (_req, res) => {
  await notifier.sendTest(store.state.alerts);
  res.json({ ok: true });
});

// 8. Real-Time SSE Stream
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onLog = (data: unknown) => send('log', data);
  const onComplete = (data: unknown) => send('auditComplete', data);

  engine.on('log', onLog);
  engine.on('auditComplete', onComplete);

  req.on('close', () => {
    engine.off('log', onLog);
    engine.off('auditComplete', onComplete);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  const conn = auth.getConnectionInfo(PORT);
  console.log(`[GHAZAL v2.0] Server active on ${conn.localUrl}`);
  if (conn.lanUrls.length > 0) {
    console.log(`[GHAZAL v2.0] Mobile LAN Access: ${conn.lanUrls.join(', ')}`);
    console.log(`[GHAZAL v2.0] Mobile Pairing Token: ${conn.pairingToken}`);
  }
});
