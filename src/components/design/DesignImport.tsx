import { useEffect, useRef, useState } from 'react';
import { ClipboardText, X } from '@phosphor-icons/react';
import { importDesign, serializeDoc } from '../../lib/designModel';

/**
 * Paste an existing design system to save it. Accepts a DESIGN.md (YAML frontmatter),
 * a `:root` CSS-variables block (the format this tool exports), or freeform text — then
 * opens the editor with the parsed result for review before saving.
 */
export default function DesignImport({
  onImport,
  onClose,
}: {
  onImport: (markdown: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  function doImport() {
    const v = text.trim();
    if (!v) return;
    onImport(serializeDoc(importDesign(v)));
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal ds-import" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>
              <ClipboardText size={16} /> Import a design system
            </h2>
            <p className="modal-sub">Paste a DESIGN.md, a :root CSS-variables block, or notes.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <textarea
            ref={taRef}
            className="ds-import-area"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                doImport();
              }
            }}
            placeholder={'---\nname: My System\ncolors:\n  primary: "#3b82f6"\n…\n\n— or —\n\n:root {\n  --color-primary: #3b82f6;\n}'}
            spellCheck={false}
          />
        </div>

        <footer className="modal-foot">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={doImport} disabled={!text.trim()}>
            <ClipboardText size={15} weight="bold" />
            Import
          </button>
        </footer>
      </div>
    </div>
  );
}
