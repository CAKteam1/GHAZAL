export interface ProjectSnapshot {
  sourceLabel: string;
  fileCount: number;
  tree: string[];
  samples: { file: string; snippet: string }[];
}

const IGNORED = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.ghazal']);
const ALLOWED_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.kt', '.swift',
  '.dart', '.php', '.rb', '.cs', '.cpp', '.c', '.h', '.json', '.md', '.yml', '.yaml', '.html', '.css'
]);

function hasAllowedExt(filename: string): boolean {
  const idx = filename.lastIndexOf('.');
  if (idx === -1) return false;
  return ALLOWED_EXTS.has(filename.slice(idx).toLowerCase());
}

function isIgnoredPath(relPath: string): boolean {
  return relPath.split('/').some((part) => IGNORED.has(part));
}

// Scan directly from public GitHub repo URL (works on any phone without local files!)
export async function scanGitHubRepo(repoInput: string, githubToken?: string): Promise<ProjectSnapshot> {
  const cleaned = repoInput
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');

  const [owner, repo] = cleaned.split('/');
  if (!owner || !repo) {
    throw new Error('أدخل رابط GitHub صحيح مثل: https://github.com/user/repo أو user/repo');
  }

  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (githubToken?.trim()) headers.Authorization = `Bearer ${githubToken.trim()}`;

  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  const repoData = await repoRes.json();
  if (!repoRes.ok) throw new Error(repoData.message || 'تعذر الوصول إلى مستودع GitHub');

  const branch = repoData.default_branch || 'main';
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers }
  );
  const treeData = await treeRes.json();
  if (!treeRes.ok) throw new Error(treeData.message || 'تعذر قراءة شجرة ملفات المستودع');

  const blobs = (treeData.tree || []).filter(
    (item: any) => item.type === 'blob' && !isIgnoredPath(item.path)
  );

  const tree = blobs.map((b: any) => b.path).slice(0, 200);
  const codeCandidates = blobs.filter((b: any) => hasAllowedExt(b.path)).slice(0, 14);

  const samples: { file: string; snippet: string }[] = [];
  await Promise.all(
    codeCandidates.map(async (item: any) => {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${item.path}`;
        const r = await fetch(rawUrl);
        if (r.ok) {
          const txt = await r.text();
          samples.push({ file: item.path, snippet: txt.slice(0, 3000) });
        }
      } catch {
        // Ignore individual file fetch failure
      }
    })
  );

  return {
    sourceLabel: `github:${owner}/${repo}@${branch}`,
    fileCount: blobs.length,
    tree,
    samples,
  };
}

// Scan from <input type="file" webkitdirectory> directly on Phone or PC!
export async function scanLocalFileList(fileList: FileList): Promise<ProjectSnapshot> {
  const allFiles = Array.from(fileList).filter((f) => {
    const rel = (f as any).webkitRelativePath || f.name;
    return !isIgnoredPath(rel);
  });

  const tree = allFiles.map((f) => (f as any).webkitRelativePath || f.name).slice(0, 200);
  const rootFolder = tree[0]?.split('/')[0] || 'local-project';

  const codeFiles = allFiles.filter((f) => hasAllowedExt(f.name)).slice(0, 18);
  const samples: { file: string; snippet: string }[] = [];

  for (const file of codeFiles) {
    try {
      const text = await file.text();
      samples.push({
        file: (file as any).webkitRelativePath || file.name,
        snippet: text.slice(0, 3000),
      });
    } catch {
      // Skip binary/unreadable file
    }
  }

  return {
    sourceLabel: `folder:${rootFolder}`,
    fileCount: allFiles.length,
    tree,
    samples,
  };
}
