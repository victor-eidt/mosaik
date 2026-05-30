import { useEffect, useMemo, useState } from 'react';
import { Copy, X } from '@phosphor-icons/react';
import { renderTemplate } from '../lib/template';
import type { Prompt } from '../types';

interface Props {
  prompt: Prompt;
  vars: string[];
  onCopy: (rendered: string) => void;
  onClose: () => void;
}

/** Fill in {{placeholders}} before copying. Shows a live preview of the result. */
export default function VariableFiller({ prompt, vars, onCopy, onClose }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(vars.map((v) => [v, '']))
  );

  const rendered = useMemo(() => renderTemplate(prompt.body, values), [prompt.body, values]);
  const remaining = vars.filter((v) => !values[v]?.trim()).length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onCopy(rendered);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rendered, onClose, onCopy]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal modal-wide" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>Fill variables</h2>
            <p className="modal-sub">{prompt.title || 'Untitled prompt'}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="filler-grid">
          <div className="filler-inputs">
            {vars.map((v, i) => (
              <label key={v} className="field">
                <span className="var-name">{v}</span>
                <textarea
                  autoFocus={i === 0}
                  rows={2}
                  value={values[v]}
                  placeholder={`Value for ${v}…`}
                  onChange={(e) => setValues((s) => ({ ...s, [v]: e.target.value }))}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                />
              </label>
            ))}
          </div>

          <div className="filler-preview">
            <span className="field-label">Preview</span>
            <pre className="preview-box">{rendered}</pre>
          </div>
        </div>

        <footer className="modal-foot">
          <span className="hint">
            {remaining > 0 ? `${remaining} variable${remaining > 1 ? 's' : ''} still empty` : 'All set'}
          </span>
          <div className="modal-actions">
            <button className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn primary" onClick={() => onCopy(rendered)}>
              <Copy size={16} weight="bold" />
              Copy result
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
