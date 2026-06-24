import { useEffect } from 'react';
import { PromptCard } from 'mosaik';

// PromptCard renders one saved prompt: title, body (or result image), tags,
// useful/reference links, a folder + variable-count + copy-count meta row, and
// the copy / duplicate / edit / delete actions. Handlers are no-ops here.

const base = {
  notes: '',
  folderId: null,
  imagePath: null,
  links: [],
  refLinks: [],
  favorite: false,
  uses: 0,
  createdAt: '2025-05-01T10:00:00Z',
  updatedAt: '2025-05-12T10:42:00Z',
};

const codeReview = {
  ...base,
  id: 'p1',
  title: 'Senior code reviewer',
  body:
    'Review the diff for correctness bugs, edge cases, and security issues. ' +
    'Cite file:line for each finding and flag anything risky before it ships. ' +
    'Prioritize high-severity issues and keep the summary concise.',
  tags: ['engineering', 'review', 'quality'],
  links: [{ label: 'Team style guide', url: 'https://example.com/style-guide' }],
  refLinks: [{ label: '', url: 'https://stripe.com' }],
  favorite: true,
  uses: 128,
};

const coldEmail = {
  ...base,
  id: 'p2',
  title: 'Cold email writer',
  body:
    'Write a 3-sentence cold email to {{prospect}} at {{company}}: one specific ' +
    'observation, one line of value, and a soft CTA. Keep it under 80 words.',
  tags: ['sales', 'copy'],
  uses: 42,
};

const noop = () => {};

// mosaik tokens live under :root[data-theme='dark'|'light'] — apply the
// signature dark theme to the document + body so they resolve.
function Stage({ children }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.background = '#0a0a0a';
  }, []);
  return (
    <div
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        padding: 28,
        minHeight: 140,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 380 }}>{children}</div>
    </div>
  );
}

export const Default = () => (
  <Stage>
    <PromptCard
      prompt={codeReview}
      folderName="Engineering"
      imageUrl={null}
      onEdit={noop}
      onDelete={noop}
      onDuplicate={noop}
      onToggleFavorite={noop}
      onCopy={noop}
      onTagClick={noop}
      activeTags={[]}
    />
  </Stage>
);

export const WithVariables = () => (
  <Stage>
    <PromptCard
      prompt={coldEmail}
      folderName="Sales"
      imageUrl={null}
      onEdit={noop}
      onDelete={noop}
      onDuplicate={noop}
      onToggleFavorite={noop}
      onCopy={noop}
      onTagClick={noop}
      activeTags={['sales']}
    />
  </Stage>
);
