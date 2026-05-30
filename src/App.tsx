import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DownloadSimple,
  Key,
  List,
  MagnifyingGlass,
  Moon,
  Plus,
  SignOut,
  Sun,
  X,
} from '@phosphor-icons/react';
import type { Session } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import PromptCard from './components/PromptCard';
import PromptEditor, { type DraftPrompt } from './components/PromptEditor';
import VariableFiller from './components/VariableFiller';
import Auth from './components/Auth';
import ChangePassword from './components/ChangePassword';
import LandingSpace from './components/LandingSpace';
import UiSpace from './components/UiSpace';
import TweetSpace from './components/TweetSpace';
import { useToast } from './components/Toast';
import { supabase, isConfigured } from './lib/supabase';
import * as db from './lib/db';
import { exportData, readLocal, clearLocal, seed } from './storage';
import { extractVars } from './lib/template';
import type { AppData, Prompt, SelectedView, Space } from './types';
import { VIEW_ALL, VIEW_FAVORITES, VIEW_UNCATEGORIZED } from './types';

type SortKey = 'updated' | 'created' | 'title' | 'uses';

const EMPTY: AppData = { version: 1, folders: [], prompts: [] };

export default function App() {
  const toast = useToast();

  // ---- Auth + remote data --------------------------------------------------
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<AppData>(EMPTY);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // ---- UI state ------------------------------------------------------------
  const [space, setSpace] = useState<Space>('prompts');
  const [selected, setSelected] = useState<SelectedView>(VIEW_ALL);
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>('updated');
  const [editing, setEditing] = useState<{ prompt: Prompt | null } | null>(null);
  const [filling, setFilling] = useState<Prompt | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('mosaik:theme') as 'dark' | 'light') || 'dark'
  );
  const searchInput = useRef<HTMLInputElement>(null);

  // ---- Theme ---------------------------------------------------------------
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('mosaik:theme', theme);
  }, [theme]);

  // ---- Auth session --------------------------------------------------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---- Load remote data (and one-time seed/migrate on first login) ---------
  useEffect(() => {
    if (!session) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        let { folders, prompts } = await db.fetchAll();
        if (folders.length === 0 && prompts.length === 0) {
          const local = readLocal();
          const migrating = Boolean(local && local.prompts.length);
          const source = migrating ? (local as AppData) : seed();
          await db.bulkImport(
            source.folders.map((f) => ({ id: f.id, name: f.name })),
            source.prompts.map((p) => ({
              title: p.title,
              body: p.body,
              notes: p.notes,
              tags: p.tags,
              folderId: p.folderId,
              imagePath: p.imagePath ?? null,
              links: p.links ?? [],
              refLinks: p.refLinks ?? [],
              favorite: p.favorite,
              uses: p.uses,
            }))
          );
          if (migrating) clearLocal();
          ({ folders, prompts } = await db.fetchAll());
          if (!cancelled && migrating) {
            toast(`Imported ${source.prompts.length} prompts from this browser`);
          }
        }
        if (!cancelled) {
          setData({ version: 1, folders, prompts });
          const paths = prompts.map((p) => p.imagePath).filter((p): p is string => Boolean(p));
          if (paths.length) {
            const urls = await db.signedUrls(paths);
            if (!cancelled) setImageUrls(urls);
          }
        }
      } catch (e) {
        if (!cancelled) toast(`Could not load prompts: ${(e as Error).message}`, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  // ---- Keyboard shortcuts --------------------------------------------------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!session) return;
      const el = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput.current?.focus();
        return;
      }
      if (typing) return;
      if (e.key === '/') {
        e.preventDefault();
        searchInput.current?.focus();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditing({ prompt: null });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session]);

  const folderName = (id: string | null) =>
    id ? data.folders.find((f) => f.id === id)?.name ?? null : null;

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      [VIEW_ALL]: data.prompts.length,
      [VIEW_FAVORITES]: data.prompts.filter((p) => p.favorite).length,
      [VIEW_UNCATEGORIZED]: data.prompts.filter((p) => !p.folderId).length,
    };
    for (const f of data.folders) c[f.id] = data.prompts.filter((p) => p.folderId === f.id).length;
    return c;
  }, [data]);

  const visible = useMemo(() => {
    let list = data.prompts;
    if (selected === VIEW_FAVORITES) list = list.filter((p) => p.favorite);
    else if (selected === VIEW_UNCATEGORIZED) list = list.filter((p) => !p.folderId);
    else if (selected !== VIEW_ALL) list = list.filter((p) => p.folderId === selected);

    if (activeTags.length) list = list.filter((p) => activeTags.every((t) => p.tags.includes(t)));

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        [p.title, p.body, p.notes, ...p.tags].join(' ').toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'created') return b.createdAt.localeCompare(a.createdAt);
      if (sort === 'uses') return b.uses - a.uses;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return sorted;
  }, [data.prompts, selected, query, sort, activeTags]);

  // ---- Folder mutations ----------------------------------------------------
  async function addFolder(name: string) {
    try {
      const f = await db.createFolder(name);
      setData((d) => ({ ...d, folders: [...d.folders, f] }));
      toast(`Folder "${name}" created`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }
  async function renameFolder(id: string, name: string) {
    setData((d) => ({ ...d, folders: d.folders.map((f) => (f.id === id ? { ...f, name } : f)) }));
    try {
      await db.renameFolder(id, name);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }
  async function deleteFolder(id: string) {
    try {
      await db.deleteFolder(id);
      setData((d) => ({
        ...d,
        folders: d.folders.filter((f) => f.id !== id),
        prompts: d.prompts.map((p) => (p.folderId === id ? { ...p, folderId: null } : p)),
      }));
      if (selected === id) setSelected(VIEW_ALL);
      toast('Folder deleted', 'info');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  // ---- Prompt mutations ----------------------------------------------------
  /** Make a fresh signed URL available for a just-saved image path. */
  async function refreshImageUrl(path: string | null) {
    if (!path || imageUrls[path]) return;
    const url = await db.signedUrl(path);
    if (url) setImageUrls((m) => ({ ...m, [path]: url }));
  }

  async function savePrompt(draft: DraftPrompt) {
    const prev = editing?.prompt ?? null;
    try {
      if (prev) {
        const updated = await db.updatePrompt(prev.id, draft);
        setData((d) => ({
          ...d,
          prompts: d.prompts.map((p) => (p.id === updated.id ? updated : p)),
        }));
        // The image changed or was removed: drop the old file from storage.
        if (prev.imagePath && prev.imagePath !== draft.imagePath) {
          db.deleteImage(prev.imagePath);
        }
        toast('Prompt updated');
      } else {
        const created = await db.createPrompt(draft);
        setData((d) => ({ ...d, prompts: [created, ...d.prompts] }));
        toast('Prompt created');
      }
      await refreshImageUrl(draft.imagePath);
      setEditing(null);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }
  async function deletePrompt(id: string) {
    const target = data.prompts.find((p) => p.id === id);
    try {
      await db.deletePrompt(id);
      if (target?.imagePath) db.deleteImage(target.imagePath);
      setData((d) => ({ ...d, prompts: d.prompts.filter((p) => p.id !== id) }));
      toast('Prompt deleted', 'info');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }
  async function duplicatePrompt(p: Prompt) {
    try {
      // The copy starts without the image, since the storage file is owned by the
      // original (deleting either prompt must not break the other's image).
      const created = await db.createPrompt({
        title: `${p.title || 'Untitled'} (copy)`,
        body: p.body,
        notes: p.notes,
        tags: p.tags,
        folderId: p.folderId,
        imagePath: null,
        links: p.links,
        refLinks: p.refLinks,
      });
      setData((d) => ({ ...d, prompts: [created, ...d.prompts] }));
      toast('Prompt duplicated');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }
  async function toggleFavorite(id: string) {
    const current = data.prompts.find((p) => p.id === id);
    if (!current) return;
    const favorite = !current.favorite;
    setData((d) => ({
      ...d,
      prompts: d.prompts.map((p) => (p.id === id ? { ...p, favorite } : p)),
    }));
    try {
      await db.updatePrompt(id, { favorite });
    } catch (e) {
      // revert on failure
      setData((d) => ({
        ...d,
        prompts: d.prompts.map((p) => (p.id === id ? { ...p, favorite: !favorite } : p)),
      }));
      toast((e as Error).message, 'error');
    }
  }

  // ---- Copy flow -----------------------------------------------------------
  function requestCopy(p: Prompt) {
    if (extractVars(p.body).length > 0) setFilling(p);
    else writeClipboard(p, p.body);
  }
  async function writeClipboard(p: Prompt, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard');
      const uses = p.uses + 1;
      setData((d) => ({
        ...d,
        prompts: d.prompts.map((x) => (x.id === p.id ? { ...x, uses } : x)),
      }));
      db.updatePrompt(p.id, { uses }).catch(() => {/* non-critical counter */});
    } catch {
      toast('Could not access the clipboard', 'error');
    }
    setFilling(null);
  }

  function toggleTag(tag: string) {
    setActiveTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSelected(VIEW_ALL);
    setActiveTags([]);
    toast('Signed out', 'info');
  }

  // ---- Render gates --------------------------------------------------------
  if (!isConfigured) {
    return (
      <div className="center-screen">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="brand-mark">&gt;_</span>
            <span>mosaik</span>
          </div>
          <h1 className="auth-title">Setup needed</h1>
          <p className="auth-sub">
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your
            environment (a local <code>.env.local</code> file, and the Vercel project settings),
            then reload.
          </p>
        </div>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) return <Auth />;

  const defaultFolderForNew =
    selected !== VIEW_ALL && selected !== VIEW_FAVORITES && selected !== VIEW_UNCATEGORIZED
      ? selected
      : null;

  const heading =
    selected === VIEW_ALL
      ? 'All prompts'
      : selected === VIEW_FAVORITES
        ? 'Favorites'
        : selected === VIEW_UNCATEGORIZED
          ? 'Uncategorized'
          : folderName(selected) ?? 'Folder';

  function selectView(v: SelectedView) {
    setSelected(v);
    setNavOpen(false);
  }

  function changeSpace(s: Space) {
    setSpace(s);
    setSelected(VIEW_ALL);
    setActiveTags([]);
    setQuery('');
    setNavOpen(false);
  }

  return (
    <div className="app">
      <Sidebar
        space={space}
        onSpaceChange={changeSpace}
        folders={data.folders}
        selected={selected}
        counts={counts}
        open={navOpen}
        onSelect={selectView}
        onAddFolder={addFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={deleteFolder}
        onClose={() => setNavOpen(false)}
      />

      <main className="main">
        {space === 'landing' ? (
          <LandingSpace favoritesOnly={selected === VIEW_FAVORITES} onMenu={() => setNavOpen(true)} />
        ) : space === 'ui' ? (
          <UiSpace favoritesOnly={selected === VIEW_FAVORITES} onMenu={() => setNavOpen(true)} />
        ) : space === 'tweets' ? (
          <TweetSpace favoritesOnly={selected === VIEW_FAVORITES} onMenu={() => setNavOpen(true)} />
        ) : (
          <>
        <header className="toolbar">
          <div className="toolbar-left">
            <button className="icon-btn mobile-only" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <List size={20} />
            </button>
            <h1 className="view-title">{heading}</h1>
            <span className="view-count">{visible.length}</span>
          </div>

          <div className="toolbar-right">
            <div className="search-wrap">
              <MagnifyingGlass size={15} className="search-icon" />
              <input
                ref={searchInput}
                className="search"
                type="search"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <kbd className="search-kbd">/</kbd>
            </div>
            <select className="sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="updated">Recently updated</option>
              <option value="created">Recently created</option>
              <option value="title">Title A–Z</option>
              <option value="uses">Most used</option>
            </select>
            <button className="btn primary" onClick={() => setEditing({ prompt: null })}>
              <Plus size={16} weight="bold" />
              <span className="btn-label">New</span>
            </button>
          </div>
        </header>

        {activeTags.length > 0 && (
          <div className="filter-bar">
            <span className="filter-label">Filtering by</span>
            {activeTags.map((t) => (
              <button key={t} className="tag active" onClick={() => toggleTag(t)}>
                {t}
                <X size={11} weight="bold" />
              </button>
            ))}
            <button className="link-btn" onClick={() => setActiveTags([])}>
              Clear
            </button>
          </div>
        )}

        <div className="content">
          {loading ? (
            <div className="grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card skeleton" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="empty-state">
              <div className="empty-glyph">&gt;_</div>
              <p className="empty-title">
                {query || activeTags.length ? 'Nothing matches your filters' : 'No prompts here yet'}
              </p>
              <p className="empty-sub">
                {query || activeTags.length
                  ? 'Try a different search or clear the filters.'
                  : 'Create your first prompt and it will show up here.'}
              </p>
              <button className="btn primary" onClick={() => setEditing({ prompt: null })}>
                <Plus size={16} weight="bold" />
                New prompt
              </button>
            </div>
          ) : (
            <div className="grid">
              {visible.map((p) => (
                <PromptCard
                  key={p.id}
                  prompt={p}
                  folderName={folderName(p.folderId)}
                  imageUrl={p.imagePath ? imageUrls[p.imagePath] ?? null : null}
                  activeTags={activeTags}
                  onEdit={() => setEditing({ prompt: p })}
                  onDelete={() => deletePrompt(p.id)}
                  onDuplicate={() => duplicatePrompt(p)}
                  onToggleFavorite={() => toggleFavorite(p.id)}
                  onCopy={() => requestCopy(p)}
                  onTagClick={toggleTag}
                />
              ))}
            </div>
          )}
        </div>
          </>
        )}

        <footer className="app-foot">
          <button className="btn ghost sm" onClick={() => exportData(data)} title="Download a JSON backup">
            <DownloadSimple size={15} />
            Backup
          </button>
          <span className="foot-spacer" />
          <span className="foot-note">{session.user.email}</span>
          <button
            className="icon-btn"
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="icon-btn" title="Change password" onClick={() => setChangingPassword(true)}>
            <Key size={17} />
          </button>
          <button className="icon-btn" title="Sign out" onClick={signOut}>
            <SignOut size={17} />
          </button>
        </footer>
      </main>

      {editing && (
        <PromptEditor
          prompt={editing.prompt}
          folders={data.folders}
          defaultFolderId={defaultFolderForNew}
          initialImageUrl={
            editing.prompt?.imagePath ? imageUrls[editing.prompt.imagePath] ?? null : null
          }
          onSave={savePrompt}
          onClose={() => setEditing(null)}
        />
      )}

      {filling && (
        <VariableFiller
          prompt={filling}
          vars={extractVars(filling.body)}
          onCopy={(rendered) => writeClipboard(filling, rendered)}
          onClose={() => setFilling(null)}
        />
      )}

      {changingPassword && <ChangePassword onClose={() => setChangingPassword(false)} />}
    </div>
  );
}
