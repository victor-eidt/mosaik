import { GithubLogo, XLogo, LinkedinLogo } from '@phosphor-icons/react';

/**
 * Site footer for the landing page. Dark, matches the hero style. Sauce: a giant
 * faded brand wordmark across the bottom (brand mark via CSS mask), behind the
 * link columns.
 */

const COLUMNS: { title: string; links: string[] }[] = [
  { title: 'Product', links: ['Library', 'Folders & tags', 'Version history', 'Search'] },
  { title: 'Resources', links: ['Docs', 'Changelog', 'Guides', 'API'] },
  { title: 'Company', links: ['About', 'Pricing', 'Careers', 'Contact'] },
  { title: 'Legal', links: ['Privacy', 'Terms', 'Security'] },
];

const SOCIAL = [
  { icon: GithubLogo, label: 'GitHub' },
  { icon: XLogo, label: 'X' },
  { icon: LinkedinLogo, label: 'LinkedIn' },
];

export default function Footer() {
  return (
    <footer className="lp-footer">
      <div className="ft-wrap">
        <div className="ft-top">
          <div className="ft-brand reveal">
            <span className="ft-logo" role="img" aria-label="Mosaik" />
            <p className="ft-tagline">
              The shared workspace for engineering prompts — structured,
              searchable, and built to reuse.
            </p>
            <div className="ft-social">
              {SOCIAL.map((s) => (
                <a key={s.label} className="ft-social-btn" href="#" aria-label={s.label}>
                  <s.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <nav className="ft-cols" aria-label="Footer">
            {COLUMNS.map((col, i) => (
              <div
                className="ft-col reveal"
                key={col.title}
                style={{ '--reveal-delay': `${i * 80}ms` } as React.CSSProperties}
              >
                <h4 className="ft-col-title">{col.title}</h4>
                {col.links.map((l) => (
                  <a key={l} className="ft-link" href="#">
                    {l}
                  </a>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="ft-bottom reveal">
          <span>© 2026 Mosaik. All rights reserved.</span>
          <span className="ft-made">Built for teams who build with AI.</span>
        </div>
      </div>

      <div className="ft-watermark" aria-hidden="true" />
    </footer>
  );
}
