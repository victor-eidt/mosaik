import { useEffect, useMemo, useState } from 'react';
import {
  CaretLeft,
  Copy,
  DownloadSimple,
  PencilSimple,
  Star,
  TrashSimple,
} from '@phosphor-icons/react';
import {
  downloadText,
  parseDoc,
  serializeDoc,
  slugify,
  toAgentsMd,
  toCss,
} from '../../lib/designModel';
import type { DesignSystem } from '../../types';
import type { PresetBrand } from '../../lib/designPresets';
import { useToast } from '../Toast';
import { useConfirm } from '../ConfirmDialog';
import LivePreview from './LivePreview';
import { DesignBrandMark } from './DesignThumbnail';

type CodeTab = 'design' | 'css' | 'agents';

const TABS: { id: CodeTab; label: string }[] = [
  { id: 'design', label: 'DESIGN.md' },
  { id: 'css', label: 'CSS Variables' },
  { id: 'agents', label: 'AGENTS.md' },
];

/**
 * Read-only "results" page for a saved design system — a big live render of the
 * system plus its documentation, with a code panel to copy/download the DESIGN.md,
 * CSS variables, and AGENTS.md. Opening a saved system lands here; Edit re-opens
 * the structured editor.
 */
export default function DesignView({
  system,
  imageUrl,
  brand,
  onEdit,
  onClose,
  onToggleFavorite,
  onDelete,
}: {
  system: DesignSystem;
  imageUrl: string | null;
  brand?: PresetBrand;
  onEdit: () => void;
  onClose: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const doc = useMemo(() => parseDoc(system.content), [system.content]);
  const [tab, setTab] = useState<CodeTab>('design');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const code =
    tab === 'design' ? serializeDoc(doc) : tab === 'css' ? toCss(doc.tokens) : toAgentsMd(doc.name);
  const filename =
    tab === 'design' ? 'DESIGN.md' : tab === 'css' ? `${slugify(doc.name)}.css` : 'AGENTS.md';
  const mime = tab === 'css' ? 'text/css' : 'text/markdown';

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast(`${TABS.find((t) => t.id === tab)!.label} copied`);
    } catch {
      toast('Could not access the clipboard', 'error');
    }
  }

  const prose = doc.body.replace(/^#\s+.*(?:\r?\n)?/, '');

  return (
    <div className="ds-view">
      <header className="ds-view-head">
        <button className="ds-view-back" onClick={onClose}>
          <CaretLeft size={16} weight="bold" />
          <span>Design systems</span>
          <span className="ds-view-crumb">/ {system.name || 'Untitled system'}</span>
        </button>
        <div className="ds-view-head-actions">
          <button
            className={`star${system.favorite ? ' on' : ''}`}
            title={system.favorite ? 'Unfavorite' : 'Favorite'}
            onClick={onToggleFavorite}
          >
            <Star size={17} weight={system.favorite ? 'fill' : 'regular'} />
          </button>
          <button
            className="icon-btn danger"
            title="Delete"
            onClick={async () => {
              if (
                await confirm({
                  title: 'Delete design system?',
                  message: `"${system.name || 'this system'}" will be permanently deleted.`,
                  confirmText: 'Delete',
                  danger: true,
                })
              )
                onDelete();
            }}
          >
            <TrashSimple size={16} />
          </button>
          <button className="btn primary" onClick={onEdit}>
            <PencilSimple size={15} weight="bold" />
            <span className="btn-label">Edit</span>
          </button>
        </div>
      </header>

      <div className="ds-view-body">
        <main className="ds-view-main">
          <div className="ds-view-titlebar">
            <DesignBrandMark tokens={doc.tokens} brand={brand} name={doc.name} />
            <div>
              <h1>{doc.name || 'Untitled system'}</h1>
              <span className="ds-view-sub">
                {doc.tokens.buttonStyle} buttons · {doc.tokens.components.density}
                {system.pairAgents ? ' · paired with AGENTS.md' : ''}
              </span>
            </div>
          </div>

          {imageUrl && (
            <figure className="ds-view-reference">
              <img src={imageUrl} alt="Design reference" />
              <figcaption>Reference image</figcaption>
            </figure>
          )}

          <div className="ds-view-preview">
            <LivePreview tokens={doc.tokens} />
          </div>

          {prose.trim() && <Prose body={prose} />}
        </main>

        <aside className="ds-view-code">
          <div className="ds-view-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`ds-view-tab${tab === t.id ? ' on' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="ds-view-code-actions">
            <button className="btn ghost sm" onClick={copy}>
              <Copy size={14} weight="bold" />
              Copy
            </button>
            <button className="btn primary sm" onClick={() => downloadText(filename, code, mime)}>
              <DownloadSimple size={14} weight="bold" />
              {filename}
            </button>
          </div>
          <pre className="ds-view-pre">{code}</pre>
        </aside>
      </div>
    </div>
  );
}

/** Render inline `**bold**` and `` `code` `` within a line of prose. */
function inline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) parts.push(<strong key={key++}>{m[1]}</strong>);
    else parts.push(<code key={key++}>{m[2]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const cells = (row: string) =>
  row
    .replace(/^\s*\||\|\s*$/g, '')
    .split('|')
    .map((c) => c.trim());

/**
 * Lightweight markdown rendering for the (possibly large, pasted) doc body — headings,
 * lists, blockquotes, fenced code, tables, and inline bold/code. Enough to display an
 * extended DESIGN.md faithfully without pulling in a full markdown dependency.
 */
function Prose({ body }: { body: string }) {
  const lines = body.split('\n');
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (list.length) {
      out.push(
        <ul key={`l${out.length}`}>
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    // Fenced code block
    if (/^```/.test(line.trim())) {
      flushList();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) code.push(lines[i++]);
      out.push(
        <pre key={`c${out.length}`} className="ds-prose-code">
          {code.join('\n')}
        </pre>
      );
      continue;
    }

    // Table (consecutive | … | rows)
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushList();
      const rows: string[] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i].trim())) rows.push(lines[i++].trim());
      i--;
      const hasSep = rows[1] && /^[\s|:-]+$/.test(rows[1]);
      const header = cells(rows[0]);
      const bodyRows = rows.slice(hasSep ? 2 : 1);
      out.push(
        <div key={`t${out.length}`} className="ds-prose-tablewrap">
          <table className="ds-prose-table">
            <thead>
              <tr>
                {header.map((h, j) => (
                  <th key={j}>{inline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((r, ri) => (
                <tr key={ri}>
                  {cells(r).map((c, ci) => (
                    <td key={ci}>{inline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushList();
      out.push(<blockquote key={`q${out.length}`}>{inline(line.replace(/^>\s?/, ''))}</blockquote>);
    } else if (/^###\s+/.test(line)) {
      flushList();
      out.push(<h4 key={`h${out.length}`}>{inline(line.replace(/^###\s+/, ''))}</h4>);
    } else if (/^##\s+/.test(line)) {
      flushList();
      out.push(<h3 key={`h${out.length}`}>{inline(line.replace(/^##\s+/, ''))}</h3>);
    } else if (/^#\s+/.test(line)) {
      flushList();
      out.push(<h2 key={`h${out.length}`}>{inline(line.replace(/^#\s+/, ''))}</h2>);
    } else if (/^[-*]\s+/.test(line)) {
      list.push(line.replace(/^[-*]\s+/, ''));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      out.push(<p key={`p${out.length}`}>{inline(line)}</p>);
    }
  }
  flushList();
  return <div className="ds-view-prose">{out}</div>;
}
