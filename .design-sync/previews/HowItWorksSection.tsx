import { useEffect, useRef } from 'react';
import { HowItWorksSection } from 'mosaik';

// Full-width landing section: a 4-step flow (Capture → Structure → Evolve →
// Reuse) of chevron-interlocked cards under a two-tone heading, plus a footer
// note. Landing-section recipe: apply the dark theme and activate `.reveal`
// (eyebrow/heading/footer). The step cards are additionally hidden until
// `.hiw-steps.in` (set by the component's own IntersectionObserver, which
// doesn't fire in the headless capture), so activate that here too.
function RevealStage({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.background = '#0a0a0a';
    ref.current?.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    ref.current?.querySelectorAll('.hiw-steps').forEach((el) => el.classList.add('in'));
  }, []);
  return (
    <div ref={ref} style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {children}
    </div>
  );
}

export const Default = () => (
  <RevealStage>
    <HowItWorksSection />
  </RevealStage>
);
