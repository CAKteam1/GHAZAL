import { useState, useEffect } from 'react';
import { FolderGit2, FolderPlus, FolderOpen } from 'lucide-react';
import { apiFetch } from '../lib/api';

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
  onRefresh: () => void;
}

export function ProjectAttacher({ activePath, projects, onRefresh }: Props) {
  const [inputPath, setInputPath] = useState(activePath);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    setInputPath(activePath);
  }, [activePath]);

  async function browseFolder() {
    if (window.ghazalDesktop?.selectFolder) {
      const picked = await window.ghazalDesktop.selectFolder();
      if (picked) setInputPath(picked);
    }
  }

  async function attachProject(target = inputPath) {
    if (!target.trim()) return;
    setStatusMsg('Attaching...');
    try {
      const data = await apiFetch('/api/projects/attach', {
        method: 'POST',
        body: JSON.stringify({ projectPath: target }),
      });
      setInputPath(data.attached.resolved);
      setStatusMsg('Attached (.ghazal.json & reports ready)');
      onRefresh();
    } catch (err: any) {
      setStatusMsg(err.message);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-[var(--accent-brown)]">
        <FolderGit2 size={14} /> Project Folder Integration
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
          className="flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 font-mono text-xs outline-none focus:border-[var(--accent-brown)]"
          placeholder="/path/to/any/project-folder"
        />
        <div className="flex gap-2">
          {window.ghazalDesktop && (
            <button
              onClick={browseFolder}
              className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3 py-2 text-[var(--ink-black)]"
            >
              <FolderOpen size={15} />
            </button>
          )}
          <button
            onClick={() => attachProject()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--ink-black)] px-4 py-2 text-xs font-semibold uppercase text-[var(--bg-matte)]"
          >
            <FolderPlus size={14} /> Attach
          </button>
        </div>
      </div>

      {statusMsg && <p className="mb-2 text-[11px] text-[var(--accent-brown)]">{statusMsg}</p>}

      {projects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {projects.map((p) => (
            <button
              key={p.path}
              onClick={() => attachProject(p.path)}
              className={`rounded-full border px-3 py-1 text-[11px] transition ${
                p.path === activePath
                  ? 'border-[var(--accent-brown)] bg-[var(--accent-brown)] text-white'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-matte)] text-[var(--ink-black)]'
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
