import { useEffect, useRef } from 'react';
import { Sparkle, StackSimple, ArrowsClockwise } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

// Parallax depth for the giant mark — how far (px) it drifts vertically across the
// full scroll-through, plus a rotation/scale to sell the depth.
const PARALLAX_Y = 300;
const PARALLAX_ROT = 8;
const PARALLAX_SCALE = 0.14;

/**
 * "Why Mosaik exists" manifesto section: big two-tone statement, supporting copy,
 * three principles, and a large faded Mosaik mark on the right (built from the
 * brand mark via a CSS mask, so its tint/gradient is controllable). Hero style.
 */

const POINTS: { icon: Icon; label: string }[] = [
  { icon: Sparkle, label: 'Clarity over clutter' },
  { icon: StackSimple, label: 'Systems over scraps' },
  { icon: ArrowsClockwise, label: 'Reusable by default' },
];

export default function WhySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const markRef = useRef<HTMLDivElement>(null);

  // Scroll-driven parallax: the mark moves slower than the copy (and rotates/scales
  // a touch) for depth. rAF-throttled, writes CSS vars directly — no re-render.
  useEffect(() => {
    const section = sectionRef.current;
    const mark = markRef.current;
    if (!section || !mark) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 as the section's top hits the viewport bottom, 1 as its bottom leaves the top
      const progress = (vh - rect.top) / (vh + rect.height);
      const p = Math.max(0, Math.min(1, progress)) - 0.5; // -0.5 .. 0.5
      mark.style.setProperty('--py', `${p * PARALLAX_Y}px`);
      mark.style.setProperty('--pr', `${p * PARALLAX_ROT}deg`);
      mark.style.setProperty('--ps', `${1 + p * PARALLAX_SCALE}`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="lp-why" id="why" ref={sectionRef}>
      <div className="why-content">
        <span className="why-eyebrow reveal">Why Mosaik exists</span>
        <h2 className="why-heading reveal" style={{ '--reveal-delay': '90ms' } as React.CSSProperties}>
          <span className="why-strong">Prompts are</span>
          <br />
          <span className="why-grad">engineering artifacts.</span>
        </h2>
        <p className="why-body reveal" style={{ '--reveal-delay': '180ms' } as React.CSSProperties}>
          They deserve structure, history, and a place to live. Mosaik exists for
          teams who build with AI and need their prompts to be searchable,
          reviewable, and reusable — not buried in notes, chats, or scattered docs.
        </p>
        <ul className="why-points reveal" style={{ '--reveal-delay': '260ms' } as React.CSSProperties}>
          {POINTS.map((p) => (
            <li className="why-point" key={p.label}>
              <p.icon size={20} weight="regular" />
              <span>{p.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="why-mark" aria-hidden="true" ref={markRef} />
    </section>
  );
}
