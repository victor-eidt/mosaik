import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowSquareOut,
  List,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Star,
  TrashSimple,
  TwitterLogo,
  X,
} from '@phosphor-icons/react';
import * as db from '../lib/db';
import { withScheme } from '../lib/preview';
import { useToast } from './Toast';
import type { Tweet } from '../types';

// --- X / Twitter embed loader --------------------------------------------

declare global {
  interface Window {
    twttr?: {
      widgets: { load: (el?: HTMLElement) => void; createTweet?: unknown };
    };
  }
}

let widgetsPromise: Promise<void> | null = null;

/** Load X's widgets.js once, resolve when window.twttr.widgets is ready. */
function loadWidgets(): Promise<void> {
  if (window.twttr?.widgets) return Promise.resolve();
  if (widgetsPromise) return widgetsPromise;
  widgetsPromise = new Promise<void>((resolve) => {
    const existing = document.getElementById('twitter-wjs') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const s = document.createElement('script');
    s.id = 'twitter-wjs';
    s.src = 'https://platform.twitter.com/widgets.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve(); // resolve anyway; the fallback link still works
    document.head.appendChild(s);
  });
  return widgetsPromise;
}

/** Extract the numeric status id from a tweet URL. */
function tweetId(url: string): string | null {
  const m = url.match(/status(?:es)?\/(\d+)/);
  return m ? m[1] : null;
}

/** Display handle from a tweet URL, e.g. "@levelsio". */
function tweetHandle(url: string): string {
  try {
    const path = new URL(withScheme(url)).pathname.split('/').filter(Boolean);
    return path[0] ? `@${path[0]}` : 'tweet';
  } catch {
    return 'tweet';
  }
}

export default function TweetSpace({
  favoritesOnly,
  onMenu,
}: {
  favoritesOnly: boolean;
  onMenu: () => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ item: Tweet | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    db.fetchTweets()
      .then((rows) => !cancelled && setItems(rows))
      .catch((e) => !cancelled && toast(`Could not load: ${(e as Error).message}`, 'error'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const visible = useMemo(() => {
    let list = favoritesOnly ? items.filter((i) => i.favorite) : items;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((i) => [i.url, i.notes, ...i.tags].join(' ').toLowerCase().includes(q));
    }
    return list;
  }, [items, favoritesOnly, query]);

  async function save(input: db.TweetInput, existing: Tweet | null) {
    if (!tweetId(input.url)) {
      toast('That does not look like a tweet URL', 'error');
      return;
    }
    try {
      if (existing) {
        const updated = await db.updateTweet(existing.id, input);
        setItems((l) => l.map((x) => (x.id === updated.id ? updated : x)));
        toast('Tweet updated');
      } else {
        const created = await db.createTweet(input);
        setItems((l) => [created, ...l]);
        toast('Tweet saved');
      }
      setEditing(null);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function remove(id: string) {
    try {
      await db.deleteTweet(id);
      setItems((l) => l.filter((x) => x.id !== id));
      toast('Tweet deleted', 'info');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function toggleFav(item: Tweet) {
    const favorite = !item.favorite;
    setItems((l) => l.map((x) => (x.id === item.id ? { ...x, favorite } : x)));
    try {
      await db.updateTweet(item.id, { favorite });
    } catch {
      setItems((l) => l.map((x) => (x.id === item.id ? { ...x, favorite: !favorite } : x)));
    }
  }

  return (
    <>
      <header className="toolbar">
        <div className="toolbar-left">
          <button className="icon-btn mobile-only" onClick={onMenu} aria-label="Open menu">
            <List size={20} />
          </button>
          <h1 className="view-title">{favoritesOnly ? 'Favorite tweets' : 'Tweets'}</h1>
          <span className="view-count">{visible.length}</span>
        </div>
        <div className="toolbar-right">
          <div className="search-wrap">
            <MagnifyingGlass size={15} className="search-icon" />
            <input
              className="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </div>
          <button className="btn primary" onClick={() => setEditing({ item: null })}>
            <Plus size={16} weight="bold" />
            <span className="btn-label">New</span>
          </button>
        </div>
      </header>

      <div className="content">
        {loading ? (
          <div className="grid tweet-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card skeleton" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-glyph">
              <TwitterLogo size={40} weight="thin" />
            </div>
            <p className="empty-title">{query ? 'Nothing matches your search' : 'No tweets yet'}</p>
            <p className="empty-sub">
              {query
                ? 'Try a different search.'
                : 'Paste a tweet URL to keep the posts you retweet within reach.'}
            </p>
            <button className="btn primary" onClick={() => setEditing({ item: null })}>
              <Plus size={16} weight="bold" />
              Save a tweet
            </button>
          </div>
        ) : (
          <div className="grid tweet-grid">
            {visible.map((item) => (
              <TweetCard
                key={item.id}
                item={item}
                onEdit={() => setEditing({ item })}
                onDelete={() => remove(item.id)}
                onToggleFavorite={() => toggleFav(item)}
              />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <TweetEditor
          item={editing.item}
          onSave={(input) => save(input, editing.item)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function TweetCard({
  item,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  item: Tweet;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const id = tweetId(item.url);
  const href = withScheme(item.url);
  const handle = tweetHandle(item.url);
  const embedRef = useRef<HTMLDivElement>(null);
  const [embedState, setEmbedState] = useState<'loading' | 'done' | 'failed'>('loading');

  useEffect(() => {
    if (!id || !embedRef.current) return;
    let cancelled = false;
    const host = embedRef.current;
    host.innerHTML = '';
    setEmbedState('loading');

    loadWidgets().then(() => {
      if (cancelled || !window.twttr?.widgets) {
        if (!cancelled) setEmbedState('failed');
        return;
      }
      const create = (window.twttr.widgets as unknown as {
        createTweet: (id: string, el: HTMLElement, opts?: Record<string, unknown>) => Promise<unknown>;
      }).createTweet;
      create(id, host, { theme: 'dark', dnt: true, conversation: 'none', width: 300 })
        .then((el) => {
          if (cancelled) return;
          setEmbedState(el ? 'done' : 'failed');
        })
        .catch(() => !cancelled && setEmbedState('failed'));
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <article className="card tweet-card">
      <header className="card-head">
        <a className="card-title tweet-handle" href={href} target="_blank" rel="noopener noreferrer">
          <TwitterLogo size={15} weight="fill" />
          {handle}
        </a>
        <button
          className={`star${item.favorite ? ' on' : ''}`}
          title={item.favorite ? 'Unfavorite' : 'Favorite'}
          onClick={onToggleFavorite}
        >
          <Star size={17} weight={item.favorite ? 'fill' : 'regular'} />
        </button>
      </header>

      <div className="tweet-embed-wrap">
        {id ? <div ref={embedRef} className="tweet-embed" /> : null}
        {embedState !== 'done' && (
          <a
            className={`tweet-fallback${embedState === 'loading' ? ' loading' : ''}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <TwitterLogo size={26} weight="fill" />
            <span>{embedState === 'loading' ? 'Loading tweet…' : 'Open tweet on X'}</span>
            <ArrowSquareOut size={14} weight="bold" />
          </a>
        )}
      </div>

      {item.notes && <p className="tweet-notes">{item.notes}</p>}

      {item.tags.length > 0 && (
        <div className="tag-row">
          {item.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      )}

      <footer className="card-foot">
        <a className="btn primary sm" href={href} target="_blank" rel="noopener noreferrer">
          <ArrowSquareOut size={14} weight="bold" />
          Open
        </a>
        <div className="card-actions">
          <button className="icon-btn" title="Edit" onClick={onEdit}>
            <PencilSimple size={16} />
          </button>
          <button
            className="icon-btn danger"
            title="Delete"
            onClick={() => {
              if (confirm('Delete this tweet?')) onDelete();
            }}
          >
            <TrashSimple size={16} />
          </button>
        </div>
      </footer>
    </article>
  );
}

function TweetEditor({
  item,
  onSave,
  onClose,
}: {
  item: Tweet | null;
  onSave: (input: db.TweetInput) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(item?.url ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [tagText, setTagText] = useState((item?.tags ?? []).join(', '));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit() {
    const tags = tagText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSave({ url: url.trim(), notes: notes.trim(), tags });
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{item ? 'Edit tweet' : 'Save a tweet'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <label className="field">
            <span>Tweet URL</span>
            <input
              autoFocus
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://x.com/user/status/123…"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </label>

          <label className="field">
            <span>Tags (comma-separated)</span>
            <input
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              placeholder="dev, tip, thread"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </label>

          <label className="field">
            <span>Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why you saved it / how to use it"
              rows={3}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </label>
        </div>

        <footer className="modal-foot">
          <span className="hint">Esc to close</span>
          <div className="modal-actions">
            <button className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn primary" onClick={submit}>
              Save
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
