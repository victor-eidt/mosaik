/** Preview metadata for a URL, fetched from the free Microlink API. */
export interface PreviewData {
  image: string | null;
  title: string | null;
  description: string | null;
}

/**
 * Fetch Open Graph-style preview data for a URL via Microlink.
 * No API key needed for the free tier. Returns nulls on any failure so the
 * caller can still save the landing page without a preview.
 */
export async function fetchPreview(url: string): Promise<PreviewData> {
  const empty: PreviewData = { image: null, title: null, description: null };
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(normalized)}`);
    if (!res.ok) return empty;
    const json = await res.json();
    if (json.status !== 'success') return empty;
    const d = json.data ?? {};
    return {
      image: d.image?.url ?? d.logo?.url ?? null,
      title: d.title ?? null,
      description: d.description ?? null,
    };
  } catch {
    return empty;
  }
}

/** Ensure a URL has a scheme so it opens correctly in a new tab. */
export function withScheme(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Short, readable host for display. */
export function hostOf(url: string): string {
  try {
    return new URL(withScheme(url)).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
