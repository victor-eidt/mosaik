import { useEffect, useRef } from 'react';
import { WorkspaceSection } from 'mosaik';

// Full-width landing section: marketing copy on the left, a static mockup of the
// Mosaik dashboard on the right (sidebar + prompt list + detail pane with a
// version history), and three feature columns below. The detail pane has an
// inView-gated typewriter; in isolation it animates and the capture lands near
// the final text — fine. The section is tall (full marketing block) by design.
// Landing-section recipe: apply the dark theme and activate `.reveal`.
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
    <WorkspaceSection />
  </RevealStage>
);
