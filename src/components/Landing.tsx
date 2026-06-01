import { lazy, Suspense, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import MarqueeSection from './MarqueeSection';
import WorkspaceSection from './WorkspaceSection';
import StatsSection from './StatsSection';
import HowItWorksSection from './HowItWorksSection';
import WhySection from './WhySection';
import CtaSection from './CtaSection';
import Footer from './Footer';
// Heavy three.js bundle — code-split so it never weighs on the first paint.
const MosaikLogo3D = lazy(() => import('./MosaikLogo3D'));

type Props = {
  /** Enter the auth flow (used by every call-to-action on the page). */
  onEnter: () => void;
};

/**
 * The reserved stage for the 3D Mosaik mark. The canvas is only imported and
 * mounted once the stage scrolls into view, keeping the initial load light.
 */
function HeroStage({
  spinRef,
  onReady,
}: {
  spinRef: MutableRefObject<number>;
  onReady: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActive(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp-stage" aria-hidden="true" ref={ref}>
      {active && (
        <Suspense fallback={null}>
          <MosaikLogo3D transparent spinRef={spinRef} onReady={onReady} />
        </Suspense>
      )}
    </div>
  );
}

/**
 * Marketing landing page shown to logged-out visitors. The hero recreates the
 * approved design reference: centered display headline, twin CTAs, a reserved
 * stage for the 3D Mosaik mark, plus the scroll cue and blurb in the corners.
 *
 * Not to be confused with `LandingSpace` — the in-app library of landing-page
 * design references.
 */
export default function Landing({ onEnter }: Props) {
  // Scroll progress (0→1) over the sticky-hero range, written to a ref so the 3D
  // canvas can read it in its render loop without re-rendering React on scroll.
  const spinRef = useRef(0);

  // The branded loader covers the page until the 3D mark has loaded + painted, so
  // the hero doesn't flash in before the mark. A timeout is the safety net for
  // slow loads or missing WebGL, so the page is never trapped behind the loader.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 8000);
    return () => clearTimeout(t);
  }, []);

  // Lock page scroll while the loader is up so nothing moves behind it. Hiding the
  // scrollbar would widen the content and shift it sideways, so we pad the gutter
  // by the scrollbar's width — the layout width never changes, no twitch on release.
  useEffect(() => {
    if (ready) return;
    const root = document.documentElement;
    const scrollbar = window.innerWidth - root.clientWidth;
    const prevOverflow = root.style.overflow;
    const prevPad = root.style.paddingRight;
    root.style.overflow = 'hidden';
    if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
    return () => {
      root.style.overflow = prevOverflow;
      root.style.paddingRight = prevPad;
    };
  }, [ready]);

  // One shared observer drives every `.reveal` on the page: when an element
  // enters view it gets `.in` (and is unobserved). Cheap, and adds no extra DOM.
  // Held until `ready` so the hero copy reveals as the loader clears, not behind it.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ready) return;
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll('.reveal'));
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ready]);
  useEffect(() => {
    const update = () => {
      // Anchored to one viewport so the mark completes its spin as the hero
      // scrolls away — independent of how tall the rest of the page gets.
      const range = window.innerHeight;
      const p = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
      spinRef.current = window.matchMedia('(min-width: 901px)').matches ? p : 0;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="lp" ref={rootRef}>
      {/* Branded loader — covers the page until the 3D mark is ready, then fades. */}
      <div className={`lp-loader${ready ? ' done' : ''}`} aria-hidden="true">
        <div className="lp-loader-ring">
          <span className="lp-loader-mark" />
        </div>
      </div>

      {/* Subtle film grain over the whole page. */}
      <div className="lp-grain" aria-hidden="true" />

      <section className="lp-hero" id="top">
        <header className="lp-nav">
          <a className="lp-brand" href="#top" aria-label="Mosaik home" />

          <nav className="lp-nav-pill" aria-label="Primary">
            <a href="#workspace">Workspace</a>
            <a href="#how">How it works</a>
            <a href="#why">Why Mosaik</a>
          </nav>

          <button className="lp-btn lp-btn-light" onClick={onEnter}>
            Get started
            <span className="lp-btn-circle" aria-hidden="true">
              <ArrowRight size={16} />
            </span>
          </button>
        </header>

        <div className="lp-hero-inner">
          <h1 className="lp-title reveal">
            <span className="lp-line lp-dim">Your prompts.</span>
            <span className="lp-line">
              <span className="lp-strong">Structured. Reusable. Powerful.</span>
            </span>
          </h1>

          <div className="lp-actions reveal" style={{ '--reveal-delay': '150ms' } as React.CSSProperties}>
            <button className="lp-btn lp-btn-light" onClick={onEnter}>
              Start with Mosaik
              <span className="lp-btn-circle" aria-hidden="true">
                <ArrowRight size={16} />
              </span>
            </button>
            <button className="lp-btn lp-btn-dark" onClick={onEnter}>
              Explore the library
            </button>
          </div>
        </div>

        {/* The 3D Mosaik mark, lazily mounted once in view. */}
        <HeroStage spinRef={spinRef} onReady={() => setReady(true)} />

        <div className="lp-scroll" aria-hidden="true">
          <span className="lp-scroll-label">Scroll down</span>
          <span className="lp-scroll-line" />
        </div>

        <p className="lp-blurb reveal" style={{ '--reveal-delay': '300ms' } as React.CSSProperties}>
          Mosaik turns one-off prompts into <u>reusable</u> engineering assets.
          Build, organize, version, <strong>and</strong> retrieve what your team
          relies on.
        </p>
      </section>

      <MarqueeSection />

      <WorkspaceSection />

      <StatsSection />

      <HowItWorksSection />

      <WhySection />

      <CtaSection onEnter={onEnter} />

      <Footer />
    </div>
  );
}
