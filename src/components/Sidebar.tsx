import { useState } from 'react';
import {
  Cardholder,
  ChatText,
  CubeTransparent,
  Folder as FolderIcon,
  FolderPlus,
  GlobeHemisphereWest,
  PencilSimple,
  SquaresFour,
  Star,
  TrashSimple,
  Tray,
  TwitterLogo,
  X,
} from '@phosphor-icons/react';
import type { Folder, SelectedView, Space } from '../types';
import { VIEW_ALL, VIEW_FAVORITES, VIEW_UNCATEGORIZED } from '../types';

interface Props {
  space: Space;
  onSpaceChange: (space: Space) => void;
  folders: Folder[];
  selected: SelectedView;
  counts: Record<string, number>;
  open: boolean;
  onSelect: (view: SelectedView) => void;
  onAddFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onClose: () => void;
}

const SPACES: { id: Space; label: string; icon: React.ReactNode }[] = [
  { id: 'prompts', label: 'Prompts', icon: <ChatText size={16} /> },
  { id: 'landing', label: 'Landing pages', icon: <GlobeHemisphereWest size={16} /> },
  { id: 'ui', label: 'UI elements', icon: <CubeTransparent size={16} /> },
  { id: 'tweets', label: 'Tweets', icon: <TwitterLogo size={16} /> },
];

export default function Sidebar({
  space,
  onSpaceChange,
  folders,
  selected,
  counts,
  open,
  onSelect,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onClose,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  function commitAdd() {
    const name = draft.trim();
    if (name) onAddFolder(name);
    setDraft('');
    setAdding(false);
  }

  return (
    <>
      <div className={`scrim${open ? ' show' : ''}`} onClick={onClose} />
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">&gt;_</span>
          <span>mosaik</span>
          <button className="icon-btn mobile-only" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="nav-group space-switcher">
          {SPACES.map((s) => (
            <NavItem
              key={s.id}
              label={s.label}
              icon={s.icon}
              active={space === s.id}
              onClick={() => onSpaceChange(s.id)}
            />
          ))}
        </nav>

        <div className="nav-divider" />

        <nav className="nav-group">
          <NavItem
            label={space === 'prompts' ? 'All prompts' : 'All'}
            icon={<SquaresFour size={16} />}
            active={selected === VIEW_ALL}
            count={space === 'prompts' ? counts[VIEW_ALL] : undefined}
            onClick={() => onSelect(VIEW_ALL)}
          />
          <NavItem
            label="Favorites"
            icon={<Star size={16} />}
            active={selected === VIEW_FAVORITES}
            count={space === 'prompts' ? counts[VIEW_FAVORITES] : undefined}
            onClick={() => onSelect(VIEW_FAVORITES)}
          />
          {space === 'prompts' && (
            <NavItem
              label="Uncategorized"
              icon={<Tray size={16} />}
              active={selected === VIEW_UNCATEGORIZED}
              count={counts[VIEW_UNCATEGORIZED]}
              onClick={() => onSelect(VIEW_UNCATEGORIZED)}
            />
          )}
        </nav>

        {space === 'prompts' && (
          <>
            <div className="nav-section-label">
              <span>Folders</span>
              <button className="icon-btn" title="New folder" onClick={() => setAdding(true)}>
                <FolderPlus size={16} />
              </button>
            </div>

            <nav className="nav-group">
              {folders.map((f) => (
                <FolderItem
                  key={f.id}
                  folder={f}
                  active={selected === f.id}
                  count={counts[f.id] ?? 0}
                  onClick={() => onSelect(f.id)}
                  onRename={(name) => onRenameFolder(f.id, name)}
                  onDelete={() => onDeleteFolder(f.id)}
                />
              ))}

              {adding && (
                <input
                  className="folder-input"
                  autoFocus
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  placeholder="Folder name…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitAdd}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitAdd();
                    if (e.key === 'Escape') {
                      setDraft('');
                      setAdding(false);
                    }
                  }}
                />
              )}

              {folders.length === 0 && !adding && <p className="empty-hint">No folders yet.</p>}
            </nav>
          </>
        )}
      </aside>
    </>
  );
}

function NavItem({
  label,
  icon,
  active,
  count,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button className={`nav-item${active ? ' active' : ''}`} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
      {count !== undefined && <span className="nav-count">{count}</span>}
    </button>
  );
}

function FolderItem({
  folder,
  active,
  count,
  onClick,
  onRename,
  onDelete,
}: {
  folder: Folder;
  active: boolean;
  count: number;
  onClick: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(folder.name);

  if (editing) {
    return (
      <input
        className="folder-input"
        autoFocus
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const name = draft.trim();
          if (name) onRename(name);
          else setDraft(folder.name);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(folder.name);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <div className={`nav-item folder${active ? ' active' : ''}`}>
      <button className="nav-item-main" onClick={onClick}>
        <span className="nav-icon">{active ? <Cardholder size={16} weight="fill" /> : <FolderIcon size={16} />}</span>
        <span className="nav-label">{folder.name}</span>
      </button>
      <span className="nav-count">{count}</span>
      <div className="folder-actions">
        <button
          className="icon-btn tiny"
          title="Rename"
          onClick={() => {
            setDraft(folder.name);
            setEditing(true);
          }}
        >
          <PencilSimple size={13} />
        </button>
        <button
          className="icon-btn tiny danger"
          title="Delete folder"
          onClick={() => {
            if (confirm(`Delete folder "${folder.name}"? Its prompts move to Uncategorized.`)) {
              onDelete();
            }
          }}
        >
          <TrashSimple size={13} />
        </button>
      </div>
    </div>
  );
}
