import { useEffect } from 'react';
import { ConfirmDialog, useConfirm } from 'mosaik';

// ConfirmDialog is the provider (ConfirmProvider). The modal only renders while
// a confirm() promise is pending, so each cell mounts a child that calls
// useConfirm() on mount with realistic options. cardMode "single" (see config)
// keeps the fixed overlay inside the card.

// mosaik tokens live under :root[data-theme='dark'|'light'] — with no attribute
// they're undefined. Apply the signature dark theme to the document + body.
function useDark() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.background = '#0a0a0a';
  }, []);
}

function Confirmer({ options }) {
  const confirm = useConfirm();
  useEffect(() => {
    confirm(options);
  }, [confirm]);
  return null;
}

export const DangerDelete = () => {
  useDark();
  return (
    <ConfirmDialog>
      <Confirmer
        options={{
          title: 'Delete prompt?',
          message:
            '“Senior code reviewer” will be permanently deleted. This can’t be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          danger: true,
        }}
      />
    </ConfirmDialog>
  );
};

export const DiscardChanges = () => {
  useDark();
  return (
    <ConfirmDialog>
      <Confirmer
        options={{
          title: 'Discard changes?',
          message: 'Your edits to this prompt haven’t been saved yet.',
          confirmText: 'Discard',
          cancelText: 'Keep editing',
        }}
      />
    </ConfirmDialog>
  );
};
