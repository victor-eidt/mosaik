import { useEffect, useRef, useState } from 'react';
import {
  SquaresFour,
  Star,
  FolderSimple,
  TrashSimple,
  MagnifyingGlass,
  PencilSimple,
  DotsThree,
  FileText,
  User,
  GitBranch,
  Tag,
  Clock,
  ClockCounterClockwise,
  Plus,
  ListBullets,
  CaretDown,
} from '@phosphor-icons/react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Peak tilt (deg) at the card's edges — kept subtle so the mockup reads as a UI, not a toy.
const TILT_MAX = 5;

// The prompt shown in the detail pane — typed out on reveal to evoke writing one.
const DETAIL_DESC =
  'Perform a thorough code review. Identify bugs, risks, edge cases, and performance issues. Suggest fixes with clear reasoning.';

/** Reveals `text` one character at a time once `active` flips true. */
function useTypewriter(text: string, active: boolean, speed = 30, startDelay = 550) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) {
      setN(text.length);
      return;
    }
    setN(0);
    let i = 0;
    let next = 0;
    const start = window.setTimeout(function tick() {
      i += 1;
      setN(i);
      if (i < text.length) next = window.setTimeout(tick, speed);
    }, startDelay);
    return () => {
      clearTimeout(start);
      clearTimeout(next);
    };
  }, [active, text, speed, startDelay]);
  return n;
}

/**
 * "The workspace" section: a marketing block with copy on the left and a static
 * mockup of the Mosaik dashboard on the right, plus three feature columns below.
 * Styled to match the hero (fixed dark palette, Sora, pill accents).
 */

const COLLECTIONS = [
  { name: 'Engineering', count: 342 },
  { name: 'UI', count: 210 },
  { name: 'Ops', count: 168 },
  { name: 'Research', count: 96 },
];

const LIST = [
  { title: 'Code review assistant', folder: 'Engineering', time: '2h ago', active: true },
  { title: 'API design checklist', folder: 'Engineering', time: '1d ago' },
  { title: 'Incident postmortem', folder: 'Ops', time: '2d ago' },
  { title: 'UI component spec', folder: 'UI', time: '3d ago' },
  { title: 'On-call handover', folder: 'Ops', time: '3d ago' },
  { title: 'Research synthesis', folder: 'Research', time: '5d ago' },
  { title: 'Accessibility audit', folder: 'UI', time: '6d ago' },
  { title: 'Performance triage', folder: 'Engineering', time: '7d ago' },
];

const VERSIONS = [
  { v: 'v4.2', current: true, note: 'Refined risk categories and added edge case checks.', meta: 'May 12, 2025 by Alex Morgan' },
  { v: 'v4.1', note: 'Improved suggestions and reasoning clarity.', meta: 'May 9, 2025 by Alex Morgan' },
  { v: 'v4.0', note: 'Expanded performance analysis and test coverage.', meta: 'May 6, 2025 by Jamie Lee' },
];

const FEATURES = [
  { icon: FolderSimple, title: 'Folders and tags', desc: 'Organize by team, function, or use case. Tag freely.' },
  { icon: ClockCounterClockwise, title: 'Version history', desc: 'Track changes, compare versions, and roll back with confidence.' },
  { icon: MagnifyingGlass, title: 'Fast retrieval', desc: 'Search across titles, content, tags, and owners.' },
];

function AppMock({ inView }: { inView: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const typedLen = useTypewriter(DETAIL_DESC, inView);
  const done = inView && typedLen >= DETAIL_DESC.length;

  // Mouse-tilt + spotlight: write CSS vars directly on the stage (no re-render).
  // --rx/--ry drive the card's rotateY/rotateX; --mx/--my position the glow.
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; // 0..1 across
    const py = (e.clientY - r.top) / r.height; // 0..1 down
    el.style.setProperty('--rx', `${(px - 0.5) * TILT_MAX * 2}deg`);
    el.style.setProperty('--ry', `${(0.5 - py) * TILT_MAX * 2}deg`);
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
  };
  const onLeave = () => {
    const el = stageRef.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <div
      className={`ws-stage${inView ? ' in' : ''}`}
      ref={stageRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
    <div className="ws-app" aria-hidden="true">
      <header className="wsa-top">
        <span className="wsa-logo" />
        <div className="wsa-search">
          <MagnifyingGlass size={15} />
          <span>Search prompts…</span>
          <kbd>⌘K</kbd>
        </div>
        <div className="wsa-top-actions">
          <Star size={17} />
          <PencilSimple size={17} />
          <DotsThree size={17} weight="bold" />
        </div>
      </header>

      <div className="wsa-body">
        <aside className="wsa-side">
          <div className="wsa-nav active">
            <SquaresFour size={16} />
            <span>All prompts</span>
            <em>1.2k</em>
          </div>
          <div className="wsa-nav">
            <Star size={16} />
            <span>Favorites</span>
            <em>18</em>
          </div>

          <div className="wsa-side-label">
            Collections <Plus size={13} weight="bold" />
          </div>
          {COLLECTIONS.map((c) => (
            <div className="wsa-nav" key={c.name}>
              <FolderSimple size={16} />
              <span>{c.name}</span>
              <em>{c.count}</em>
            </div>
          ))}

          <div className="wsa-side-divider" />
          <div className="wsa-nav">
            <FolderSimple size={16} weight="light" />
            <span>Uncategorized</span>
            <em>88</em>
          </div>
          <div className="wsa-nav">
            <TrashSimple size={16} />
            <span>Trash</span>
            <em>12</em>
          </div>
        </aside>

        <div className="wsa-list">
          <div className="wsa-list-head">
            <span>Recently updated <CaretDown size={12} weight="bold" /></span>
            <ListBullets size={15} />
          </div>
          {LIST.map((it, i) => (
            <div
              className={`wsa-item${it.active ? ' active' : ''}`}
              key={it.title}
              style={{ '--i': i } as React.CSSProperties}
            >
              <FileText size={17} weight="regular" />
              <div className="wsa-item-main">
                <span className="wsa-item-title">{it.title}</span>
                <span className="wsa-item-folder">{it.folder}</span>
              </div>
              <span className="wsa-item-time">{it.time}</span>
            </div>
          ))}
        </div>

        <div className="wsa-detail">
          <h3 className="wsa-detail-title">Code review assistant</h3>
          {/* full text stays in flow (rest is invisible) so typing causes no reflow;
              the caret only appears once typing finishes, then keeps blinking */}
          <p className={`wsa-detail-desc${done ? ' done' : ''}`}>
            {DETAIL_DESC.slice(0, typedLen)}
            <span className="wsa-caret" aria-hidden="true" />
            <span className="wsa-rest">{DETAIL_DESC.slice(typedLen)}</span>
          </p>

          <dl className="wsa-meta">
            <div>
              <dt><User size={15} /> Owner</dt>
              <dd>Alex Morgan</dd>
            </div>
            <div>
              <dt><GitBranch size={15} /> Version</dt>
              <dd>v4.2</dd>
            </div>
            <div>
              <dt><Tag size={15} /> Tags</dt>
              <dd className="wsa-meta-tags">
                <span>engineering</span>
                <span>review</span>
                <span>quality</span>
                <span className="wsa-tag-add">+</span>
              </dd>
            </div>
            <div>
              <dt><Clock size={15} /> Last updated</dt>
              <dd>May 12, 2025, 10:42 AM</dd>
            </div>
          </dl>

          <h4 className="wsa-vh-title">Version history</h4>
          <ol className="wsa-vh">
            {VERSIONS.map((ver, i) => (
              <li
                className={`wsa-vh-item${ver.current ? ' current' : ''}`}
                key={ver.v}
                style={{ '--i': i } as React.CSSProperties}
              >
                <span className="wsa-vh-dot" />
                <div className="wsa-vh-body">
                  <span className="wsa-vh-head">
                    {ver.v}
                    {ver.current && <em className="wsa-vh-badge">Current</em>}
                  </span>
                  <span className="wsa-vh-note">{ver.note}</span>
                  <span className="wsa-vh-meta">{ver.meta}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
    </div>
  );
}

export default function WorkspaceSection() {
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Trigger the "self-assembly" reveal once the mockup scrolls into view.
  useEffect(() => {
    const el = stageWrapRef.current;
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
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="lp-workspace" id="workspace">
      <div className="ws-top" ref={stageWrapRef}>
        <div className="ws-copy">
          <span className="ws-eyebrow reveal">The workspace</span>
          <h2 className="ws-title reveal" style={{ '--reveal-delay': '90ms' } as React.CSSProperties}>
            One library for prompts that need to live beyond the sprint.
          </h2>
          <div className="ws-paras reveal" style={{ '--reveal-delay': '180ms' } as React.CSSProperties}>
            <p>
              Mosaik Library is where engineering teams organize, refine, and
              evolve prompts into durable assets.
            </p>
            <p>
              Structure with folders, favorites, and tags. Find in seconds with
              smart search. Ship with confidence using version history.
            </p>
            <p>Stop losing context. Start building on it.</p>
          </div>
        </div>

        <AppMock inView={inView} />
      </div>

      <div className="ws-features">
        {FEATURES.map((f, i) => (
          <div
            className="ws-feature reveal"
            key={f.title}
            style={{ '--reveal-delay': `${i * 100}ms` } as React.CSSProperties}
          >
            <span className="ws-feature-icon">
              <f.icon size={22} />
            </span>
            <div>
              <h3 className="ws-feature-title">{f.title}</h3>
              <p className="ws-feature-desc">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
