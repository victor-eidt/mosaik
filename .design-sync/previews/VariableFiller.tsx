import { useEffect } from 'react';
import { VariableFiller } from 'mosaik';

// VariableFiller is a full-screen modal: fill {{placeholders}} on the left,
// see the rendered result live on the right. Rendered with cardMode "single"
// so the fixed overlay sits inside the card (see cfg.overrides.VariableFiller).

const prompt = {
  id: 'p2',
  title: 'Cold email writer',
  body:
    'Write a 3-sentence cold email to {{prospect}} at {{company}}: one specific ' +
    'observation, one line of value, and a soft CTA. Sign off as {{sender}}.',
  notes: '',
  tags: [],
  folderId: null,
  imagePath: null,
  links: [],
  refLinks: [],
  favorite: false,
  uses: 0,
  createdAt: '',
  updatedAt: '',
};

function useDark() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.background = '#0a0a0a';
  }, []);
}

export const Default = () => {
  useDark();
  return (
    <VariableFiller
      prompt={prompt}
      vars={['prospect', 'company', 'sender']}
      onCopy={() => {}}
      onClose={() => {}}
    />
  );
};
