import { useEffect, useRef, useState } from 'react';
import { ImageSquare, Spinner, X } from '@phosphor-icons/react';
import { useToast } from './Toast';
import * as db from '../lib/db';

const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  /** Current preview URL (signed URL or object URL), or null. */
  imageUrl: string | null;
  /** Called after a successful upload with the new storage path + local preview URL. */
  onUploaded: (path: string, previewUrl: string) => void;
  /** Called when the user removes the image. */
  onRemove: () => void;
  /** Listen for clipboard paste of an image while mounted. */
  enablePaste?: boolean;
}

/** Drag / paste / click image uploader backed by Supabase Storage. */
export default function ImageDropzone({ imageUrl, onUploaded, onRemove, enablePaste }: Props) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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
      onUploaded(path, URL.createObjectURL(file));
    } catch (e) {
      toast(`Upload failed: ${(e as Error).message}`, 'error');
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (!enablePaste) return;
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
  }, [enablePaste]);

  if (imageUrl) {
    return (
      <div className="image-preview">
        <img src={imageUrl} alt="Attached" />
        <button type="button" className="image-remove" onClick={onRemove} title="Remove image">
          <X size={15} weight="bold" />
        </button>
      </div>
    );
  }

  return (
    <>
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
    </>
  );
}
