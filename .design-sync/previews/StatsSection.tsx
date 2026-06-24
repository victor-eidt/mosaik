import { useEffect, useRef } from 'react';
import { StatsSection } from 'mosaik';

// Landing-section recipe. Two things differ from the live page:
//  1. `.reveal` elements start hidden; a shared IntersectionObserver in
//     Landing.tsx adds `.in` on scroll. In isolation we activate them on mount.
//  2. The preview <body> is white; mosaik's landing is dark, so we wrap in a
//     `var(--bg)` surface. Rendered cardMode "column" (full card width).
function RevealStage({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.background = '#0a0a0a';
    ref.current?.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
  }, []);
  return (
    <div ref={ref} style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {children}
    </div>
  );
}

export const Default = () => (
  <RevealStage>
    <StatsSection />
  </RevealStage>
);
