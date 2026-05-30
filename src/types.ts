export interface Folder {
  id: string;
  name: string;
  /** ISO timestamp */
  createdAt: string;
}

/** A named hyperlink. `label` may be empty, in which case the URL is shown. */
export interface LinkItem {
  label: string;
  url: string;
}

export interface Prompt {
  id: string;
  title: string;
  body: string;
  notes: string;
  tags: string[];
  /** Folder id, or null for "uncategorized" */
  folderId: string | null;
  /** Storage path of an attached result image, or null. */
  imagePath: string | null;
  /** Useful links related to the prompt. */
  links: LinkItem[];
  /** Design-reference landing pages. */
  refLinks: LinkItem[];
  favorite: boolean;
  /** How many times this prompt has been copied. */
  uses: number;
  /** ISO timestamps */
  createdAt: string;
  updatedAt: string;
}

/** A saved landing page (design inspiration) with cached preview metadata. */
export interface LandingPage {
  id: string;
  title: string;
  url: string;
  notes: string;
  tags: string[];
  /** Cached preview from Microlink. */
  previewImage: string | null;
  previewTitle: string | null;
  previewDesc: string | null;
  /** Manual screenshot (Storage path) used when no auto-preview, or to override it. */
  imagePath: string | null;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A reusable UI element: image + code snippet + source. */
export interface UiElement {
  id: string;
  title: string;
  notes: string;
  tags: string[];
  imagePath: string | null;
  code: string;
  /** Language label for the snippet, e.g. "html", "css", "tsx". */
  language: string;
  sourceUrl: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A saved tweet / X post (retweet, useful thread, etc.). */
export interface Tweet {
  id: string;
  url: string;
  notes: string;
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  /** schema version, for future migrations */
  version: number;
  folders: Folder[];
  prompts: Prompt[];
}

/** Pseudo-folder ids used by the sidebar that are not real folders. */
export const VIEW_ALL = '__all__';
export const VIEW_FAVORITES = '__favorites__';
export const VIEW_UNCATEGORIZED = '__uncategorized__';

export type SelectedView = string; // a folder id or one of the VIEW_* constants

/** Top-level spaces the app is divided into. */
export type Space = 'prompts' | 'landing' | 'ui' | 'tweets';
