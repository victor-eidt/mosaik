import { useEffect, useRef, useState } from 'react';
import { ArrowsClockwise, Sparkle, X } from '@phosphor-icons/react';
import * as db from '../../lib/db';
import { useToast } from '../Toast';

const EXAMPLES = [
  'A calm, earthy wellness app — soft sage greens, rounded buttons, friendly sans',
  'A bold fintech dashboard — deep navy, electric blue primary, sharp corners, dense',
  'A premium dark SaaS — near-black canvas, violet accent, pill buttons',
  'A warm editorial blog — cream background, terracotta accent, large serif headings',
];

/** Modal that turns a one-line brief into a full DESIGN.md via the `create` AI mode. */
export default function AiCreate({
  onGenerated,
  onClose,
}: {
  onGenerated: (markdown: string) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  async function generate() {
    const brief = prompt.trim();
    if (!brief || busy) return;
    setBusy(true);
    try {
      const res = await db.designAi({ mode: 'create', markdown: '', prompt: brief });
      onGenerated(res.markdown);
    } catch (e) {
      toast(aiError(e), 'error');
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={() => !busy && onClose()}>
      <div className="modal ds-aic" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>
              <Sparkle size={16} weight="fill" /> Generate with AI
            </h2>
            <p className="modal-sub">Describe the product and mood — AI drafts a full system.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close" disabled={busy}>
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <textarea
            ref={taRef}
            className="ds-aic-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                generate();
              }
            }}
            placeholder="e.g. A calm, earthy wellness app — soft sage greens, rounded buttons, friendly sans"
            rows={4}
            disabled={busy}
          />
          <div className="ds-aic-examples">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="ds-ai-chip"
                disabled={busy}
                onClick={() => setPrompt(ex)}
              >
                {ex.split(' — ')[0]}
              </button>
            ))}
          </div>
        </div>

        <footer className="modal-foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn primary" onClick={generate} disabled={busy || !prompt.trim()}>
            {busy ? (
              <>
                <ArrowsClockwise size={15} className="spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkle size={15} weight="fill" /> Generate
              </>
            )}
          </button>
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
