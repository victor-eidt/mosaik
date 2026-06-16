import { useRef, useState } from 'react';
import { ArrowsClockwise, MagicWand, PaperPlaneTilt, Sparkle } from '@phosphor-icons/react';
import * as db from '../../lib/db';
import { useToast } from '../Toast';
import ImageDropzone from '../ImageDropzone';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Lovable-style AI panel. Chat instructions edit the current DESIGN.md; an uploaded
 * reference image generates a whole system. Both call the `design-ai` edge function
 * via `db.designAi` and apply the returned markdown to the editor.
 */
export default function AiChatPanel({
  markdown,
  onApply,
  referenceImagePath,
  referenceImageUrl,
  onReferenceChange,
}: {
  markdown: string;
  onApply: (nextMarkdown: string) => void;
  referenceImagePath: string | null;
  referenceImageUrl: string | null;
  onReferenceChange: (path: string | null, previewUrl: string | null) => void;
}) {
  const toast = useToast();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }

  async function send() {
    const prompt = input.trim();
    if (!prompt || busy) return;
    const history = turns;
    setTurns((t) => [...t, { role: 'user', content: prompt }]);
    setInput('');
    setBusy(true);
    scrollDown();
    try {
      const res = await db.designAi({
        mode: 'chat',
        markdown,
        messages: history.map((t) => ({ role: t.role, content: t.content })),
        prompt,
      });
      onApply(res.markdown);
      setTurns((t) => [...t, { role: 'assistant', content: res.note || 'Updated the design system.' }]);
    } catch (e) {
      setTurns((t) => [...t, { role: 'assistant', content: aiError(e) }]);
    } finally {
      setBusy(false);
      scrollDown();
    }
  }

  async function generateFromImage() {
    if (!referenceImagePath || busy) return;
    setBusy(true);
    setTurns((t) => [...t, { role: 'user', content: '🖼️ Generate a design system from this reference image.' }]);
    scrollDown();
    try {
      const res = await db.designAi({ mode: 'image', markdown, imagePath: referenceImagePath });
      onApply(res.markdown);
      setTurns((t) => [
        ...t,
        { role: 'assistant', content: res.note || 'Generated a system from your reference.' },
      ]);
      toast('Design generated from image');
    } catch (e) {
      setTurns((t) => [...t, { role: 'assistant', content: aiError(e) }]);
    } finally {
      setBusy(false);
      scrollDown();
    }
  }

  return (
    <div className="ds-ai">
      <div className="ds-ai-head">
        <Sparkle size={15} weight="fill" />
        <span>AI assistant</span>
      </div>

      <div className="ds-ai-log" ref={listRef}>
        {turns.length === 0 ? (
          <div className="ds-ai-empty">
            <MagicWand size={26} weight="thin" />
            <p>Ask the AI to evolve this system.</p>
            <div className="ds-ai-suggestions">
              {[
                'Make it warmer and more playful',
                'Switch to pill buttons',
                'Improve color contrast for accessibility',
                'Give it a dark, premium feel',
              ].map((s) => (
                <button key={s} type="button" className="ds-ai-chip" onClick={() => setInput(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((t, i) => (
            <div key={i} className={`ds-ai-msg ds-ai-${t.role}`}>
              {t.content}
            </div>
          ))
        )}
        {busy && (
          <div className="ds-ai-msg ds-ai-assistant ds-ai-busy">
            <ArrowsClockwise size={14} className="spin" /> Working…
          </div>
        )}
      </div>

      <div className="ds-ai-ref">
        <span className="ds-ai-ref-label">Reference image → generate</span>
        <ImageDropzone
          imageUrl={referenceImageUrl}
          onUploaded={(path, preview) => onReferenceChange(path, preview)}
          onRemove={() => onReferenceChange(null, null)}
        />
        {referenceImagePath && (
          <button className="btn ghost sm" disabled={busy} onClick={generateFromImage}>
            <MagicWand size={14} weight="bold" />
            Generate from image
          </button>
        )}
      </div>

      <div className="ds-ai-compose">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Describe a change… (⌘/Ctrl+Enter to send)"
          rows={2}
          disabled={busy}
        />
        <button className="btn primary" disabled={busy || !input.trim()} onClick={send}>
          <PaperPlaneTilt size={15} weight="fill" />
        </button>
      </div>
    </div>
  );
}

function aiError(e: unknown): string {
  const msg = (e as Error)?.message ?? 'Something went wrong.';
  if (/not found|Failed to send|FunctionsFetch|non-2xx|Failed to fetch/i.test(msg)) {
    return "⚠️ AI isn't configured yet. Deploy the `design-ai` Supabase edge function and set the ANTHROPIC_API_KEY secret to enable chat and image generation.";
  }
  return `⚠️ ${msg}`;
}
