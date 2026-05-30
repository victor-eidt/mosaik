import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowSquareOut,
  GlobeHemisphereWest,
  List,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Star,
  TrashSimple,
  X,
} from '@phosphor-icons/react';
import * as db from '../lib/db';
import { fetchPreview, hostOf, withScheme } from '../lib/preview';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
import ImageDropzone from './ImageDropzone';
import type { LandingPage } from '../types';

export default function LandingSpace({
  favoritesOnly,
  onMenu,
}: {
  favoritesOnly: boolean;
  onMenu: () => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<LandingPage[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ item: LandingPage | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    db.fetchLandingPages()
      .then(async (rows) => {
        if (cancelled) return;
        setItems(rows);
        const paths = rows.map((r) => r.imagePath).filter((p): p is string => Boolean(p));
        if (paths.length) {
          const urls = await db.signedUrls(paths);
          if (!cancelled) setImageUrls(urls);
        }
      })
      .catch((e) => !cancelled && toast(`Could not load: ${(e as Error).message}`, 'error'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [toast]);

  async function refreshImg(path: string | null) {
    if (!path || imageUrls[path]) return;
    const url = await db.signedUrl(path);
    if (url) setImageUrls((m) => ({ ...m, [path]: url }));
  }

  const visible = useMemo(() => {
    let list = favoritesOnly ? items.filter((i) => i.favorite) : items;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((i) =>
        [i.title, i.url, i.notes, i.previewTitle ?? '', ...i.tags].join(' ').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, favoritesOnly, query]);

  async function save(input: db.LandingInput, existing: LandingPage | null) {
    try {
      if (existing) {
        const updated = await db.updateLanding(existing.id, input);
        setItems((l) => l.map((x) => (x.id === updated.id ? updated : x)));
        if (existing.imagePath && existing.imagePath !== input.imagePath) {
          db.deleteImage(existing.imagePath);
        }
        toast('Landing page updated');
      } else {
        const created = await db.createLanding(input);
        setItems((l) => [created, ...l]);
        toast('Landing page added');
      }
      await refreshImg(input.imagePath);
      setEditing(null);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function remove(item: LandingPage) {
    try {
      await db.deleteLanding(item.id);
      if (item.imagePath) db.deleteImage(item.imagePath);
      setItems((l) => l.filter((x) => x.id !== item.id));
      toast('Landing page deleted', 'info');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function toggleFav(item: LandingPage) {
    const favorite = !item.favorite;
    setItems((l) => l.map((x) => (x.id === item.id ? { ...x, favorite } : x)));
    try {
      await db.updateLanding(item.id, { favorite });
    } catch {
      setItems((l) => l.map((x) => (x.id === item.id ? { ...x, favorite: !favorite } : x)));
    }
  }

  return (
    <>
      <header className="toolbar">
        <div className="toolbar-left">
          <button className="icon-btn mobile-only" onClick={onMenu} aria-label="Open menu">
            <List size={20} />
          </button>
          <h1 className="view-title">{favoritesOnly ? 'Favorite landing pages' : 'Landing pages'}</h1>
          <span className="view-count">{visible.length}</span>
        </div>
        <div className="toolbar-right">
          <div className="search-wrap">
            <MagnifyingGlass size={15} className="search-icon" />
            <input
              className="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </div>
          <button className="btn primary" onClick={() => setEditing({ item: null })}>
            <Plus size={16} weight="bold" />
            <span className="btn-label">New</span>
          </button>
        </div>
      </header>

      <div className="content">
        {loading ? (
          <div className="grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card skeleton" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-glyph">
              <GlobeHemisphereWest size={40} weight="thin" />
            </div>
            <p className="empty-title">
              {query ? 'Nothing matches your search' : 'No landing pages yet'}
            </p>
            <p className="empty-sub">
              {query
                ? 'Try a different search.'
                : 'Save landing pages you admire and keep them one click away.'}
            </p>
            <button className="btn primary" onClick={() => setEditing({ item: null })}>
              <Plus size={16} weight="bold" />
              Add a landing page
            </button>
          </div>
        ) : (
          <div className="grid">
            {visible.map((item) => (
              <LandingCard
                key={item.id}
                item={item}
                imageUrl={item.imagePath ? imageUrls[item.imagePath] ?? null : null}
                onEdit={() => setEditing({ item })}
                onDelete={() => remove(item)}
                onToggleFavorite={() => toggleFav(item)}
              />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <LandingEditor
          item={editing.item}
          initialImageUrl={editing.item?.imagePath ? imageUrls[editing.item.imagePath] ?? null : null}
          onSave={(input) => save(input, editing.item)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function LandingCard({
  item,
  imageUrl,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  item: LandingPage;
  imageUrl: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const confirm = useConfirm();
  const href = withScheme(item.url);
  const title = item.title || item.previewTitle || hostOf(item.url);
  // Manual screenshot wins over the auto-fetched preview.
  const shownImage = imageUrl ?? item.previewImage;

  return (
    <article className="card lp-card">
      <a className="lp-preview" href={href} target="_blank" rel="noopener noreferrer" title={`Open ${href}`}>
        {shownImage ? (
          <img src={shownImage} alt={title} loading="lazy" />
        ) : (
          <div className="lp-preview-fallback">
            <GlobeHemisphereWest size={28} weight="thin" />
            <span>{hostOf(item.url)}</span>
          </div>
        )}
        <span className="lp-open-badge">
          <ArrowSquareOut size={13} weight="bold" />
        </span>
      </a>

      <div className="lp-body">
        <header className="card-head">
          <button className="card-title" onClick={onEdit} title="Edit">
            {title}
          </button>
          <button
            className={`star${item.favorite ? ' on' : ''}`}
            title={item.favorite ? 'Unfavorite' : 'Favorite'}
            onClick={onToggleFavorite}
          >
            <Star size={17} weight={item.favorite ? 'fill' : 'regular'} />
          </button>
        </header>

        <a className="lp-host" href={href} target="_blank" rel="noopener noreferrer">
          {hostOf(item.url)}
        </a>

        {item.tags.length > 0 && (
          <div className="tag-row">
            {item.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}

        <footer className="card-foot">
          <a className="btn primary sm" href={href} target="_blank" rel="noopener noreferrer">
            <ArrowSquareOut size={14} weight="bold" />
            Visit
          </a>
          <div className="card-actions">
            <button className="icon-btn" title="Edit" onClick={onEdit}>
              <PencilSimple size={16} />
            </button>
            <button
              className="icon-btn danger"
              title="Delete"
              onClick={async () => {
                if (
                  await confirm({
                    title: 'Delete landing page?',
                    message: `"${title}" will be removed from your library.`,
                    confirmText: 'Delete',
                    danger: true,
                  })
                )
                  onDelete();
              }}
            >
              <TrashSimple size={16} />
            </button>
          </div>
        </footer>
      </div>
    </article>
  );
}

function LandingEditor({
  item,
  initialImageUrl,
  onSave,
  onClose,
}: {
  item: LandingPage | null;
  initialImageUrl: string | null;
  onSave: (input: db.LandingInput) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [url, setUrl] = useState(item?.url ?? '');
  const [title, setTitle] = useState(item?.title ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [tagText, setTagText] = useState((item?.tags ?? []).join(', '));
  const [preview, setPreview] = useState({
    image: item?.previewImage ?? null,
    title: item?.previewTitle ?? null,
    description: item?.previewDesc ?? null,
  });
  const [fetching, setFetching] = useState(false);

  // Manual screenshot state.
  const [imagePath, setImagePath] = useState<string | null>(item?.imagePath ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const sessionUploads = useRef<string[]>([]);
  const originalPath = item?.imagePath ?? null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') cancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cancel() {
    for (const p of sessionUploads.current) {
      if (p !== originalPath) db.deleteImage(p);
    }
    onClose();
  }

  async function loadPreview() {
    if (!url.trim()) return;
    setFetching(true);
    const data = await fetchPreview(url.trim());
    setPreview(data);
    if (!title && data.title) setTitle(data.title);
    setFetching(false);
    if (!data.image && !data.title) toast('No preview found for that URL', 'info');
  }

  function submit() {
    if (!url.trim()) {
      toast('A URL is required', 'error');
      return;
    }
    for (const p of sessionUploads.current) {
      if (p !== imagePath) db.deleteImage(p);
    }
    const tags = tagText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSave({
      url: url.trim(),
      title: title.trim(),
      notes: notes.trim(),
      tags,
      previewImage: preview.image,
      previewTitle: preview.title,
      previewDesc: preview.description,
      imagePath,
    });
  }

  const hasAutoPreview = Boolean(preview.image);

  return (
    <div className="modal-overlay" onMouseDown={cancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{item ? 'Edit landing page' : 'New landing page'}</h2>
          <button className="icon-btn" onClick={cancel} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <label className="field">
            <span>URL</span>
            <div className="url-row">
              <input
                autoFocus
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={loadPreview}
                placeholder="https://example.com"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <button type="button" className="btn ghost" onClick={loadPreview} disabled={fetching}>
                {fetching ? 'Loading…' : 'Fetch preview'}
              </button>
            </div>
          </label>

          {(preview.image || preview.title) && (
            <div className="lp-preview-card">
              {preview.image && <img src={preview.image} alt="Preview" />}
              {preview.title && <span className="lp-preview-title">{preview.title}</span>}
            </div>
          )}

          <div className="field">
            <span>
              {hasAutoPreview ? 'Custom screenshot (optional)' : 'Screenshot (no preview found)'}
            </span>
            <ImageDropzone
              imageUrl={imageUrl}
              enablePaste
              onUploaded={(path, previewUrl) => {
                sessionUploads.current.push(path);
                setImagePath(path);
                setImageUrl(previewUrl);
              }}
              onRemove={() => {
                if (imagePath && sessionUploads.current.includes(imagePath)) {
                  db.deleteImage(imagePath);
                  sessionUploads.current = sessionUploads.current.filter((p) => p !== imagePath);
                }
                setImagePath(null);
                setImageUrl(null);
              }}
            />
          </div>

          <label className="field">
            <span>Title (optional)</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Defaults to the page title"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </label>

          <label className="field">
            <span>Tags (comma-separated)</span>
            <input
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              placeholder="hero, pricing, dark"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </label>

          <label className="field">
            <span>Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What you like about it"
              rows={3}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </label>
        </div>

        <footer className="modal-foot">
          <span className="hint">Esc to close</span>
          <div className="modal-actions">
            <button className="btn ghost" onClick={cancel}>
              Cancel
            </button>
            <button className="btn primary" onClick={submit}>
              Save
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
