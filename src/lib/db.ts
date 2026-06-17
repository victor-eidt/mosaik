import { supabase } from './supabase';
import type { DesignSystem, Folder, LandingPage, LinkItem, Prompt, Tweet, UiElement } from '../types';

/** Coerce arbitrary jsonb into a clean LinkItem[]. */
function toLinks(raw: unknown): LinkItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => ({
      label: typeof (x as LinkItem)?.label === 'string' ? (x as LinkItem).label : '',
      url: typeof (x as LinkItem)?.url === 'string' ? (x as LinkItem).url : '',
    }))
    .filter((l) => l.url || l.label);
}

/** Database row shapes (snake_case as stored in Postgres). */
interface FolderRow {
  id: string;
  name: string;
  created_at: string;
}
interface PromptRow {
  id: string;
  title: string;
  body: string;
  notes: string;
  tags: string[] | null;
  folder_id: string | null;
  image_path: string | null;
  links: unknown;
  ref_links: unknown;
  favorite: boolean;
  uses: number;
  created_at: string;
  updated_at: string;
}

const IMAGE_BUCKET = 'prompt-images';
const SIGNED_URL_TTL = 60 * 60 * 8; // 8 hours

const toFolder = (r: FolderRow): Folder => ({ id: r.id, name: r.name, createdAt: r.created_at });
const toPrompt = (r: PromptRow): Prompt => ({
  id: r.id,
  title: r.title,
  body: r.body,
  notes: r.notes,
  tags: r.tags ?? [],
  folderId: r.folder_id,
  imagePath: r.image_path,
  links: toLinks(r.links),
  refLinks: toLinks(r.ref_links),
  favorite: r.favorite,
  uses: r.uses,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** The fields a caller supplies when creating or editing a prompt. */
export interface PromptInput {
  title: string;
  body: string;
  notes: string;
  tags: string[];
  folderId: string | null;
  imagePath: string | null;
  links: LinkItem[];
  refLinks: LinkItem[];
}

type PromptExtra = Partial<Pick<Prompt, 'favorite' | 'uses'>>;

function promptRow(p: PromptInput & PromptExtra) {
  return {
    title: p.title,
    body: p.body,
    notes: p.notes,
    tags: p.tags,
    folder_id: p.folderId,
    image_path: p.imagePath,
    links: toLinks(p.links),
    ref_links: toLinks(p.refLinks),
    favorite: p.favorite ?? false,
    uses: p.uses ?? 0,
  };
}

export async function fetchAll(): Promise<{ folders: Folder[]; prompts: Prompt[] }> {
  const [foldersRes, promptsRes] = await Promise.all([
    supabase.from('folders').select('*').order('created_at', { ascending: true }),
    supabase.from('prompts').select('*').order('updated_at', { ascending: false }),
  ]);
  if (foldersRes.error) throw foldersRes.error;
  if (promptsRes.error) throw promptsRes.error;
  return {
    folders: (foldersRes.data as FolderRow[]).map(toFolder),
    prompts: (promptsRes.data as PromptRow[]).map(toPrompt),
  };
}

export async function createFolder(name: string): Promise<Folder> {
  const { data, error } = await supabase.from('folders').insert({ name }).select().single();
  if (error) throw error;
  return toFolder(data as FolderRow);
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('folders').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteFolder(id: string): Promise<void> {
  // prompts.folder_id is ON DELETE SET NULL, so prompts survive as uncategorized.
  const { error } = await supabase.from('folders').delete().eq('id', id);
  if (error) throw error;
}

export async function createPrompt(input: PromptInput): Promise<Prompt> {
  const { data, error } = await supabase.from('prompts').insert(promptRow(input)).select().single();
  if (error) throw error;
  return toPrompt(data as PromptRow);
}

export async function updatePrompt(
  id: string,
  patch: Partial<PromptInput> & PromptExtra
): Promise<Prompt> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.body !== undefined) row.body = patch.body;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.folderId !== undefined) row.folder_id = patch.folderId;
  if (patch.imagePath !== undefined) row.image_path = patch.imagePath;
  if (patch.links !== undefined) row.links = toLinks(patch.links);
  if (patch.refLinks !== undefined) row.ref_links = toLinks(patch.refLinks);
  if (patch.favorite !== undefined) row.favorite = patch.favorite;
  if (patch.uses !== undefined) row.uses = patch.uses;
  const { data, error } = await supabase.from('prompts').update(row).eq('id', id).select().single();
  if (error) throw error;
  return toPrompt(data as PromptRow);
}

export async function deletePrompt(id: string): Promise<void> {
  const { error } = await supabase.from('prompts').delete().eq('id', id);
  if (error) throw error;
}

/**
 * One-time bulk seed/import. `folders` carry their original local ids so prompts
 * (whose folderId still points at those local ids) can be remapped to the new
 * server-generated folder ids. Caller should refetch afterwards.
 */
export async function bulkImport(
  folders: { id: string; name: string }[],
  prompts: (PromptInput & Required<PromptExtra>)[]
): Promise<void> {
  const nameByOldId = new Map(folders.map((f) => [f.id, f.name]));
  const newIdByName = new Map<string, string>();

  if (folders.length) {
    const { data, error } = await supabase
      .from('folders')
      .insert(folders.map((f) => ({ name: f.name })))
      .select();
    if (error) throw error;
    for (const f of data as FolderRow[]) newIdByName.set(f.name, f.id);
  }

  if (prompts.length) {
    const rows = prompts.map((p) => {
      const name = p.folderId ? nameByOldId.get(p.folderId) : undefined;
      const folderId = name ? newIdByName.get(name) ?? null : null;
      return promptRow({ ...p, folderId });
    });
    const { error } = await supabase.from('prompts').insert(rows);
    if (error) throw error;
  }
}

// ---- Image storage -------------------------------------------------------

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

/** Upload an image to the user's folder and return its storage path. */
export async function uploadImage(file: File): Promise<string> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw userErr ?? new Error('Not signed in');
  const ext = EXT_BY_TYPE[file.type] ?? 'png';
  const path = `${userData.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

/** Best-effort delete; ignores failures (e.g. already gone). */
export async function deleteImage(path: string): Promise<void> {
  await supabase.storage.from(IMAGE_BUCKET).remove([path]);
}

/** A time-limited signed URL for one image, or null on failure. */
export async function signedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Batch signed URLs for many images, keyed by path. */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths)].filter(Boolean);
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  data.forEach((row, i) => {
    const key = (row as { path?: string | null }).path ?? unique[i];
    if (row.signedUrl && key) out[key] = row.signedUrl;
  });
  return out;
}

// ---- Landing pages -------------------------------------------------------

interface LandingRow {
  id: string;
  title: string;
  url: string;
  notes: string;
  tags: string[] | null;
  preview_image: string | null;
  preview_title: string | null;
  preview_desc: string | null;
  image_path: string | null;
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

const toLanding = (r: LandingRow): LandingPage => ({
  id: r.id,
  title: r.title,
  url: r.url,
  notes: r.notes,
  tags: r.tags ?? [],
  previewImage: r.preview_image,
  previewTitle: r.preview_title,
  previewDesc: r.preview_desc,
  imagePath: r.image_path,
  favorite: r.favorite,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface LandingInput {
  title: string;
  url: string;
  notes: string;
  tags: string[];
  previewImage: string | null;
  previewTitle: string | null;
  previewDesc: string | null;
  imagePath: string | null;
}

function landingRow(p: Partial<LandingInput> & { favorite?: boolean }) {
  const row: Record<string, unknown> = {};
  if (p.title !== undefined) row.title = p.title;
  if (p.url !== undefined) row.url = p.url;
  if (p.notes !== undefined) row.notes = p.notes;
  if (p.tags !== undefined) row.tags = p.tags;
  if (p.previewImage !== undefined) row.preview_image = p.previewImage;
  if (p.previewTitle !== undefined) row.preview_title = p.previewTitle;
  if (p.previewDesc !== undefined) row.preview_desc = p.previewDesc;
  if (p.imagePath !== undefined) row.image_path = p.imagePath;
  if (p.favorite !== undefined) row.favorite = p.favorite;
  return row;
}

export async function fetchLandingPages(): Promise<LandingPage[]> {
  const { data, error } = await supabase
    .from('landing_pages')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as LandingRow[]).map(toLanding);
}

export async function createLanding(input: LandingInput): Promise<LandingPage> {
  const { data, error } = await supabase
    .from('landing_pages')
    .insert(landingRow(input))
    .select()
    .single();
  if (error) throw error;
  return toLanding(data as LandingRow);
}

export async function updateLanding(
  id: string,
  patch: Partial<LandingInput> & { favorite?: boolean }
): Promise<LandingPage> {
  const { data, error } = await supabase
    .from('landing_pages')
    .update({ ...landingRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toLanding(data as LandingRow);
}

export async function deleteLanding(id: string): Promise<void> {
  const { error } = await supabase.from('landing_pages').delete().eq('id', id);
  if (error) throw error;
}

// ---- Tweets --------------------------------------------------------------

interface TweetRow {
  id: string;
  url: string;
  notes: string;
  tags: string[] | null;
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

const toTweet = (r: TweetRow): Tweet => ({
  id: r.id,
  url: r.url,
  notes: r.notes,
  tags: r.tags ?? [],
  favorite: r.favorite,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface TweetInput {
  url: string;
  notes: string;
  tags: string[];
}

function tweetRow(p: Partial<TweetInput> & { favorite?: boolean }) {
  const row: Record<string, unknown> = {};
  if (p.url !== undefined) row.url = p.url;
  if (p.notes !== undefined) row.notes = p.notes;
  if (p.tags !== undefined) row.tags = p.tags;
  if (p.favorite !== undefined) row.favorite = p.favorite;
  return row;
}

export async function fetchTweets(): Promise<Tweet[]> {
  const { data, error } = await supabase
    .from('tweets')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as TweetRow[]).map(toTweet);
}

export async function createTweet(input: TweetInput): Promise<Tweet> {
  const { data, error } = await supabase.from('tweets').insert(tweetRow(input)).select().single();
  if (error) throw error;
  return toTweet(data as TweetRow);
}

export async function updateTweet(
  id: string,
  patch: Partial<TweetInput> & { favorite?: boolean }
): Promise<Tweet> {
  const { data, error } = await supabase
    .from('tweets')
    .update({ ...tweetRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toTweet(data as TweetRow);
}

export async function deleteTweet(id: string): Promise<void> {
  const { error } = await supabase.from('tweets').delete().eq('id', id);
  if (error) throw error;
}

// ---- UI elements ---------------------------------------------------------

interface UiRow {
  id: string;
  title: string;
  notes: string;
  tags: string[] | null;
  image_path: string | null;
  code: string;
  language: string;
  source_url: string;
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

const toUi = (r: UiRow): UiElement => ({
  id: r.id,
  title: r.title,
  notes: r.notes,
  tags: r.tags ?? [],
  imagePath: r.image_path,
  code: r.code,
  language: r.language,
  sourceUrl: r.source_url,
  favorite: r.favorite,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface UiInput {
  title: string;
  notes: string;
  tags: string[];
  imagePath: string | null;
  code: string;
  language: string;
  sourceUrl: string;
}

function uiRow(p: Partial<UiInput> & { favorite?: boolean }) {
  const row: Record<string, unknown> = {};
  if (p.title !== undefined) row.title = p.title;
  if (p.notes !== undefined) row.notes = p.notes;
  if (p.tags !== undefined) row.tags = p.tags;
  if (p.imagePath !== undefined) row.image_path = p.imagePath;
  if (p.code !== undefined) row.code = p.code;
  if (p.language !== undefined) row.language = p.language;
  if (p.sourceUrl !== undefined) row.source_url = p.sourceUrl;
  if (p.favorite !== undefined) row.favorite = p.favorite;
  return row;
}

export async function fetchUiElements(): Promise<UiElement[]> {
  const { data, error } = await supabase
    .from('ui_elements')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as UiRow[]).map(toUi);
}

export async function createUi(input: UiInput): Promise<UiElement> {
  const { data, error } = await supabase.from('ui_elements').insert(uiRow(input)).select().single();
  if (error) throw error;
  return toUi(data as UiRow);
}

export async function updateUi(
  id: string,
  patch: Partial<UiInput> & { favorite?: boolean }
): Promise<UiElement> {
  const { data, error } = await supabase
    .from('ui_elements')
    .update({ ...uiRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toUi(data as UiRow);
}

export async function deleteUi(id: string): Promise<void> {
  const { error } = await supabase.from('ui_elements').delete().eq('id', id);
  if (error) throw error;
}

// ---- Design systems ------------------------------------------------------

interface DesignRow {
  id: string;
  name: string;
  content: string;
  reference_image_path: string | null;
  pair_agents: boolean;
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

const toDesign = (r: DesignRow): DesignSystem => ({
  id: r.id,
  name: r.name,
  content: r.content,
  referenceImagePath: r.reference_image_path,
  pairAgents: r.pair_agents,
  favorite: r.favorite,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface DesignInput {
  name: string;
  content: string;
  referenceImagePath: string | null;
  pairAgents: boolean;
}

function designRow(p: Partial<DesignInput> & { favorite?: boolean }) {
  const row: Record<string, unknown> = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.content !== undefined) row.content = p.content;
  if (p.referenceImagePath !== undefined) row.reference_image_path = p.referenceImagePath;
  if (p.pairAgents !== undefined) row.pair_agents = p.pairAgents;
  if (p.favorite !== undefined) row.favorite = p.favorite;
  return row;
}

export async function fetchDesignSystems(): Promise<DesignSystem[]> {
  const { data, error } = await supabase
    .from('design_systems')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as DesignRow[]).map(toDesign);
}

export async function createDesign(input: DesignInput): Promise<DesignSystem> {
  const { data, error } = await supabase
    .from('design_systems')
    .insert(designRow(input))
    .select()
    .single();
  if (error) throw error;
  return toDesign(data as DesignRow);
}

export async function updateDesign(
  id: string,
  patch: Partial<DesignInput> & { favorite?: boolean }
): Promise<DesignSystem> {
  const { data, error } = await supabase
    .from('design_systems')
    .update({ ...designRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toDesign(data as DesignRow);
}

export async function deleteDesign(id: string): Promise<void> {
  const { error } = await supabase.from('design_systems').delete().eq('id', id);
  if (error) throw error;
}

// ---- Design AI (Supabase Edge Function) ----------------------------------

export interface DesignAiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DesignAiRequest {
  /** chat: edit; create: from a brief; image: from a reference; convert: map a pasted system. */
  mode: 'chat' | 'image' | 'create' | 'convert';
  /** Current DESIGN.md markdown (source of truth the model edits). */
  markdown: string;
  /** Prior chat turns, oldest first (chat mode). */
  messages?: DesignAiMessage[];
  /** Latest user instruction (chat mode). */
  prompt?: string;
  /** Storage path of an uploaded reference image (image mode). */
  imagePath?: string | null;
}

export interface DesignAiResponse {
  /** A full, valid DESIGN.md returned by the model. */
  markdown: string;
  /** Optional short assistant note describing what changed. */
  note?: string;
}

/**
 * Invoke the `design-ai` edge function. Throws on transport/function errors so the
 * caller can surface a clear "AI not configured / failed" state.
 */
export async function designAi(req: DesignAiRequest): Promise<DesignAiResponse> {
  const { data, error } = await supabase.functions.invoke<DesignAiResponse>('design-ai', {
    body: req,
  });
  if (error) throw error;
  if (!data || typeof data.markdown !== 'string') {
    throw new Error('The AI returned an unexpected response.');
  }
  return data;
}
