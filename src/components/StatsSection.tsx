import { useEffect, useRef, useState } from 'react';
import { Lightning, TrendUp, ClockCounterClockwise, UsersThree } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

/**
 * "Value props" section: a two-tone display heading + a 2×2 grid of stat cards.
 * Matches the hero style. Sauce: metallic gradient numbers that count up when the
 * section scrolls into view, and a spotlight glow that follows the cursor per card.
 */

type Card = {
  icon: Icon;
  big: string;
  unit?: string;
  numeric?: boolean;
  sub: string;
  subDim?: string;
  desc: string;
};

const CARDS: Card[] = [
  { icon: Lightning, big: '68', unit: '%', numeric: true, sub: 'faster prompt retrieval', desc: 'Teams find the right prompt in seconds, not threads.' },
  { icon: TrendUp, big: '3.2', unit: '×', numeric: true, sub: 'more prompt reuse', desc: 'High-quality prompts spread across projects instead of being rebuilt.' },
  { icon: ClockCounterClockwise, big: 'Version history', sub: 'for every ', subDim: 'change', desc: 'See what changed, why it changed, and who changed it.' },
  { icon: UsersThree, big: 'One source', sub: '', subDim: 'of truth', desc: 'Shared prompt systems replace scattered personal notes.' },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts from 0 to `target` (eased) once `active` flips true. */
function useCountUp(target: number, decimals: number, active: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) {
      setVal(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target]);
  return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
}

function StatCard({ c, animate }: { c: Card; animate: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const count = useCountUp(
    c.numeric ? parseFloat(c.big) : 0,
    c.numeric && c.big.includes('.') ? 1 : 0,
    animate && !!c.numeric
  );
  const big = c.numeric ? count : c.big;

  // Spotlight follows the cursor — write CSS vars directly (no re-render).
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mx', '28%');
    el.style.setProperty('--my', '18%');
  };

  return (
    <article className="vs-card" ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}>
      <span className="vs-icon">
        <c.icon size={24} />
      </span>
      <div className="vs-content">
        <div className={`vs-big${c.numeric ? '' : ' text'}`}>
          {big}
          {c.unit && <span className="vs-unit">{c.unit}</span>}
        </div>
        <div className="vs-sub">
          {c.sub}
          {c.subDim && <span className="vs-sub-dim">{c.subDim}</span>}
        </div>
        <span className="vs-divider" />
        <p className="vs-desc">{c.desc}</p>
      </div>
    </article>
  );
}

export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
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
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="lp-stats" ref={sectionRef}>
      <h2 className="vs-title reveal">
        <span className="vs-dim">Prompts become </span>
        <span className="vs-strong">more valuable</span>
        <br className="vs-br" />{' '}
        <span className="vs-dim">when they </span>
        <span className="vs-strong">stop living in chat history.</span>
      </h2>
      <p className="vs-lede reveal" style={{ '--reveal-delay': '120ms' } as React.CSSProperties}>
        Mosaik turns one-off prompts into reusable systems that your team can
        find, trust, and build on—every day.
      </p>

      <div className="vs-grid">
        {CARDS.map((c) => (
          <StatCard key={c.big} c={c} animate={inView} />
        ))}
      </div>
    </section>
  );
}
