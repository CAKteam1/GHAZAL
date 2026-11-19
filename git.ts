import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface GitStatusSummary {
  isGitRepo: boolean;
  branch: string;
  changedFiles: string[];
  recentCommits: { hash: string; message: string; date: string }[];
}

function runGit(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

export function inspectGitRepo(projectPath: string): GitStatusSummary {
  const gitDir = path.join(projectPath, '.git');
  if (!fs.existsSync(gitDir)) {
    return { isGitRepo: false, branch: 'none', changedFiles: [], recentCommits: [] };
  }

  try {
    const branch = runGit('git rev-parse --abbrev-ref HEAD', projectPath) || 'main';
    const statusRaw = runGit('git status --porcelain', projectPath);
    const changedFiles = statusRaw
      ? statusRaw
          .split('\n')
          .map((line) => line.slice(3).trim())
          .filter(Boolean)
      : [];

    const logRaw = runGit('git log -n 5 --pretty=format:%h|%s|%cr', projectPath);
    const recentCommits = logRaw
      ? logRaw.split('\n').map((line) => {
          const [hash, message, date] = line.split('|');
          return { hash: hash || '', message: message || '', date: date || '' };
        })
      : [];

    return { isGitRepo: true, branch, changedFiles, recentCommits };
  } catch {
    return { isGitRepo: false, branch: 'unknown', changedFiles: [], recentCommits: [] };
  }
}

export function getGitDiffText(projectPath: string, maxChars = 14000): string {
  try {
    const diff = runGit('git diff HEAD', projectPath);
    return diff.slice(0, maxChars);
  } catch {
    return '';
  }
}
