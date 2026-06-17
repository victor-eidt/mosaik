import { useEffect, useRef, useState } from 'react';
import { ArrowsClockwise, ClipboardText, Sparkle, X } from '@phosphor-icons/react';
import * as db from '../../lib/db';
import { canImportDirectly, importDesign, serializeDoc } from '../../lib/designModel';
import { useToast } from '../Toast';

/**
 * Paste an existing design system to save it. A DESIGN.md or this tool's own CSS export
 * can be imported deterministically ("Paste as-is"); any other system (a brand's CSS,
 * style-guide markdown, prose) is mapped onto the token schema by the AI "Convert" mode.
 * Either way it opens the editor with the result for review before saving.
 */
export default function DesignImport({
  onImport,
  onClose,
}: {
  onImport: (markdown: string) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const direct = canImportDirectly(text);

  function pasteAsIs() {
    const v = text.trim();
    if (!v) return;
    onImport(serializeDoc(importDesign(v)));
  }

  async function convertWithAi() {
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      const res = await db.designAi({ mode: 'convert', markdown: v });
      onImport(res.markdown);
    } catch (e) {
      toast(aiError(e), 'error');
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={() => !busy && onClose()}>
      <div className="modal ds-import" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>
              <ClipboardText size={16} /> Import a design system
            </h2>
            <p className="modal-sub">
              Paste a DESIGN.md or this tool's CSS to import directly — or any other system to
              convert with AI.
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close" disabled={busy}>
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <textarea
            ref={taRef}
            className="ds-import-area"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              'Paste anything:\n• a DESIGN.md (YAML frontmatter)\n• a brand’s CSS variables or style guide\n• a written description of the system'
            }
            spellCheck={false}
            disabled={busy}
          />
          {text.trim() && (
            <p className="ds-import-hint">
              {direct
                ? 'Looks like a compatible DESIGN.md / CSS — “Paste as-is” will import it exactly.'
                : '“Convert with AI” will map this onto the token schema (colors, fonts, radii, button shape).'}
            </p>
          )}
        </div>

        <footer className="modal-foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <div className="ds-import-actions">
            <button
              className={`btn ${direct ? 'primary' : 'ghost'}`}
              onClick={pasteAsIs}
              disabled={busy || !text.trim()}
            >
              Paste as-is
            </button>
            <button
              className={`btn ${direct ? 'ghost' : 'primary'}`}
              onClick={convertWithAi}
              disabled={busy || !text.trim()}
            >
              {busy ? (
                <>
                  <ArrowsClockwise size={15} className="spin" /> Converting…
                </>
              ) : (
                <>
                  <Sparkle size={15} weight="fill" /> Convert with AI
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function aiError(e: unknown): string {
  const msg = (e as Error)?.message ?? 'Something went wrong.';
  if (/not found|Failed to send|FunctionsFetch|non-2xx|Failed to fetch/i.test(msg)) {
    return "AI isn't configured yet — deploy the design-ai edge function and set OPENAI_API_KEY.";
  }
  return msg;
}
