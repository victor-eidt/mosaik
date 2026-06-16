import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DownloadSimple,
  FileMd,
  PaintBrush,
  Sparkle,
  TextAa,
  X,
} from '@phosphor-icons/react';
import * as db from '../lib/db';
import { parseDoc, serializeDoc, type DesignDoc, type DesignTokens } from '../lib/designModel';
import type { DesignSystem } from '../types';
import LivePreview from './design/LivePreview';
import TokenControls from './design/TokenControls';
import MarkdownPanel from './design/MarkdownPanel';
import ExportPanel from './design/ExportPanel';
import AiChatPanel from './design/AiChatPanel';

type Tab = 'tokens' | 'docs' | 'ai' | 'export';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'tokens', label: 'Tokens', icon: <PaintBrush size={15} /> },
  { id: 'docs', label: 'Docs', icon: <TextAa size={15} /> },
  { id: 'ai', label: 'AI', icon: <Sparkle size={15} /> },
  { id: 'export', label: 'Export', icon: <DownloadSimple size={15} /> },
];

export default function DesignEditor({
  system,
  initialMarkdown,
  initialImageUrl,
  onSave,
  onClose,
}: {
  system: DesignSystem | null;
  initialMarkdown: string;
  initialImageUrl: string | null;
  onSave: (input: db.DesignInput) => void;
  onClose: () => void;
}) {
  const [doc, setDoc] = useState<DesignDoc>(() => parseDoc(initialMarkdown));
  const [tab, setTab] = useState<Tab>('tokens');
  const [pairAgents, setPairAgents] = useState(system?.pairAgents ?? false);
  const [refPath, setRefPath] = useState<string | null>(system?.referenceImagePath ?? null);
  const [refUrl, setRefUrl] = useState<string | null>(initialImageUrl);

  const sessionUploads = useRef<string[]>([]);
  const originalRef = system?.referenceImagePath ?? null;

  const fullMarkdown = useMemo(() => serializeDoc(doc), [doc]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') cancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setTokens(tokens: DesignTokens) {
    setDoc((d) => ({ ...d, tokens }));
  }

  function applyAiMarkdown(md: string) {
    setDoc(parseDoc(md));
  }

  function changeReference(path: string | null, previewUrl: string | null) {
    if (path) sessionUploads.current.push(path);
    // Drop a previous session upload that is being replaced/removed.
    if (refPath && refPath !== path && sessionUploads.current.includes(refPath)) {
      db.deleteImage(refPath);
      sessionUploads.current = sessionUploads.current.filter((p) => p !== refPath);
    }
    setRefPath(path);
    setRefUrl(previewUrl);
  }

  function cancel() {
    for (const p of sessionUploads.current) {
      if (p !== originalRef) db.deleteImage(p);
    }
    onClose();
  }

  function submit() {
    // Clean up any uploads from this session that aren't the one we're keeping.
    for (const p of sessionUploads.current) {
      if (p !== refPath) db.deleteImage(p);
    }
    onSave({
      name: doc.name.trim() || 'Untitled system',
      content: serializeDoc(doc),
      referenceImagePath: refPath,
      pairAgents,
    });
  }

  return (
    <div className="modal-overlay" onMouseDown={cancel}>
      <div className="ds-editor" onMouseDown={(e) => e.stopPropagation()}>
        <header className="ds-editor-head">
          <div className="ds-editor-title">
            <FileMd size={18} />
            <input
              className="ds-name-input"
              value={doc.name}
              onChange={(e) => setDoc((d) => ({ ...d, name: e.target.value }))}
              placeholder="Design system name"
              aria-label="Design system name"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div className="ds-editor-head-actions">
            <button className="btn primary" onClick={submit}>
              {system ? 'Save changes' : 'Create system'}
            </button>
            <button className="icon-btn" onClick={cancel} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="ds-editor-body">
          <div className="ds-editor-side">
            <nav className="ds-tabbar" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`ds-tab${tab === t.id ? ' on' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>

            <div className="ds-tab-panel">
              {tab === 'tokens' && <TokenControls tokens={doc.tokens} onChange={setTokens} />}
              {tab === 'docs' && (
                <MarkdownPanel
                  body={doc.body}
                  fullMarkdown={fullMarkdown}
                  onBodyChange={(body) => setDoc((d) => ({ ...d, body }))}
                />
              )}
              {tab === 'ai' && (
                <AiChatPanel
                  markdown={fullMarkdown}
                  onApply={applyAiMarkdown}
                  referenceImagePath={refPath}
                  referenceImageUrl={refUrl}
                  onReferenceChange={changeReference}
                />
              )}
              {tab === 'export' && (
                <ExportPanel
                  doc={doc}
                  fullMarkdown={fullMarkdown}
                  pairAgents={pairAgents}
                  onTogglePairAgents={setPairAgents}
                />
              )}
            </div>
          </div>

          <div className="ds-editor-preview">
            <LivePreview tokens={doc.tokens} />
          </div>
        </div>
      </div>
    </div>
  );
}
