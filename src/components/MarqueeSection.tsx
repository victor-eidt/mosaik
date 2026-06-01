import { useEffect, useRef } from 'react';
import { Copy, Star, MagnifyingGlass, UploadSimple } from '@phosphor-icons/react';

/**
 * Scroll-driven marquee. Two rows of simplified dashboard cards (prompts, UI
 * components, tweets). Row 1 moves right, row 2 moves left, both driven by the
 * page scroll position. Each row's cards are tripled so the wrap is seamless.
 */

type MockKind = 'toggle' | 'chart' | 'form' | 'palette' | 'toasts' | 'kanban' | 'settings' | 'upload';

type CardData =
  | { kind: 'prompt'; title: string; body: string; tags: string[] }
  | { kind: 'tweet'; handle: string; text: string }
  | { kind: 'ui'; name: string; mock: MockKind };

// 21 cards — first 11 in row 1, remaining 10 in row 2.
const CARDS: CardData[] = [
  { kind: 'prompt', title: 'Senior code reviewer', body: 'Review the diff for correctness bugs and edge cases. Cite file:line and flag anything risky before it ships.', tags: ['eng', 'review'] },
  { kind: 'tweet', handle: '@lena_builds', text: 'shipped our prompt library to the whole team today — no more digging through old Slack threads.' },
  { kind: 'ui', name: 'Pricing toggle', mock: 'toggle' },
  { kind: 'prompt', title: 'Cold email writer', body: 'Write a 3-sentence cold email to {{prospect}}: a specific observation, one line of value, a soft CTA.', tags: ['sales', 'copy'] },
  { kind: 'tweet', handle: '@deploys_at_3am', text: 'reusable prompts beat clever one-offs. structure wins every time.' },
  { kind: 'ui', name: 'Stats dashboard', mock: 'chart' },
  { kind: 'prompt', title: 'SQL explainer', body: 'Explain this query in plain English. Note the indexes it relies on and any full-table scans.', tags: ['data', 'sql'] },
  { kind: 'ui', name: 'Auth modal', mock: 'form' },
  { kind: 'tweet', handle: '@minah_css', text: 'the metallic hero on this landing page is unreal. who approved this much polish' },
  { kind: 'prompt', title: 'Release notes', body: 'Turn this changelog into friendly release notes. Group by feature, fix, and chore. Keep it skimmable.', tags: ['product'] },
  { kind: 'ui', name: 'Command palette', mock: 'palette' },
  // row 2
  { kind: 'prompt', title: 'Bug repro', body: 'Given {{stack_trace}}, propose the most likely root cause and a minimal reproduction.', tags: ['eng', 'debug'] },
  { kind: 'tweet', handle: '@grids_n_vibes', text: 'organizing prompts by folder changed how my team ships. tiny habit, huge payoff.' },
  { kind: 'ui', name: 'Toast stack', mock: 'toasts' },
  { kind: 'prompt', title: 'Landing hero lines', body: 'Draft 3 hero headlines — structured, reusable, powerful. Vary the rhythm and the emphasis.', tags: ['copy', 'web'] },
  { kind: 'ui', name: 'Kanban board', mock: 'kanban' },
  { kind: 'tweet', handle: '@theo_designs', text: 'rounded corners, object-cover, a slow marquee = instant premium feel. do not overthink it.' },
  { kind: 'prompt', title: 'Meeting summary', body: 'Summarize {{transcript}} into decisions, owners, and next steps. One line each.', tags: ['ops'] },
  { kind: 'ui', name: 'Settings panel', mock: 'settings' },
  { kind: 'prompt', title: 'Tweet rewriter', body: 'Rewrite {{draft}} into a punchy tweet under 240 characters. Keep the hook, drop the filler.', tags: ['social'] },
  { kind: 'ui', name: 'File uploader', mock: 'upload' },
];

const ROW1 = CARDS.slice(0, 11);
const ROW2 = CARDS.slice(11);

/** Tiny visual mock that hints at each UI component (instead of blank skeletons). */
function UiMock({ kind }: { kind: MockKind }) {
  switch (kind) {
    case 'toggle':
      return (
        <div className="mq-ui-mock mqm-toggle">
          <div className="mqm-seg">
            <span>Monthly</span>
            <span className="on">Yearly</span>
          </div>
          <span className="mqm-price">$0</span>
        </div>
      );
    case 'chart':
      return (
        <div className="mq-ui-mock mqm-chart">
          {[42, 68, 38, 86, 54, 96, 60].map((h, i) => (
            <span key={i} className="mqm-bar" style={{ height: `${h}%` }} />
          ))}
        </div>
      );
    case 'form':
      return (
        <div className="mq-ui-mock mqm-form">
          <span className="mqm-input" />
          <span className="mqm-input" />
          <span className="mqm-submit" />
        </div>
      );
    case 'palette':
      return (
        <div className="mq-ui-mock mqm-palette">
          <div className="mqm-search">
            <MagnifyingGlass size={15} weight="bold" />
            <span className="mqm-search-ph" />
          </div>
          <span className="mqm-row" style={{ width: '88%' }} />
          <span className="mqm-row" style={{ width: '66%' }} />
          <span className="mqm-row" style={{ width: '74%' }} />
        </div>
      );
    case 'toasts':
      return (
        <div className="mq-ui-mock mqm-toasts">
          {[1, 0.7, 0.4].map((o, i) => (
            <div key={i} className="mqm-toast" style={{ opacity: o }}>
              <span className="dot" />
              <span className="ln" />
            </div>
          ))}
        </div>
      );
    case 'kanban':
      return (
        <div className="mq-ui-mock mqm-kanban">
          {[2, 3, 1].map((n, i) => (
            <div key={i} className="mqm-col">
              {Array.from({ length: n }).map((_, j) => (
                <span key={j} className="mqm-tile" />
              ))}
            </div>
          ))}
        </div>
      );
    case 'settings':
      return (
        <div className="mq-ui-mock mqm-settings">
          {[true, false, true].map((on, i) => (
            <div key={i} className="mqm-set-row">
              <span className="lbl" style={{ width: `${[58, 44, 64][i]}%` }} />
              <span className={`mqm-switch${on ? ' on' : ''}`} />
            </div>
          ))}
        </div>
      );
    case 'upload':
      return (
        <div className="mq-ui-mock mqm-upload">
          <UploadSimple size={26} weight="bold" />
          <span>Drop files to upload</span>
        </div>
      );
  }
}

function Card({ c }: { c: CardData }) {
  if (c.kind === 'prompt') {
    const useLabel = c.body.includes('{{') ? 'Use' : 'Copy';
    return (
      <article className="mq-card">
        <header className="mq-card-head">
          <span className="mq-kicker">Prompt</span>
          <Star size={16} className="mq-star" />
        </header>
        <h3 className="mq-title">{c.title}</h3>
        <p className="mq-body">{c.body}</p>
        <div className="mq-foot">
          <div className="mq-tags">
            {c.tags.map((t) => (
              <span key={t} className="mq-tag">{t}</span>
            ))}
          </div>
          <span className="mq-copy">
            <Copy size={14} weight="bold" />
            {useLabel}
          </span>
        </div>
      </article>
    );
  }
  if (c.kind === 'tweet') {
    return (
      <article className="mq-card mq-tweet">
        <div className="mq-tweet-head">
          <span className="mq-avatar" aria-hidden="true" />
          <span className="mq-handle">{c.handle}</span>
        </div>
        <p className="mq-tweet-text">{c.text}</p>
      </article>
    );
  }
  return (
    <article className="mq-card mq-ui">
      <span className="mq-kicker">UI component</span>
      <h3 className="mq-title">{c.name}</h3>
      <UiMock kind={c.mock} />
    </article>
  );
}

export default function MarqueeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const row1 = useRef<HTMLDivElement>(null);
  const row2 = useRef<HTMLDivElement>(null);
  const set1 = useRef(0); // width of one (un-tripled) set, row 1
  const set2 = useRef(0);
  const top = useRef(0); // section's absolute top

  useEffect(() => {
    const measure = () => {
      if (row1.current) set1.current = row1.current.scrollWidth / 3;
      if (row2.current) set2.current = row2.current.scrollWidth / 3;
      if (sectionRef.current) {
        top.current = sectionRef.current.getBoundingClientRect().top + window.scrollY;
      }
    };
    const onScroll = () => {
      const offset = (window.scrollY - top.current + window.innerHeight) * 0.3;
      if (row1.current && set1.current) {
        const m = ((offset % set1.current) + set1.current) % set1.current;
        row1.current.style.transform = `translate3d(${m - set1.current}px, 0, 0)`; // moves right
      }
      if (row2.current && set2.current) {
        const m = ((offset % set2.current) + set2.current) % set2.current;
        row2.current.style.transform = `translate3d(${-m}px, 0, 0)`; // moves left
      }
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <section className="lp-marquee" ref={sectionRef} aria-label="A glimpse of the library">
      <div className="lp-marquee-row" ref={row1}>
        {[...ROW1, ...ROW1, ...ROW1].map((c, i) => (
          <Card key={`r1-${i}`} c={c} />
        ))}
      </div>
      <div className="lp-marquee-row" ref={row2}>
        {[...ROW2, ...ROW2, ...ROW2].map((c, i) => (
          <Card key={`r2-${i}`} c={c} />
        ))}
      </div>
    </section>
  );
}
