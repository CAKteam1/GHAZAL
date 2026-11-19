import express from 'express';
import cors from 'cors';
import { KeyVault, ProviderId } from './security/vault.js';
import { MultiProviderRouter } from './providers/router.js';
import { OversightEngine } from './agents/oversight.js';
import { attachGhazalToProject } from './agents/scanner.js';

const app = express();
app.use(cors());
app.use(express.json());

const vault = new KeyVault();
const router = new MultiProviderRouter(vault);
const engine = new OversightEngine(router);

// 1. Provider & Auth Endpoints
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

// 2. Project Attachment & Multi-Project Registry
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
  const { projectPath } = req.body as { projectPath: string };
  res.json(vault.removeProject(projectPath));
});

// 3. Direct Multi-Provider Prompt Routing
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    const result = await router.generate({
      systemPrompt: systemPrompt || 'You are GHAZAL, an intelligent engineering oversight assistant.',
      userPrompt: prompt,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Autonomous Oversight Controls
app.get('/api/oversight/state', (_req, res) => res.json(engine.getState()));

app.post('/api/oversight/config', (req, res) => {
  const { projectPath, cronExpression } = req.body;
  engine.configure(projectPath, cronExpression);
  res.json(engine.getState());
});

app.post('/api/oversight/toggle', (req, res) => {
  req.body.enabled ? engine.start() : engine.stop();
  res.json(engine.getState());
});

app.post('/api/oversight/run', async (_req, res) => {
  try {
    const run = await engine.runAudit();
    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Real-Time Server-Sent Events (SSE)
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

const PORT = Number(process.env.PORT || 4747);
app.listen(PORT, () => console.log(`[GHAZAL] Server active on http://localhost:${PORT}`));
