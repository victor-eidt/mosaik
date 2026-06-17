import { DownloadSimple, FileCss, FileMd, Robot } from '@phosphor-icons/react';
import {
  downloadText,
  slugify,
  toAgentsMd,
  toCss,
  type DesignDoc,
} from '../../lib/designModel';
import { useToast } from '../Toast';

/** Download / copy the system as DESIGN.md, CSS variables, and an optional AGENTS.md. */
export default function ExportPanel({
  doc,
  fullMarkdown,
  pairAgents,
  onTogglePairAgents,
}: {
  doc: DesignDoc;
  fullMarkdown: string;
  pairAgents: boolean;
  onTogglePairAgents: (next: boolean) => void;
}) {
  const toast = useToast();
  const slug = slugify(doc.name);
  const css = toCss(doc.tokens);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copied`);
    } catch {
      toast('Could not access the clipboard', 'error');
    }
  }

  return (
    <div className="ds-export">
      <div className="ds-export-row">
        <div className="ds-export-meta">
          <FileMd size={18} />
          <div>
            <strong>DESIGN.md</strong>
            <span>Tokens + documentation, the source of truth.</span>
          </div>
        </div>
        <div className="ds-export-actions">
          <button className="btn ghost sm" onClick={() => copy(fullMarkdown, 'DESIGN.md')}>
            Copy
          </button>
          <button
            className="btn primary sm"
            onClick={() => downloadText('DESIGN.md', fullMarkdown, 'text/markdown')}
          >
            <DownloadSimple size={14} weight="bold" />
            Download
          </button>
        </div>
      </div>

      <div className="ds-export-row">
        <div className="ds-export-meta">
          <FileCss size={18} />
          <div>
            <strong>{slug}.css</strong>
            <span>CSS custom properties for :root.</span>
          </div>
        </div>
        <div className="ds-export-actions">
          <button className="btn ghost sm" onClick={() => copy(css, 'CSS')}>
            Copy
          </button>
          <button
            className="btn primary sm"
            onClick={() => downloadText(`${slug}.css`, css, 'text/css')}
          >
            <DownloadSimple size={14} weight="bold" />
            Download
          </button>
        </div>
      </div>

      <div className="ds-export-row">
        <div className="ds-export-meta">
          <Robot size={18} />
          <div>
            <strong>AGENTS.md</strong>
            <span>Tells coding agents to follow DESIGN.md for UI work.</span>
          </div>
        </div>
        <div className="ds-export-actions">
          <label className="ds-check ds-check-inline">
            <input
              type="checkbox"
              checked={pairAgents}
              onChange={(e) => onTogglePairAgents(e.target.checked)}
            />
            <span>Pair</span>
          </label>
          <button
            className="btn primary sm"
            disabled={!pairAgents}
            onClick={() => downloadText('AGENTS.md', toAgentsMd(doc.name), 'text/markdown')}
          >
            <DownloadSimple size={14} weight="bold" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
