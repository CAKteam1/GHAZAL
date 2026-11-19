import { useState } from 'react';
import { FolderGit2, FolderPlus, FolderOpen } from 'lucide-react';

declare global {
  interface Window {
    ghazalDesktop?: {
      selectFolder: () => Promise<string | null>;
    };
  }
}

interface AttachedProject {
  name: string;
  path: string;
  attachedAt: string;
}

interface Props {
  activePath: string;
  projects: AttachedProject[];
  healthScore?: number;
  onRefresh: () => void;
}

export function ProjectAttacher({ activePath, projects, healthScore, onRefresh }: Props) {
  const [inputPath, setInputPath] = useState(activePath);
  const [statusMsg, setStatusMsg] = useState('');

  async function browseFolder() {
    if (window.ghazalDesktop?.selectFolder) {
      const picked = await window.ghazalDesktop.selectFolder();
      if (picked) setInputPath(picked);
    }
  }

  async function attachProject(target = inputPath) {
    if (!target.trim()) return;
    setStatusMsg('Attaching...');
    const res = await fetch('http://localhost:4747/api/projects/attach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath: target }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(data.error || 'Failed to attach folder');
      return;
    }
    setInputPath(data.attached.resolved);
    setStatusMsg('Attached (.ghazal.json & reports ready)');
    onRefresh();
  }

  return (
    <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-[var(--accent-brown)]">
          <FolderGit2 size={14} /> Project Folder Integration
        </div>
        <span className="text-xs font-semibold text-[var(--ink-black)]">
          Health: {healthScore !== undefined ? `${healthScore}/100` : '—'}
        </span>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
          className="flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 font-mono text-xs outline-none focus:border-[var(--accent-brown)]"
          placeholder="/path/to/any/project-folder"
        />
        {window.ghazalDesktop && (
          <button
            onClick={browseFolder}
            title="Browse folder"
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3 py-2 text-[var(--ink-black)] hover:border-[var(--accent-brown)]"
          >
            <FolderOpen size={15} />
          </button>
        )}
        <button
          onClick={() => attachProject()}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--ink-black)] px-3.5 py-2 text-xs font-semibold tracking-wider uppercase text-white transition hover:bg-[var(--accent-brown)]"
        >
          <FolderPlus size={14} /> Attach
        </button>
      </div>

      {statusMsg && <p className="mb-3 text-[11px] text-[var(--accent-brown)]">{statusMsg}</p>}

      {projects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {projects.map((p) => (
            <button
              key={p.path}
              onClick={() => attachProject(p.path)}
              className={`rounded-full border px-3 py-1 text-[11px] transition ${
                p.path === activePath
                  ? 'border-[var(--accent-brown)] bg-[var(--accent-brown)] text-white'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-matte)] text-[var(--ink-black)] hover:border-[var(--accent-brown)]'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
