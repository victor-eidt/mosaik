import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Code,
  Copy,
  CubeTransparent,
  List,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Star,
  TrashSimple,
  X,
} from '@phosphor-icons/react';
import * as db from '../lib/db';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
import ImageDropzone from './ImageDropzone';
import type { UiElement } from '../types';

export default function UiSpace({
  favoritesOnly,
  onMenu,
}: {
  favoritesOnly: boolean;
  onMenu: () => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<UiElement[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ item: UiElement | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    db.fetchUiElements()
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

  const visible = useMemo(() => {
    let list = favoritesOnly ? items.filter((i) => i.favorite) : items;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((i) =>
        [i.title, i.notes, i.code, i.language, ...i.tags].join(' ').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, favoritesOnly, query]);

  async function refreshImg(path: string | null) {
    if (!path || imageUrls[path]) return;
    const url = await db.signedUrl(path);
    if (url) setImageUrls((m) => ({ ...m, [path]: url }));
  }

  async function save(input: db.UiInput, existing: UiElement | null) {
    try {
      if (existing) {
        const updated = await db.updateUi(existing.id, input);
        setItems((l) => l.map((x) => (x.id === updated.id ? updated : x)));
        if (existing.imagePath && existing.imagePath !== input.imagePath) {
          db.deleteImage(existing.imagePath);
        }
        toast('Element updated');
      } else {
        const created = await db.createUi(input);
        setItems((l) => [created, ...l]);
        toast('Element added');
      }
      await refreshImg(input.imagePath);
      setEditing(null);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function remove(item: UiElement) {
    try {
      await db.deleteUi(item.id);
      if (item.imagePath) db.deleteImage(item.imagePath);
      setItems((l) => l.filter((x) => x.id !== item.id));
      toast('Element deleted', 'info');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function toggleFav(item: UiElement) {
    const favorite = !item.favorite;
    setItems((l) => l.map((x) => (x.id === item.id ? { ...x, favorite } : x)));
    try {
      await db.updateUi(item.id, { favorite });
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
          <h1 className="view-title">{favoritesOnly ? 'Favorite UI elements' : 'UI elements'}</h1>
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
              <CubeTransparent size={40} weight="thin" />
            </div>
            <p className="empty-title">{query ? 'Nothing matches your search' : 'No UI elements yet'}</p>
            <p className="empty-sub">
              {query
                ? 'Try a different search.'
                : 'Save reusable components: an image, the code, and a label.'}
            </p>
            <button className="btn primary" onClick={() => setEditing({ item: null })}>
              <Plus size={16} weight="bold" />
              Add a UI element
            </button>
          </div>
        ) : (
          <div className="grid">
            {visible.map((item) => (
              <UiCard
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
        <UiEditor
          item={editing.item}
          initialImageUrl={editing.item?.imagePath ? imageUrls[editing.item.imagePath] ?? null : null}
          onSave={(input) => save(input, editing.item)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function UiCard({
  item,
  imageUrl,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  item: UiElement;
  imageUrl: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [zoom, setZoom] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!zoom) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setZoom(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(item.code);
      setCopied(true);
      toast('Code copied');
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast('Could not access the clipboard', 'error');
    }
  }

  return (
    <article className="card">
      <header className="card-head">
        <button className="card-title" onClick={onEdit} title="Edit">
          {item.title || 'Untitled element'}
        </button>
        <button
          className={`star${item.favorite ? ' on' : ''}`}
          title={item.favorite ? 'Unfavorite' : 'Favorite'}
          onClick={onToggleFavorite}
        >
          <Star size={17} weight={item.favorite ? 'fill' : 'regular'} />
        </button>
      </header>

      {imageUrl ? (
        <button className="card-thumb" onClick={() => setZoom(true)} title="View image">
          <img src={imageUrl} alt="UI element" loading="lazy" />
        </button>
      ) : item.code ? (
        <pre className="card-body code-body" onClick={onEdit}>
          {item.code}
        </pre>
      ) : (
        <pre className="card-body" onClick={onEdit}>
          No image or code yet
        </pre>
      )}

      <div className="tag-row">
        {item.language && (
          <span className="tag lang-tag">
            <Code size={11} weight="bold" />
            {item.language}
          </span>
        )}
        {item.tags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>

      <footer className="card-foot">
        <div className="card-meta">
          <span>{item.imagePath && item.code ? 'image + code' : item.code ? 'code' : 'image'}</span>
        </div>
        <div className="card-actions">
          {item.code && (
            <button className={`btn primary sm copy-btn${copied ? ' done' : ''}`} onClick={copyCode}>
              <Copy size={14} weight="bold" />
              {copied ? 'Copied' : 'Code'}
            </button>
          )}
          <button className="icon-btn" title="Edit" onClick={onEdit}>
            <PencilSimple size={16} />
          </button>
          <button
            className="icon-btn danger"
            title="Delete"
            onClick={async () => {
              if (
                await confirm({
                  title: 'Delete element?',
                  message: `"${item.title || 'this element'}" will be permanently deleted.`,
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

      {zoom &&
        imageUrl &&
        createPortal(
          <div className="lightbox" onClick={() => setZoom(false)}>
            <button className="lightbox-close" aria-label="Close">
              <X size={22} />
            </button>
            <img src={imageUrl} alt="UI element" onClick={(e) => e.stopPropagation()} />
          </div>,
          document.body
        )}
    </article>
  );
}

function UiEditor({
  item,
  initialImageUrl,
  onSave,
  onClose,
}: {
  item: UiElement | null;
  initialImageUrl: string | null;
  onSave: (input: db.UiInput) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [language, setLanguage] = useState(item?.language ?? '');
  const [code, setCode] = useState(item?.code ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [tagText, setTagText] = useState((item?.tags ?? []).join(', '));
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

  function submit() {
    for (const p of sessionUploads.current) {
      if (p !== imagePath) db.deleteImage(p);
    }
    const tags = tagText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSave({
      title: title.trim(),
      notes: notes.trim(),
      tags,
      imagePath,
      code,
      language: language.trim(),
      sourceUrl: '',
    });
  }

  return (
    <div className="modal-overlay" onMouseDown={cancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{item ? 'Edit UI element' : 'New UI element'}</h2>
          <button className="icon-btn" onClick={cancel} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <label className="field">
            <span>Title</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Glassy pricing card"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </label>

          <div className="field">
            <span>Image (optional)</span>
            <ImageDropzone
              imageUrl={imageUrl}
              enablePaste
              onUploaded={(path, preview) => {
                sessionUploads.current.push(path);
                setImagePath(path);
                setImageUrl(preview);
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

          <div className="field-row">
            <label className="field" style={{ flex: '0 0 30%' }}>
              <span>Language</span>
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="html, css, tsx…"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
            </label>
            <div className="field" style={{ alignSelf: 'flex-end' }}>
              <span className="hint">Paste an image above, or the code below.</span>
            </div>
          </div>

          <label className="field">
            <span>Code snippet (optional)</span>
            <textarea
              className="body-area"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste the element's code here"
              rows={8}
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
              placeholder="button, gradient, animation"
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
              placeholder="Where it's from, how to use it"
              rows={2}
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
