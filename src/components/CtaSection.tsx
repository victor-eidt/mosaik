import { Sparkle, ArrowRight, ArrowUpRight } from '@phosphor-icons/react';

type Props = {
  /** Enter the auth flow (same as the hero CTAs). */
  onEnter: () => void;
};

/**
 * Closing CTA: an inverted light card floating on the dark page. Mirrors the hero
 * button styling (inverted — dark primary on the light card) and Sora type. Sauce:
 * a gradient + radial sheen + a big soft shadow so the card lifts off the page.
 */
export default function CtaSection({ onEnter }: Props) {
  return (
    <section className="lp-cta">
      <div className="cta-card">
        <div className="cta-inner">
          <span className="cta-logo reveal" role="img" aria-label="Mosaik" />

          <h2 className="cta-heading reveal" style={{ '--reveal-delay': '90ms' } as React.CSSProperties}>
            Treat prompts like
            <br />
            engineering assets.
          </h2>

          <p className="cta-sub reveal" style={{ '--reveal-delay': '180ms' } as React.CSSProperties}>
            Mosaik gives engineering teams one structured place to build,
            organize, version, and reuse high-quality prompts.
          </p>

          <div className="cta-actions reveal" style={{ '--reveal-delay': '260ms' } as React.CSSProperties}>
            <button className="cta-btn cta-btn-dark" onClick={onEnter}>
              <Sparkle size={16} weight="fill" />
              Start with Mosaik
              <ArrowRight size={16} weight="bold" />
            </button>
            <button className="cta-btn cta-btn-light" onClick={onEnter}>
              Read the docs
              <ArrowUpRight size={16} weight="bold" />
            </button>
          </div>

          <div className="cta-divider" />
          <p className="cta-foot reveal" style={{ '--reveal-delay': '340ms' } as React.CSSProperties}>
            Mosaik Library — the shared workspace for engineering prompts.
          </p>
        </div>
      </div>
    </section>
  );
}
