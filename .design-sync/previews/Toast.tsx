import { useEffect } from 'react';
import { Toast, useToast } from 'mosaik';

// Toast is the provider (ToastProvider). It renders a fixed `.toast-stack`
// (position:fixed; bottom:20px; left:50%) plus its children. Two capture
// realities shape this preview:
//   1) Toasts auto-dismiss after 2400ms on the REAL clock (Playwright's
//      setFixedTime freezes Date, not timers), and the capture's networkidle +
//      font/image settle exceeds that — so a single on-mount push is gone by
//      screenshot. We RE-PUSH every 2000ms (< 2400ms) so a fresh batch always
//      overlaps before the previous expires; the stack is never empty.
//   2) In single-card mode the story root (#r0) carries `transform:translateZ(0)`,
//      which makes it the containing block for the position:fixed stack. If #r0
//      collapses to 0px the stack pins to the top edge and falls outside the
//      framed card (renders blank). So the provider wraps a full-viewport stage
//      (min-height:100vh) — #r0 fills the card and `bottom:20px` lands at the
//      visible bottom.

// mosaik tokens live under :root[data-theme='dark'|'light'] — with no attribute
// they're undefined. Apply the signature dark theme to the document + body.
function useDark() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.background = '#0a0a0a';
  }, []);
}

function Pusher({ items }) {
  const push = useToast();
  useEffect(() => {
    const fire = () => items.forEach(([message, kind]) => push(message, kind));
    fire();
    const id = window.setInterval(fire, 2000);
    return () => window.clearInterval(id);
  }, [push]);
  return null;
}

function Stage({ items }) {
  useDark();
  return (
    <Toast>
      {/* Empty full-height stage: gives the position:fixed .toast-stack a
          filled containing block so it anchors at the visible bottom, and lets
          the toasts float on the dark surface exactly as they do in-app. */}
      <div style={{ minHeight: '100vh', background: 'var(--bg)', boxSizing: 'border-box' }} />
      <Pusher items={items} />
    </Toast>
  );
}

export const Stack = () => (
  <Stage
    items={[
      ['Prompt copied to clipboard', 'success'],
      ['Draft saved', 'info'],
      ['Upload failed: image is larger than 10 MB', 'error'],
    ]}
  />
);

export const Success = () => (
  <Stage items={[['“Cold email writer” duplicated', 'success']]} />
);
