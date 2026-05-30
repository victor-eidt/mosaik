import type { AppData, Folder, Prompt } from './types';

/** Backfill any fields added in later schema versions so old data stays valid. */
function normalize(data: AppData): AppData {
  return {
    version: data.version ?? CURRENT_VERSION,
    folders: data.folders,
    prompts: data.prompts.map((p) => ({
      ...p,
      notes: p.notes ?? '',
      tags: Array.isArray(p.tags) ? p.tags : [],
      favorite: Boolean(p.favorite),
      uses: typeof p.uses === 'number' ? p.uses : 0,
      folderId: p.folderId ?? null,
      imagePath: p.imagePath ?? null,
      links: Array.isArray(p.links) ? p.links : [],
      refLinks: Array.isArray(p.refLinks) ? p.refLinks : [],
    })),
  };
}

const STORAGE_KEY = 'mosaik:data:v1';
const CURRENT_VERSION = 1;

export function uid(): string {
  // Prefer the platform UUID when available, fall back to a random string.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function now(): string {
  return new Date().toISOString();
}

export function seed(): AppData {
  const ts = now();
  const writingFolder: Folder = { id: uid(), name: 'Writing', createdAt: ts };
  const codingFolder: Folder = { id: uid(), name: 'Coding', createdAt: ts };

  const prompts: Prompt[] = [
    {
      id: uid(),
      title: 'Concise summary',
      body:
        'Summarize the following text in 3 bullet points. Keep each bullet under 20 words and preserve the key numbers.\n\n"""\n{{text}}\n"""',
      notes: 'Good for distilling long articles. Replace {{text}}.',
      tags: ['summary', 'reusable'],
      folderId: writingFolder.id,
      imagePath: null,
      links: [],
      refLinks: [],
      favorite: true,
      uses: 0,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: uid(),
      title: 'Code reviewer',
      body:
        'You are a senior engineer. Review the code below for correctness, edge cases, and readability. List concrete issues with file:line references, then suggest fixes.\n\n```\n{{code}}\n```',
      notes: 'Paste a diff or a file into {{code}}.',
      tags: ['review', 'engineering'],
      folderId: codingFolder.id,
      imagePath: null,
      links: [],
      refLinks: [],
      favorite: false,
      uses: 0,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  return { version: CURRENT_VERSION, folders: [writingFolder, codingFolder], prompts };
}

export function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const data = seed();
      save(data);
      return data;
    }
    const parsed = JSON.parse(raw) as AppData;
    // Minimal shape guard.
    if (!parsed || !Array.isArray(parsed.folders) || !Array.isArray(parsed.prompts)) {
      return seed();
    }
    return normalize(parsed);
  } catch {
    return seed();
  }
}

/** Read existing local data WITHOUT seeding. Used to migrate into the cloud once. */
export function readLocal(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || !Array.isArray(parsed.folders) || !Array.isArray(parsed.prompts)) return null;
    return normalize(parsed);
  } catch {
    return null;
  }
}

/** Remove the legacy local copy after a successful migration so it can't double-import. */
export function clearLocal(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function save(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota or privacy mode — silently ignore; the app still works in-memory.
  }
}

export function exportData(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `prompts-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse + validate an imported JSON file. Throws on malformed input. */
export function parseImport(text: string): AppData {
  const parsed = JSON.parse(text) as AppData;
  if (!parsed || !Array.isArray(parsed.folders) || !Array.isArray(parsed.prompts)) {
    throw new Error('File does not look like a mosaik export.');
  }
  return normalize(parsed);
}
