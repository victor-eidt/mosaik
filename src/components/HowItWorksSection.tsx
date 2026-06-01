import { useEffect, useRef, useState } from 'react';
import { FolderSimple, Tag, Stack, Lightning } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

/**
 * "How it works" section: a 4-step flow (Capture → Structure → Evolve → Reuse)
 * shown as chevron-interlocked cards, plus a footer note. Matches the hero style.
 */

type Step = { n: string; icon: Icon; title: string; desc: string };

const STEPS: Step[] = [
  { n: '01', icon: FolderSimple, title: 'Capture', desc: 'Save a prompt from a project, chat, or workflow.' },
  { n: '02', icon: Tag, title: 'Structure', desc: 'Add tags, folders, owners, and context so others can understand it.' },
  { n: '03', icon: Stack, title: 'Evolve', desc: 'Version, refine, and compare prompts as the system matures.' },
  { n: '04', icon: Lightning, title: 'Reuse', desc: 'Pull proven prompts back into products, agents, and internal workflows.' },
];

export default function HowItWorksSection() {
  const stepsRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Trigger the left-to-right cascade once the flow is well into view —
  // reinforces the Capture → Reuse direction. The negative bottom rootMargin
  // holds off until the row has scrolled up past the lower viewport edge, so the
  // animation actually plays in front of the user instead of finishing offscreen.
  useEffect(() => {
    const el = stepsRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.4, rootMargin: '0px 0px -18% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="lp-how" id="how">
      <span className="hiw-eyebrow reveal">How it works</span>
      <h2 className="hiw-heading reveal" style={{ '--reveal-delay': '90ms' } as React.CSSProperties}>
        <span className="hiw-strong">From one-off prompt</span>
        <br />
        <span className="hiw-grad">to reusable system.</span>
      </h2>

      <div className={`hiw-steps${inView ? ' in' : ''}`} ref={stepsRef}>
        {STEPS.map((s, i) => (
          <article
            className={`hiw-card${i === 0 ? ' first' : ''}${i === STEPS.length - 1 ? ' last' : ''}`}
            key={s.n}
            style={{ '--i': i } as React.CSSProperties}
          >
            <span className="hiw-num">{s.n}</span>
            <span className="hiw-icon">
              <s.icon size={24} />
            </span>
            <h3 className="hiw-step-title">{s.title}</h3>
            <p className="hiw-step-desc">{s.desc}</p>
          </article>
        ))}
      </div>

      <div className="hiw-foot reveal">
        <img className="hiw-logo" src="/favicon.svg" alt="" aria-hidden="true" />
        <p className="hiw-foot-text">
          Mosaik treats prompts like engineering artifacts — structured,
          searchable, and ready for production.
        </p>
      </div>
    </section>
  );
}
