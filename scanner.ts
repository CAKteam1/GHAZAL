import fs from 'fs';
import path from 'path';

const DEFAULT_IGNORED = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.ghazal', 'ghazal'];
const ALLOWED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.cs', '.php', '.json', '.md', '.yml', '.yaml']);

export interface ProjectConfig {
  projectName: string;
  schedule: string;
  saveReportsToProject: boolean;
  ignore: string[];
}

export interface ProjectSnapshot {
  rootPath: string;
  config: ProjectConfig;
  fileCount: number;
  tree: string[];
  samples: { file: string; snippet: string }[];
}

export function loadProjectConfig(rootPath: string): ProjectConfig {
  const cfgPath = path.join(rootPath, '.ghazal.json');
  const fallback: ProjectConfig = {
    projectName: path.basename(rootPath),
    schedule: '0 * * * *',
    saveReportsToProject: true,
    ignore: DEFAULT_IGNORED,
  };
  if (!fs.existsSync(cfgPath)) return fallback;
  try {
    return { ...fallback, ...JSON.parse(fs.readFileSync(cfgPath, 'utf8')) };
  } catch {
    return fallback;
  }
}

export function attachGhazalToProject(rootPath: string, schedule = '0 * * * *') {
  const resolved = path.resolve(rootPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Invalid project folder: ${resolved}`);
  }

  const configPath = path.join(resolved, '.ghazal.json');
  const reportsDir = path.join(resolved, '.ghazal', 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const config: ProjectConfig = {
    projectName: path.basename(resolved),
    schedule,
    saveReportsToProject: true,
    ignore: DEFAULT_IGNORED,
  };

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  }

  return { resolved, configPath, reportsDir, config };
}

export function scanProject(rootPath: string, maxFiles = 30, maxBytesPerFile = 4000): ProjectSnapshot {
  const config = loadProjectConfig(rootPath);
  const ignoredSet = new Set(config.ignore || DEFAULT_IGNORED);
  const tree: string[] = [];
  const samples: { file: string; snippet: string }[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignoredSet.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(rootPath, fullPath);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        tree.push(relPath);
        if (samples.length < maxFiles && ALLOWED_EXTS.has(path.extname(entry.name))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8').slice(0, maxBytesPerFile);
            samples.push({ file: relPath, snippet: content });
          } catch {
            // Skip unreadable files
          }
        }
      }
    }
  }

  walk(rootPath);
  return { rootPath, config, fileCount: tree.length, tree: tree.slice(0, 200), samples };
}
