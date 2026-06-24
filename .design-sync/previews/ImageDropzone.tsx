import { useEffect } from 'react';
import { ImageDropzone } from 'mosaik';

// ImageDropzone is the drag/paste/click uploader. With imageUrl=null it shows
// the empty drop state; with an imageUrl set it shows the image preview + remove
// button. Handlers are no-ops here and paste is disabled so nothing fires.

const noop = () => {};

// A small inline SVG (data-URI) stands in for an uploaded reference image so the
// preview+remove state renders without any network/storage.
const sampleImage =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#7c5cff"/>
          <stop offset="1" stop-color="#22d3ee"/>
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#g)"/>
      <text x="160" y="108" font-family="sans-serif" font-size="20" font-weight="700"
        fill="#0a0a0a" text-anchor="middle">landing reference</text>
    </svg>`
  );

// mosaik tokens live under :root[data-theme='dark'|'light'] — apply the
// signature dark theme to the document + body so they resolve.
function Stage({ children }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.background = '#0a0a0a';
  }, []);
  return (
    <div
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        padding: 28,
        minHeight: 180,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 360 }}>{children}</div>
    </div>
  );
}

export const Empty = () => (
  <Stage>
    <ImageDropzone
      imageUrl={null}
      onUploaded={noop}
      onRemove={noop}
      enablePaste={false}
    />
  </Stage>
);

export const WithImage = () => (
  <Stage>
    <ImageDropzone
      imageUrl={sampleImage}
      onUploaded={noop}
      onRemove={noop}
      enablePaste={false}
    />
  </Stage>
);
