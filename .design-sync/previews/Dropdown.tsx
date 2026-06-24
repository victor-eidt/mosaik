import { useEffect } from 'react';
import { Dropdown } from 'mosaik';

// Dropdown is a controlled custom <select>. The option list is portaled to
// <body> and only appears on click (internal open state), so a static card
// shows the resting trigger — the menu can't be forced open from props.

const sortOptions = [
  { value: 'recent', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most-used', label: 'Most used' },
  { value: 'az', label: 'A → Z' },
];

const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

// mosaik tokens live under :root[data-theme='dark'|'light'] — with no attribute
// they're undefined. Apply the signature dark theme to the document + body.
function useDark() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.background = '#0a0a0a';
  }, []);
}

function Stage({ children }) {
  useDark();
  return (
    <div
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        padding: 28,
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        minHeight: 120,
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}

export const SortBy = () => (
  <Stage>
    <Dropdown value="recent" options={sortOptions} onChange={() => {}} ariaLabel="Sort prompts" />
  </Stage>
);

export const Variants = () => (
  <Stage>
    <Dropdown value="most-used" options={sortOptions} onChange={() => {}} ariaLabel="Sort prompts" />
    <Dropdown value="dark" options={themeOptions} onChange={() => {}} ariaLabel="Theme" />
  </Stage>
);
