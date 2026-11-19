import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

export type ProviderId = 'gemini' | 'claude' | 'openai';

export interface AttachedProject {
  name: string;
  path: string;
  attachedAt: string;
}

interface VaultData {
  activeProvider: ProviderId;
  models: Record<ProviderId, string>;
  keys: Partial<Record<ProviderId, string>>;
  projects: AttachedProject[];
}

const VAULT_DIR = path.join(os.homedir(), '.ghazal');
const VAULT_FILE = path.join(VAULT_DIR, 'vault.enc');

const MASTER_KEY = crypto
  .createHash('sha256')
  .update(process.env.GHAZAL_VAULT_SECRET || `${os.hostname()}-${os.userInfo().username}-ghazal`)
  .digest();

export class KeyVault {
  private data: VaultData = {
    activeProvider: 'gemini',
    models: {
      gemini: 'gemini-2.5-pro',
      claude: 'claude-sonnet-4-20250514',
      openai: 'gpt-4o',
    },
    keys: {},
    projects: [],
  };

  constructor() {
    this.load();
  }

  private load() {
    if (!fs.existsSync(VAULT_FILE)) return;
    try {
      const payload = JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8'));
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        MASTER_KEY,
        Buffer.from(payload.iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(payload.content, 'hex')),
        decipher.final(),
      ]);
      this.data = { ...this.data, ...JSON.parse(decrypted.toString('utf8')) };
    } catch {
      console.warn('[GHAZAL Vault] Could not decrypt existing vault. Starting fresh.');
    }
  }

  private save() {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(this.data), 'utf8'),
      cipher.final(),
    ]);
    const payload = {
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex'),
      content: encrypted.toString('hex'),
    };
    fs.writeFileSync(VAULT_FILE, JSON.stringify(payload), { mode: 0o600 });
  }

  setProviderKey(provider: ProviderId, apiKey: string, model?: string) {
    this.data.keys[provider] = apiKey.trim();
    if (model) this.data.models[provider] = model;
    this.save();
  }

  setActiveProvider(provider: ProviderId) {
    this.data.activeProvider = provider;
    this.save();
  }

  getActiveConfig() {
    const provider = this.data.activeProvider;
    return {
      provider,
      apiKey: this.data.keys[provider],
      model: this.data.models[provider],
    };
  }

  addProject(projectPath: string) {
    const normalized = path.resolve(projectPath);
    const exists = this.data.projects.find((p) => p.path === normalized);
    if (!exists) {
      this.data.projects.unshift({
        name: path.basename(normalized),
        path: normalized,
        attachedAt: new Date().toISOString(),
      });
      this.save();
    }
    return this.data.projects;
  }

  removeProject(projectPath: string) {
    const normalized = path.resolve(projectPath);
    this.data.projects = this.data.projects.filter((p) => p.path !== normalized);
    this.save();
    return this.data.projects;
  }

  getProjects() {
    return this.data.projects;
  }

  getPublicStatus() {
    return {
      activeProvider: this.data.activeProvider,
      models: this.data.models,
      configured: {
        gemini: Boolean(this.data.keys.gemini),
        claude: Boolean(this.data.keys.claude),
        openai: Boolean(this.data.keys.openai),
      },
    };
  }
}
