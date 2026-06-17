import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardText,
  FileMd,
  List,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Sparkle,
  Star,
  Swatches,
  TrashSimple,
  X,
} from '@phosphor-icons/react';
import * as db from '../lib/db';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
import DesignEditor from './DesignEditor';
import DesignView from './design/DesignView';
import AiCreate from './design/AiCreate';
import DesignImport from './design/DesignImport';
import DesignThumbnail, { DesignBrandMark } from './design/DesignThumbnail';
import { PRESETS, type PresetBrand } from '../lib/designPresets';
import { blankDoc, parseDoc, serializeDoc } from '../lib/designModel';
import type { DesignSystem } from '../types';

type Editing = { system: DesignSystem | null; markdown: string };

/** Map a saved system's name back to a brand (for the monogram mark), if it matches a preset. */
const BRAND_BY_NAME = new Map<string, PresetBrand>(
  PRESETS.filter((p) => p.brand).map((p) => [p.label.toLowerCase(), p.brand as PresetBrand])
);
const brandFor = (name: string): PresetBrand | undefined => BRAND_BY_NAME.get(name.trim().toLowerCase());

export default function DesignSpace({
  favoritesOnly,
  onMenu,
}: {
  favoritesOnly: boolean;
  onMenu: () => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<DesignSystem[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [viewing, setViewing] = useState<DesignSystem | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    db.fetchDesignSystems()
      .then(async (rows) => {
        if (cancelled) return;
        setItems(rows);
        const paths = rows.map((r) => r.referenceImagePath).filter((p): p is string => Boolean(p));
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
    if (q) list = list.filter((i) => `${i.name} ${i.content}`.toLowerCase().includes(q));
    return list;
  }, [items, favoritesOnly, query]);

  async function refreshImg(path: string | null) {
    if (!path || imageUrls[path]) return;
    const url = await db.signedUrl(path);
    if (url) setImageUrls((m) => ({ ...m, [path]: url }));
  }

  async function save(input: db.DesignInput, existing: DesignSystem | null) {
    try {
      if (existing) {
        const updated = await db.updateDesign(existing.id, input);
        setItems((l) => l.map((x) => (x.id === updated.id ? updated : x)));
        setViewing((v) => (v && v.id === updated.id ? updated : v));
        if (existing.referenceImagePath && existing.referenceImagePath !== input.referenceImagePath) {
          db.deleteImage(existing.referenceImagePath);
        }
        toast('Design system saved');
      } else {
        const created = await db.createDesign(input);
        setItems((l) => [created, ...l]);
        toast('Design system created');
      }
      await refreshImg(input.referenceImagePath);
      setEditing(null);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function remove(item: DesignSystem) {
    try {
      await db.deleteDesign(item.id);
      if (item.referenceImagePath) db.deleteImage(item.referenceImagePath);
      setItems((l) => l.filter((x) => x.id !== item.id));
      toast('Design system deleted', 'info');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function toggleFav(item: DesignSystem) {
    const favorite = !item.favorite;
    setItems((l) => l.map((x) => (x.id === item.id ? { ...x, favorite } : x)));
    setViewing((v) => (v && v.id === item.id ? { ...v, favorite } : v));
    try {
      await db.updateDesign(item.id, { favorite });
    } catch {
      setItems((l) => l.map((x) => (x.id === item.id ? { ...x, favorite: !favorite } : x)));
      setViewing((v) => (v && v.id === item.id ? { ...v, favorite: !favorite } : v));
    }
  }

  return (
    <>
      <header className="toolbar">
        <div className="toolbar-left">
          <button className="icon-btn mobile-only" onClick={onMenu} aria-label="Open menu">
            <List size={20} />
          </button>
          <h1 className="view-title">{favoritesOnly ? 'Favorite design systems' : 'Design systems'}</h1>
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
          <button className="btn primary" onClick={() => setPicking(true)}>
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
              <Swatches size={40} weight="thin" />
            </div>
            <p className="empty-title">
              {query ? 'Nothing matches your search' : 'No design systems yet'}
            </p>
            <p className="empty-sub">
              {query
                ? 'Try a different search.'
                : 'Create a DESIGN.md from a template, then tune colors, type, and components.'}
            </p>
            <button className="btn primary" onClick={() => setPicking(true)}>
              <Plus size={16} weight="bold" />
              New design system
            </button>
          </div>
        ) : (
          <div className="grid">
            {visible.map((item) => (
              <DesignCard
                key={item.id}
                item={item}
                onOpen={() => setViewing(item)}
                onEdit={() => setEditing({ system: item, markdown: item.content })}
                onDelete={() => remove(item)}
                onToggleFavorite={() => toggleFav(item)}
              />
            ))}
          </div>
        )}
      </div>

      {picking && (
        <TemplatePicker
          onPick={(markdown) => {
            setPicking(false);
            setEditing({ system: null, markdown });
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {viewing && (
        <DesignView
          system={viewing}
          brand={brandFor(viewing.name)}
          imageUrl={
            viewing.referenceImagePath ? imageUrls[viewing.referenceImagePath] ?? null : null
          }
          onEdit={() => setEditing({ system: viewing, markdown: viewing.content })}
          onClose={() => setViewing(null)}
          onToggleFavorite={() => toggleFav(viewing)}
          onDelete={() => {
            remove(viewing);
            setViewing(null);
          }}
        />
      )}

      {editing && (
        <DesignEditor
          system={editing.system}
          initialMarkdown={editing.markdown}
          initialImageUrl={
            editing.system?.referenceImagePath
              ? imageUrls[editing.system.referenceImagePath] ?? null
              : null
          }
          onSave={(input) => save(input, editing.system)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function DesignCard({
  item,
  onOpen,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  item: DesignSystem;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const confirm = useConfirm();
  const tokens = useMemo(() => parseDoc(item.content).tokens, [item.content]);

  return (
    <article className="card">
      <header className="card-head">
        <button className="card-title" onClick={onOpen} title="View">
          {item.name || 'Untitled system'}
        </button>
        <button
          className={`star${item.favorite ? ' on' : ''}`}
          title={item.favorite ? 'Unfavorite' : 'Favorite'}
          onClick={onToggleFavorite}
        >
          <Star size={17} weight={item.favorite ? 'fill' : 'regular'} />
        </button>
      </header>

      <button className="ds-card-preview" onClick={onOpen} title="View">
        <DesignThumbnail tokens={tokens} />
      </button>

      <div className="tag-row">
        <span className="tag lang-tag">
          <Swatches size={11} weight="bold" />
          {tokens.buttonStyle}
        </span>
        {item.pairAgents && (
          <span className="tag">
            <Sparkle size={11} weight="bold" />
            AGENTS.md
          </span>
        )}
      </div>

      <footer className="card-foot">
        <div className="card-meta">
          <span>
            <FileMd size={12} /> DESIGN.md
          </span>
        </div>
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
                  title: 'Delete design system?',
                  message: `"${item.name || 'this system'}" will be permanently deleted.`,
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
    </article>
  );
}

function TemplatePicker({
  onPick,
  onClose,
}: {
  onPick: (markdown: string) => void;
  onClose: () => void;
}) {
  const [aiOpen, setAiOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !aiOpen && !importOpen) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, aiOpen, importOpen]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal modal-wide" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Start a design system</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <div className="ds-picker-grid">
            <button className="ds-picker-card ds-picker-blank" onClick={() => onPick(serializeDoc(blankDoc()))}>
              <Plus size={22} weight="bold" />
              <strong>Blank</strong>
              <span>Start from defaults</span>
            </button>

            <button
              className="ds-picker-card ds-picker-ai"
              onClick={() => setAiOpen(true)}
            >
              <Sparkle size={22} weight="fill" />
              <strong>Generate with AI</strong>
              <span>Describe it in a sentence</span>
            </button>

            <button
              className="ds-picker-card ds-picker-import"
              onClick={() => setImportOpen(true)}
            >
              <ClipboardText size={22} weight="regular" />
              <strong>Paste / Import</strong>
              <span>DESIGN.md or CSS variables</span>
            </button>

            {PRESETS.map((p) => (
              <TemplateCard
                key={p.id}
                markdown={p.markdown}
                label={p.label}
                description={p.description}
                brand={p.brand}
                onPick={onPick}
              />
            ))}
          </div>
        </div>
      </div>

      {aiOpen && (
        <AiCreate onGenerated={(markdown) => onPick(markdown)} onClose={() => setAiOpen(false)} />
      )}

      {importOpen && (
        <DesignImport onImport={(markdown) => onPick(markdown)} onClose={() => setImportOpen(false)} />
      )}
    </div>
  );
}

function TemplateCard({
  markdown,
  label,
  description,
  brand,
  onPick,
}: {
  markdown: string;
  label: string;
  description: string;
  brand?: PresetBrand;
  onPick: (markdown: string) => void;
}) {
  const tokens = useMemo(() => parseDoc(markdown).tokens, [markdown]);
  return (
    <button className="ds-picker-card" onClick={() => onPick(markdown)}>
      <DesignThumbnail tokens={tokens} />
      <div className="ds-picker-meta">
        <DesignBrandMark tokens={tokens} brand={brand} name={label} />
        <div className="ds-picker-text">
          <span className="ds-picker-name">{label}</span>
          <span className="ds-picker-desc">{description}</span>
        </div>
      </div>
    </button>
  );
}
