import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BracketsCurly,
  ImageSquare,
  Link as LinkIcon,
  Layout,
  Spinner,
  TrashSimple,
  X,
} from '@phosphor-icons/react';
import type { Folder, LinkItem, Prompt } from '../types';
import { extractVars } from '../lib/template';
import { useToast } from './Toast';
import Dropdown from './Dropdown';
import * as db from '../lib/db';

export interface DraftPrompt {
  title: string;
  body: string;
  notes: string;
  tags: string[];
  folderId: string | null;
  imagePath: string | null;
  links: LinkItem[];
  refLinks: LinkItem[];
}

/** Editable list of {label, url} rows used for both link sections. */
function LinkListEditor({
  items,
  onChange,
  addLabel,
  icon,
}: {
  items: LinkItem[];
  onChange: (next: LinkItem[]) => void;
  addLabel: string;
  icon: React.ReactNode;
}) {
  function update(i: number, patch: Partial<LinkItem>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, { label: '', url: '' }]);
  }

  return (
    <div className="link-editor">
      {items.map((it, i) => (
        <div className="link-row" key={i}>
          <input
            className="link-label-input"
            value={it.label}
            placeholder="Label"
            onChange={(e) => update(i, { label: e.target.value })}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
          <input
            className="link-url-input"
            type="url"
            value={it.url}
            placeholder="https://…"
            onChange={(e) => update(i, { url: e.target.value })}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
          <button type="button" className="icon-btn danger" title="Remove" onClick={() => remove(i)}>
            <TrashSimple size={15} />
          </button>
        </div>
      ))}
      <button type="button" className="btn ghost sm add-link" onClick={add}>
        {icon}
        {addLabel}
      </button>
    </div>
  );
}

interface Props {
  /** The prompt being edited, or null when creating a new one. */
  prompt: Prompt | null;
  folders: Folder[];
  /** Folder to preselect for a new prompt. */
  defaultFolderId: string | null;
  /** Signed URL for the prompt's existing image, if any. */
  initialImageUrl: string | null;
  onSave: (draft: DraftPrompt) => void;
  onClose: () => void;
}

const MAX_BYTES = 10 * 1024 * 1024;

export default function PromptEditor({
  prompt,
  folders,
  defaultFolderId,
  initialImageUrl,
  onSave,
  onClose,
}: Props) {
  const toast = useToast();
  const [title, setTitle] = useState(prompt?.title ?? '');
  const [body, setBody] = useState(prompt?.body ?? '');
  const [notes, setNotes] = useState(prompt?.notes ?? '');
  const [tagText, setTagText] = useState((prompt?.tags ?? []).join(', '));
  const [folderId, setFolderId] = useState<string | null>(prompt?.folderId ?? defaultFolderId);
  const [links, setLinks] = useState<LinkItem[]>(prompt?.links ?? []);
  const [refLinks, setRefLinks] = useState<LinkItem[]>(prompt?.refLinks ?? []);

  // Image state. imagePath is what gets saved; imageUrl is what we preview.
  const [imagePath, setImagePath] = useState<string | null>(prompt?.imagePath ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Every path uploaded during this editing session, so we can clean up orphans.
  const sessionUploads = useRef<string[]>([]);
  const originalPath = prompt?.imagePath ?? null;

  const vars = useMemo(() => extractVars(body), [body]);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('That file is not an image', 'error');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast('Image is larger than 10 MB', 'error');
      return;
    }
    setUploading(true);
    try {
      const path = await db.uploadImage(file);
      sessionUploads.current.push(path);
      setImagePath(path);
      setImageUrl(URL.createObjectURL(file)); // instant local preview
    } catch (e) {
      toast(`Upload failed: ${(e as Error).message}`, 'error');
    } finally {
      setUploading(false);
    }
  }

  function removeImage() {
    // If the current image was uploaded this session, drop it from storage now.
    if (imagePath && sessionUploads.current.includes(imagePath)) {
      db.deleteImage(imagePath);
      sessionUploads.current = sessionUploads.current.filter((p) => p !== imagePath);
    }
    setImagePath(null);
    setImageUrl(null);
  }

  // Paste an image from the clipboard anywhere in the editor.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
      if (item) {
        e.preventDefault();
        handleFile(item.getAsFile());
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') cancel();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, notes, tagText, folderId, imagePath, links, refLinks]);

  function cancel() {
    // Discard any images uploaded this session that we're not keeping.
    for (const p of sessionUploads.current) {
      if (p !== originalPath) db.deleteImage(p);
    }
    onClose();
  }

  function submit() {
    // Remove superseded session uploads (kept only the final imagePath).
    for (const p of sessionUploads.current) {
      if (p !== imagePath) db.deleteImage(p);
    }
    const tags = tagText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    // Drop empty rows; keep a row if it has at least a URL or a label.
    const clean = (list: LinkItem[]) =>
      list
        .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
        .filter((l) => l.url || l.label);
    onSave({
      title: title.trim(),
      body,
      notes: notes.trim(),
      tags,
      folderId,
      imagePath,
      links: clean(links),
      refLinks: clean(refLinks),
    });
  }

  return (
    <div className="modal-overlay" onMouseDown={cancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{prompt ? 'Edit prompt' : 'New prompt'}</h2>
          <button className="icon-btn" onClick={cancel} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <label className="field">
            <span>Title</span>
            <input
              autoFocus
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blog post outline"
            />
          </label>

          <label className="field">
            <span>Prompt</span>
            <textarea
              className="body-area"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your prompt here. Use {{placeholders}} for variables."
              rows={10}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
            {vars.length > 0 && (
              <div className="var-hint">
                <BracketsCurly size={13} weight="bold" />
                <span>Variables:</span>
                {vars.map((v) => (
                  <code key={v} className="var-pill">
                    {v}
                  </code>
                ))}
              </div>
            )}
          </label>

          <div className="field">
            <span>Result image (optional)</span>
            {imageUrl ? (
              <div className="image-preview">
                <img src={imageUrl} alt="Attached result" />
                <button
                  type="button"
                  className="image-remove"
                  onClick={removeImage}
                  title="Remove image"
                >
                  <X size={15} weight="bold" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`dropzone${dragOver ? ' over' : ''}`}
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
              >
                {uploading ? (
                  <>
                    <Spinner size={22} className="spin" />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <ImageSquare size={22} />
                    <span>
                      <strong>Drag an image here</strong>, paste, or click to choose
                    </span>
                    <span className="dropzone-sub">PNG, JPG, WebP, GIF · up to 10 MB</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <span>Folder</span>
              <Dropdown
                className="field-dropdown"
                ariaLabel="Folder"
                value={folderId ?? ''}
                options={[
                  { value: '', label: 'Uncategorized' },
                  ...folders.map((f) => ({ value: f.id, label: f.name })),
                ]}
                onChange={(v) => setFolderId(v || null)}
              />
            </div>

            <label className="field">
              <span>Tags (comma-separated)</span>
              <input
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                placeholder="summary, gpt, draft"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
            </label>
          </div>

          <label className="field">
            <span>Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="When to use it, what to swap in, etc."
              rows={3}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </label>

          <div className="field">
            <span>Links úteis</span>
            <LinkListEditor
              items={links}
              onChange={setLinks}
              addLabel="Adicionar link"
              icon={<LinkIcon size={14} weight="bold" />}
            />
          </div>

          <div className="field">
            <span>LPs de referência de design</span>
            <LinkListEditor
              items={refLinks}
              onChange={setRefLinks}
              addLabel="Adicionar referência"
              icon={<Layout size={14} weight="bold" />}
            />
          </div>
        </div>

        <footer className="modal-foot">
          <span className="hint">Tip: ⌘/Ctrl + Enter to save · Esc to close</span>
          <div className="modal-actions">
            <button className="btn ghost" onClick={cancel}>
              Cancel
            </button>
            <button className="btn primary" onClick={submit} disabled={uploading}>
              Save
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
