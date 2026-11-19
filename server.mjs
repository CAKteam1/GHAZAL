#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4747);
const DIST_DIR = path.join(__dirname, 'dist');
const DB_FILE = path.join(os.homedir(), '.ghazal-studio-db.json');

const defaultDB = {
  aiAccounts: {
    gemini: { loggedIn: false, email: '', plan: 'Gemini Advanced', mode: 'web_session', apiKey: '' },
    chatgpt: { loggedIn: false, email: '', plan: 'ChatGPT Plus', mode: 'web_session', apiKey: '' },
    claude: { loggedIn: false, email: '', plan: 'Claude Pro', mode: 'web_session', apiKey: '' }
  },
  activeProvider: 'gemini',
  members: [
    { id: 'm1', name: 'المدير التنفيذي', role: 'Owner', status: 'online', avatar: 'غ' },
    { id: 'm2', name: 'سارة — محتوى وتسويق', role: 'Social Lead', status: 'online', avatar: 'س' }
  ],
  teamChat: [
    { id: 'c1', sender: 'المدير التنفيذي', role: 'Owner', text: 'مرحباً بالفريق في استوديو غزال! تم ربط حسابات الذكاء الاصطناعي والمنصات.', time: '18:30' }
  ],
  socialChannels: [
    { id: 'instagram', name: 'Instagram', handle: '@ghazal.studio', connected: true, autoReply: true, autoPost: true, followers: '24.8K', pendingDMs: 5 },
    { id: 'facebook', name: 'Facebook Page', handle: 'Ghazal AI Studio', connected: true, autoReply: true, autoPost: false, followers: '41.2K', pendingDMs: 3 },
    { id: 'youtube', name: 'YouTube Channel', handle: '@GhazalMotion', connected: false, autoReply: false, autoPost: false, followers: '12.5K', pendingDMs: 0 },
    { id: 'gmail', name: 'Gmail Workspace', handle: 'team@ghazal.ai', connected: true, autoReply: true, autoPost: false, followers: 'Inbox Zero', pendingDMs: 8 }
  ],
  socialQueue: [
    { id: 'sq1', platform: 'instagram', type: 'Reel / Carousel', content: 'إطلاق تحديث استوديو غزال v3.0 بتصميم زجاجي دافئ وإدارة تلقائية للمنصات.', status: 'scheduled', time: 'اليوم 21:00' },
    { id: 'sq2', platform: 'gmail', type: 'Auto-Reply Draft', content: 'شكراً لتواصلكم مع فريق غزال، تم استلام طلبكم وسيتم الرد بالتفاصيل خلال دقائق.', status: 'ready', time: 'فوري' }
  ],
  audits: []
};

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) return { ...defaultDB, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
  } catch {}
  return JSON.parse(JSON.stringify(defaultDB));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const db = loadDB();

  if (url.pathname === '/api/state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ ...db, cwd: process.cwd() }));
  }

  if (url.pathname === '/api/state' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const next = { ...db, ...JSON.parse(body || '{}') };
        saveDB(next);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(next));
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Serve built Vite SPA if available
  let filePath = path.join(DIST_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    return res.end(fs.readFileSync(filePath));
  }
  if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(DIST_DIR, 'index.html')));
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('GHAZAL Studio API Active. Run `npm run build` or `npm run dev`.');
});

server.listen(PORT, '0.0.0.0', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n🦌 GHAZAL Studio v3.0 Active -> ${url}\n`);
  const cmd = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `termux-open-url ${url} 2>/dev/null || xdg-open ${url} 2>/dev/null || true`;
  exec(cmd);
});
