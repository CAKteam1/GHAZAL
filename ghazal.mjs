#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GHAZAL_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const command = args[0] || 'help';
const targetArg = args[1] || process.cwd();
const targetDir = path.resolve(targetArg);

function createProjectConfig(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`[GHAZAL] Error: Directory does not exist -> ${dir}`);
    process.exit(1);
  }

  const configPath = path.join(dir, '.ghazal.json');
  const reportsDir = path.join(dir, '.ghazal', 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const defaultConfig = {
    projectName: path.basename(dir),
    schedule: '0 * * * *',
    saveReportsToProject: true,
    ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.ghazal', 'ghazal'],
    agents: ['SECURITY_SENTINEL', 'CODE_HEALTH', 'TASK_DELEGATOR']
  };

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
    console.log(`[GHAZAL] Created .ghazal.json inside: ${dir}`);
  } else {
    console.log(`[GHAZAL] Existing .ghazal.json found in: ${dir}`);
  }

  // Create a convenient drop-in launcher script inside the project's .ghazal folder
  const launcherSh = path.join(dir, '.ghazal', 'start-ghazal.sh');
  fs.writeFileSync(
    launcherSh,
    `#!/usr/bin/env bash\nGHAZAL_PROJECT_PATH="${dir}" npm --prefix "${GHAZAL_ROOT}" run dev\n`,
    { mode: 0o755 }
  );

  const launcherBat = path.join(dir, '.ghazal', 'start-ghazal.bat');
  fs.writeFileSync(
    launcherBat,
    `@echo off\r\nset GHAZAL_PROJECT_PATH=${dir}\r\nnpm --prefix "${GHAZAL_ROOT}" run dev\r\n`,
    'utf8'
  );

  console.log(`[GHAZAL] Drop-in launchers added at: ${path.join(dir, '.ghazal')}`);
}

if (command === 'init' || command === 'attach') {
  createProjectConfig(targetDir);
  console.log(`[GHAZAL] Project successfully attached! Run "ghazal start \"${targetDir}\"" to begin oversight.`);
} else if (command === 'start' || command === 'watch') {
  createProjectConfig(targetDir);
  console.log(`[GHAZAL] Launching GHAZAL Oversight for: ${targetDir}`);
  const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    cwd: GHAZAL_ROOT,
    stdio: 'inherit',
    env: { ...process.env, GHAZAL_PROJECT_PATH: targetDir }
  });
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  console.log(`
GHAZAL AI Agent — Intelligent Project Oversight CLI

Usage:
  ghazal attach [project-path]   Attach GHAZAL (.ghazal.json + launchers) to any project folder
  ghazal start  [project-path]   Attach & start the GHAZAL dashboard for that project folder
  ghazal init                    Initialize GHAZAL inside the current working directory

Examples:
  ghazal attach ./my-saas-app
  ghazal start /Users/dev/projects/my-app
`);
}
