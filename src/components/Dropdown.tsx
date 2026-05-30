import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, Check } from '@phosphor-icons/react';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string> {
  value: T;
  options: readonly DropdownOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * A custom select that matches the app's surfaces (rounded, bordered, themed),
 * unlike a native <select> whose option list is rendered by the OS. The menu is
 * portaled to <body> and positioned under the trigger, closing on outside click,
 * Escape, scroll, or resize.
 */
export default function Dropdown<T extends string>({
  value,
  options,
  onChange,
  className,
  ariaLabel,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const current = options.find((o) => o.value === value);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left, width: r.width });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    }
    function dismiss() {
      setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    // Capture phase so Escape closes the menu before a parent (e.g. a modal) reacts.
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [open]);

  return (
    <div className={`dropdown${className ? ' ' + className : ''}`}>
      <button
        type="button"
        ref={triggerRef}
        className="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{current?.label ?? ''}</span>
        <CaretDown size={13} weight="bold" className={`dropdown-caret${open ? ' open' : ''}`} />
      </button>
      {open &&
        pos &&
        createPortal(
          <ul
            ref={menuRef}
            className="dropdown-menu"
            role="listbox"
            style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
          >
            {options.map((o) => (
              <li key={o.value} role="option" aria-selected={o.value === value}>
                <button
                  type="button"
                  className={`dropdown-option${o.value === value ? ' selected' : ''}`}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <span>{o.label}</span>
                  {o.value === value && <Check size={14} weight="bold" />}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}
