import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Copy,
  CopySimple,
  PencilSimple,
  Star,
  TrashSimple,
  BracketsCurly,
  Link as LinkIcon,
  Layout,
  ArrowSquareOut,
  X,
} from '@phosphor-icons/react';
import type { LinkItem, Prompt } from '../types';
import { extractVars } from '../lib/template';

/** Short, readable host for when a link has no label. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function LinkChip({ item }: { item: LinkItem }) {
  const href = /^https?:\/\//i.test(item.url) ? item.url : `https://${item.url}`;
  return (
    <a
      className="link-chip"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={item.url}
    >
      <span>{item.label || hostOf(item.url)}</span>
      <ArrowSquareOut size={11} weight="bold" />
    </a>
  );
}

interface Props {
  prompt: Prompt;
  folderName: string | null;
  imageUrl: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleFavorite: () => void;
  onCopy: () => void;
  onTagClick: (tag: string) => void;
  activeTags: string[];
}

export default function PromptCard({
  prompt,
  folderName,
  imageUrl,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  onCopy,
  onTagClick,
  activeTags,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(false);
  const varCount = extractVars(prompt.body).length;

  // Close the lightbox on Escape, and lock body scroll while it's open.
  useEffect(() => {
    if (!zoom) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setZoom(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  function handleCopy() {
    onCopy();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <article className="card">
      <header className="card-head">
        <button className="card-title" onClick={onEdit} title="Edit">
          {prompt.title || 'Untitled prompt'}
        </button>
        <button
          className={`star${prompt.favorite ? ' on' : ''}`}
          title={prompt.favorite ? 'Unfavorite' : 'Favorite'}
          onClick={onToggleFavorite}
        >
          <Star size={17} weight={prompt.favorite ? 'fill' : 'regular'} />
        </button>
      </header>

      {imageUrl ? (
        <button className="card-thumb" onClick={() => setZoom(true)} title="View result image">
          <img src={imageUrl} alt="Result" loading="lazy" />
        </button>
      ) : (
        <pre className="card-body" onClick={onEdit}>
          {prompt.body || 'Empty prompt'}
        </pre>
      )}

      {/* Always rendered (even when empty) so the image/text region is the same
          height whether or not a card has tags. */}
      <div className="tag-row">
        {prompt.tags.map((t) => (
          <button
            key={t}
            className={`tag${activeTags.includes(t) ? ' active' : ''}`}
            onClick={() => onTagClick(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {(prompt.links.length > 0 || prompt.refLinks.length > 0) && (
        <div className="card-links">
          {prompt.links.length > 0 && (
            <div className="link-group">
              <span className="link-group-label">
                <LinkIcon size={12} weight="bold" /> Links úteis
              </span>
              <div className="link-chips">
                {prompt.links.map((l, i) => (
                  <LinkChip key={i} item={l} />
                ))}
              </div>
            </div>
          )}
          {prompt.refLinks.length > 0 && (
            <div className="link-group">
              <span className="link-group-label">
                <Layout size={12} weight="bold" /> Referências
              </span>
              <div className="link-chips">
                {prompt.refLinks.map((l, i) => (
                  <LinkChip key={i} item={l} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <footer className="card-foot">
        <div className="card-meta">
          <span>{folderName ?? 'Uncategorized'}</span>
          {varCount > 0 && (
            <span className="meta-chip" title={`${varCount} variable${varCount > 1 ? 's' : ''}`}>
              <BracketsCurly size={12} weight="bold" />
              {varCount}
            </span>
          )}
          {prompt.uses > 0 && (
            <span className="meta-chip" title="Times copied">
              {prompt.uses}×
            </span>
          )}
        </div>

        <div className="card-actions">
          <button className={`btn primary sm copy-btn${copied ? ' done' : ''}`} onClick={handleCopy}>
            <Copy size={14} weight="bold" />
            {copied ? 'Copied' : varCount > 0 ? 'Use' : 'Copy'}
          </button>
          <button className="icon-btn" title="Duplicate" onClick={onDuplicate}>
            <CopySimple size={16} />
          </button>
          <button className="icon-btn" title="Edit" onClick={onEdit}>
            <PencilSimple size={16} />
          </button>
          <button
            className="icon-btn danger"
            title="Delete"
            onClick={() => {
              if (confirm(`Delete "${prompt.title || 'this prompt'}"?`)) onDelete();
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
            <img src={imageUrl} alt="Result" onClick={(e) => e.stopPropagation()} />
          </div>,
          document.body
        )}
    </article>
  );
}
