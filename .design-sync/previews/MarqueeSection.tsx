import { useEffect, useRef } from 'react';
import { MarqueeSection } from 'mosaik';

// Full-width landing section: two rows of dashboard cards (prompts, tweets, UI
// mocks) on a scroll-driven horizontal marquee. In isolation there's no scroll,
// so the rows render at their initial transform — the static card wall is the
// point. Landing-section recipe: apply the dark theme and activate `.reveal`
// (a shared IntersectionObserver adds `.in` on the live page).
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
    <MarqueeSection />
  </RevealStage>
);
