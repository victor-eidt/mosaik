import { useState } from 'react';

/**
 * Edits the freeform markdown body and shows the full generated DESIGN.md. The body
 * is the only hand-editable text; tokens come from the structured controls.
 */
export default function MarkdownPanel({
  body,
  fullMarkdown,
  onBodyChange,
}: {
  body: string;
  fullMarkdown: string;
  onBodyChange: (next: string) => void;
}) {
  const [tab, setTab] = useState<'docs' | 'file'>('docs');

  return (
    <div className="ds-md">
      <div className="ds-segmented" role="tablist" aria-label="Markdown view">
        <button
          type="button"
          className={`ds-seg${tab === 'docs' ? ' on' : ''}`}
          onClick={() => setTab('docs')}
        >
          Docs (editable)
        </button>
        <button
          type="button"
          className={`ds-seg${tab === 'file' ? ' on' : ''}`}
          onClick={() => setTab('file')}
        >
          DESIGN.md
        </button>
      </div>

      {tab === 'docs' ? (
        <textarea
          className="ds-md-area"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Document the system: when to use it, dos and don'ts, component notes…"
          spellCheck
        />
      ) : (
        <pre className="ds-md-preview">{fullMarkdown}</pre>
      )}
    </div>
  );
}
