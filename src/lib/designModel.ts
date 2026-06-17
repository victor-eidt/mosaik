import yaml from 'js-yaml';

/**
 * The design-systems space is markdown-first: each system is a single DESIGN.md
 * whose YAML frontmatter carries the structured tokens and whose body is freeform,
 * AI-editable documentation. This module is the contract shared by the editors,
 * the live preview, the exports, and the AI edge function — keep them in sync.
 */

export type ButtonStyle = 'pill' | 'rounded' | 'square';
export type Density = 'comfortable' | 'compact';

export interface DesignColors {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  /** Text/icon color shown on top of `primary`. */
  primaryText: string;
  accent: string;
  danger: string;
  success: string;
}

export interface DesignTypography {
  fontSans: string;
  fontMono: string;
  /** Base body size, e.g. "16px". */
  baseSize: string;
  /** Modular scale ratio used to derive heading sizes, e.g. 1.25. */
  scaleRatio: number;
  headingWeight: number;
  bodyWeight: number;
}

export interface DesignRadii {
  surface: string;
  button: string;
  pill: string;
}

export interface DesignComponents {
  shadows: boolean;
  borders: boolean;
  density: Density;
}

export interface DesignTokens {
  buttonStyle: ButtonStyle;
  colors: DesignColors;
  typography: DesignTypography;
  radii: DesignRadii;
  /** Spacing scale in px, ascending. */
  spacing: number[];
  components: DesignComponents;
}

export interface DesignDoc {
  name: string;
  tokens: DesignTokens;
  /** Freeform markdown documentation (everything after the frontmatter). */
  body: string;
}

// ---- Defaults ------------------------------------------------------------

export const DEFAULT_TOKENS: DesignTokens = {
  buttonStyle: 'rounded',
  colors: {
    background: '#0a0a0a',
    surface: '#141414',
    text: '#ededed',
    textMuted: '#9b9b9b',
    border: '#262626',
    primary: '#ededed',
    primaryText: '#0a0a0a',
    accent: '#6366f1',
    danger: '#ef4444',
    success: '#22c55e',
  },
  typography: {
    fontSans: "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    baseSize: '16px',
    scaleRatio: 1.25,
    headingWeight: 700,
    bodyWeight: 400,
  },
  radii: { surface: '10px', button: '8px', pill: '999px' },
  spacing: [4, 8, 12, 16, 24, 32, 48, 64],
  components: { shadows: true, borders: true, density: 'comfortable' },
};

export function blankDoc(name = 'Untitled system'): DesignDoc {
  return {
    name,
    tokens: structuredClone(DEFAULT_TOKENS),
    body: `# ${name}\n\nDescribe the personality and intent of this design system.\n`,
  };
}

// ---- Font catalog --------------------------------------------------------

/**
 * Curated, web-loadable fonts offered in the typography picker. The token stores
 * the full CSS stack; the picker matches/selects by the first family (the `key`).
 * Every family here is loaded in index.html so previews render truthfully.
 */
export interface FontOption {
  key: string;
  stack: string;
}

const SYS_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const SYS_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const q = (family: string, sys: string) => `'${family}', ${sys}`;

export const SANS_FONTS: FontOption[] = [
  { key: 'Inter', stack: q('Inter', SYS_SANS) },
  { key: 'Sora', stack: q('Sora', SYS_SANS) },
  { key: 'Manrope', stack: q('Manrope', SYS_SANS) },
  { key: 'Space Grotesk', stack: q('Space Grotesk', SYS_SANS) },
  { key: 'DM Sans', stack: q('DM Sans', SYS_SANS) },
  { key: 'Plus Jakarta Sans', stack: q('Plus Jakarta Sans', SYS_SANS) },
  { key: 'Outfit', stack: q('Outfit', SYS_SANS) },
  { key: 'Work Sans', stack: q('Work Sans', SYS_SANS) },
  { key: 'Nunito', stack: q('Nunito', SYS_SANS) },
  { key: 'IBM Plex Sans', stack: q('IBM Plex Sans', SYS_SANS) },
  { key: 'System UI', stack: `system-ui, ${SYS_SANS}` },
];

export const MONO_FONTS: FontOption[] = [
  { key: 'JetBrains Mono', stack: q('JetBrains Mono', SYS_MONO) },
  { key: 'IBM Plex Mono', stack: q('IBM Plex Mono', SYS_MONO) },
  { key: 'Fira Code', stack: q('Fira Code', SYS_MONO) },
  { key: 'Space Mono', stack: q('Space Mono', SYS_MONO) },
  { key: 'System Mono', stack: SYS_MONO },
];

/** The primary (first) family in a CSS font stack, unquoted. */
export function fontFamilyName(stack: string): string {
  const m = stack.match(/'([^']+)'|"([^"]+)"/);
  return (m?.[1] ?? m?.[2] ?? stack.split(',')[0] ?? '').trim();
}

/** Map a stored stack to a known font key, or '__custom__' if it isn't in the catalog. */
export function fontKey(stack: string, fonts: FontOption[]): string {
  const first = fontFamilyName(stack).toLowerCase();
  return fonts.find((f) => f.key.toLowerCase() === first)?.key ?? '__custom__';
}

/** Resolve a font key to its full stack (falls back to the first option). */
export function fontStack(key: string, fonts: FontOption[]): string {
  return fonts.find((f) => f.key === key)?.stack ?? fonts[0].stack;
}

// ---- Parse / serialize ---------------------------------------------------

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Merge a parsed sub-object over defaults, ignoring null/undefined/empty values so a
 * malformed field (e.g. a color YAML ate as a comment) falls back instead of blanking.
 */
function mergeDefined<T extends object>(raw: unknown, fallback: T): T {
  if (!raw || typeof raw !== 'object') return fallback;
  const out: Record<string, unknown> = { ...(fallback as Record<string, unknown>) };
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k in out && v !== null && v !== undefined && v !== '') {
      out[k] = v;
    }
  }
  return out as T;
}

/** Deep-merge parsed frontmatter over defaults so partial / hand-edited files stay valid. */
function coerceTokens(raw: unknown): DesignTokens {
  const r = (raw ?? {}) as Record<string, unknown>;
  const d = DEFAULT_TOKENS;
  const buttonStyle = (['pill', 'rounded', 'square'] as const).includes(r.buttonStyle as ButtonStyle)
    ? (r.buttonStyle as ButtonStyle)
    : d.buttonStyle;
  const spacing = Array.isArray(r.spacing) && r.spacing.every((n) => typeof n === 'number')
    ? (r.spacing as number[])
    : d.spacing;
  return {
    buttonStyle,
    colors: mergeDefined(r.colors, d.colors),
    typography: mergeDefined(r.typography, d.typography),
    radii: mergeDefined(r.radii, d.radii),
    spacing,
    components: mergeDefined(r.components, d.components),
  };
}

/**
 * YAML reads an unquoted value beginning with `#` as a comment, so `background: #0a0a0a`
 * parses to an empty value. LLMs routinely emit bare hex like that, which would blank the
 * whole palette — so quote any bare hex color value before handing the YAML to the parser.
 */
function quoteBareHex(yamlText: string): string {
  return yamlText.replace(/(:[ \t]+)(#[0-9a-fA-F]{3,8})(?=[ \t]*(?:#.*)?$)/gm, '$1"$2"');
}

/** Parse a DESIGN.md string into a structured doc. Tolerant of missing/partial frontmatter. */
export function parseDoc(markdown: string): DesignDoc {
  const text = markdown ?? '';
  const match = text.match(FRONTMATTER_RE);
  if (!match) {
    return { name: 'Untitled system', tokens: structuredClone(DEFAULT_TOKENS), body: text.trim() };
  }
  let front: Record<string, unknown> = {};
  try {
    front = (yaml.load(quoteBareHex(match[1])) as Record<string, unknown>) ?? {};
  } catch {
    front = {};
  }
  const name = typeof front.name === 'string' && front.name.trim() ? front.name.trim() : 'Untitled system';
  return { name, tokens: coerceTokens(front), body: match[2].replace(/^\r?\n/, '') };
}

/** Serialize a doc back into a canonical DESIGN.md string. */
export function serializeDoc(doc: DesignDoc): string {
  const front = {
    name: doc.name,
    buttonStyle: doc.tokens.buttonStyle,
    colors: doc.tokens.colors,
    typography: doc.tokens.typography,
    radii: doc.tokens.radii,
    spacing: doc.tokens.spacing,
    components: doc.tokens.components,
  };
  const fm = yaml.dump(front, { lineWidth: 100, quotingType: '"', forceQuotes: false });
  return `---\n${fm}---\n\n${doc.body.trim()}\n`;
}

// ---- Import --------------------------------------------------------------

/** Infer a button style from a button corner radius value. */
function buttonStyleFromRadius(radius: string): ButtonStyle {
  if (/^0(px|rem|em|%)?$/.test(radius.trim())) return 'square';
  if (/9999|999px|100%|50%/.test(radius)) return 'pill';
  return 'rounded';
}

/**
 * Build a doc from a `:root { --color-*: …; }` stylesheet — the inverse of `toCss`, so
 * users can paste the CSS variables this tool exports (or a compatible set) back in.
 */
export function docFromCss(css: string, name = 'Imported system'): DesignDoc {
  const vars: Record<string, string> = {};
  const re = /--([\w-]+)\s*:\s*([^;}]+)[;}]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) vars[m[1].trim()] = m[2].trim();

  const d = DEFAULT_TOKENS;
  const pick = (key: string, fb: string) => (vars[key]?.trim() ? vars[key].trim() : fb);
  const num = (key: string, fb: number) => {
    const n = parseInt(vars[key] ?? '', 10);
    return Number.isFinite(n) ? n : fb;
  };

  const colors: DesignColors = {
    background: pick('color-background', d.colors.background),
    surface: pick('color-surface', d.colors.surface),
    text: pick('color-text', d.colors.text),
    textMuted: pick('color-text-muted', d.colors.textMuted),
    border: pick('color-border', d.colors.border),
    primary: pick('color-primary', d.colors.primary),
    primaryText: pick('color-primary-text', d.colors.primaryText),
    accent: pick('color-accent', d.colors.accent),
    danger: pick('color-danger', d.colors.danger),
    success: pick('color-success', d.colors.success),
  };
  const radii: DesignRadii = {
    surface: pick('radius-surface', d.radii.surface),
    button: pick('radius-button', d.radii.button),
    pill: pick('radius-pill', d.radii.pill),
  };
  const typography: DesignTypography = {
    fontSans: pick('font-sans', d.typography.fontSans),
    fontMono: pick('font-mono', d.typography.fontMono),
    baseSize: pick('font-size-base', d.typography.baseSize),
    scaleRatio: d.typography.scaleRatio,
    headingWeight: num('font-weight-heading', d.typography.headingWeight),
    bodyWeight: num('font-weight-body', d.typography.bodyWeight),
  };
  const spacing = Object.keys(vars)
    .filter((k) => /^space-\d+$/.test(k))
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)))
    .map((k) => parseInt(vars[k], 10))
    .filter((n) => Number.isFinite(n));

  return {
    name,
    tokens: {
      buttonStyle: buttonStyleFromRadius(radii.button),
      colors,
      typography,
      radii,
      spacing: spacing.length ? spacing : [...d.spacing],
      components: structuredClone(d.components),
    },
    body: `# ${name}\n\nImported from CSS variables.\n`,
  };
}

/**
 * Best-effort import of an existing design system pasted as text: a DESIGN.md
 * (YAML frontmatter), a `:root` CSS-variables block, or freeform text (kept as the
 * body with default tokens). Always returns a valid doc.
 */
export function importDesign(text: string): DesignDoc {
  const t = (text ?? '').trim();
  if (/^---\r?\n/.test(t)) return parseDoc(t);
  if (/:root|--[\w-]+\s*:/.test(t)) return docFromCss(t);
  return parseDoc(t);
}

// ---- Derived values ------------------------------------------------------

/** Resolve a button's corner radius for the active preset. */
export function buttonRadius(tokens: DesignTokens): string {
  switch (tokens.buttonStyle) {
    case 'pill':
      return tokens.radii.pill;
    case 'square':
      return '0px';
    default:
      return tokens.radii.button;
  }
}

/** Compute a small modular type scale (px numbers) from the base size + ratio. */
export function typeScale(t: DesignTypography): { label: string; size: number }[] {
  const base = parseFloat(t.baseSize) || 16;
  const r = t.scaleRatio || 1.25;
  const steps: { label: string; step: number }[] = [
    { label: 'Display', step: 4 },
    { label: 'H1', step: 3 },
    { label: 'H2', step: 2 },
    { label: 'H3', step: 1 },
    { label: 'Body', step: 0 },
    { label: 'Small', step: -1 },
  ];
  return steps.map((s) => ({ label: s.label, size: Math.round(base * Math.pow(r, s.step) * 100) / 100 }));
}

/** Inline custom properties for the scoped `.ds-preview` container. */
export function tokensToPreviewVars(tokens: DesignTokens): React.CSSProperties {
  const c = tokens.colors;
  const vars: Record<string, string> = {
    '--ds-bg': c.background,
    '--ds-surface': c.surface,
    '--ds-text': c.text,
    '--ds-text-muted': c.textMuted,
    '--ds-border': c.border,
    '--ds-primary': c.primary,
    '--ds-primary-text': c.primaryText,
    '--ds-accent': c.accent,
    '--ds-danger': c.danger,
    '--ds-success': c.success,
    '--ds-font-sans': tokens.typography.fontSans,
    '--ds-font-mono': tokens.typography.fontMono,
    '--ds-radius-surface': tokens.radii.surface,
    '--ds-radius-button': buttonRadius(tokens),
  };
  return vars as unknown as React.CSSProperties;
}

// ---- Exports -------------------------------------------------------------

/** Generate a `:root { … }` CSS custom-properties stylesheet from the tokens. */
export function toCss(tokens: DesignTokens): string {
  const c = tokens.colors;
  const lines: string[] = [
    '  /* Colors */',
    `  --color-background: ${c.background};`,
    `  --color-surface: ${c.surface};`,
    `  --color-text: ${c.text};`,
    `  --color-text-muted: ${c.textMuted};`,
    `  --color-border: ${c.border};`,
    `  --color-primary: ${c.primary};`,
    `  --color-primary-text: ${c.primaryText};`,
    `  --color-accent: ${c.accent};`,
    `  --color-danger: ${c.danger};`,
    `  --color-success: ${c.success};`,
    '',
    '  /* Typography */',
    `  --font-sans: ${tokens.typography.fontSans};`,
    `  --font-mono: ${tokens.typography.fontMono};`,
    `  --font-size-base: ${tokens.typography.baseSize};`,
    `  --font-weight-heading: ${tokens.typography.headingWeight};`,
    `  --font-weight-body: ${tokens.typography.bodyWeight};`,
    '',
    '  /* Radii */',
    `  --radius-surface: ${tokens.radii.surface};`,
    `  --radius-button: ${buttonRadius(tokens)};`,
    `  --radius-pill: ${tokens.radii.pill};`,
    '',
    '  /* Spacing scale */',
    ...tokens.spacing.map((n, i) => `  --space-${i + 1}: ${n}px;`),
  ];
  return `:root {\n${lines.join('\n')}\n}\n`;
}

/** Generate an AGENTS.md companion that points coding agents at the design system. */
export function toAgentsMd(name: string): string {
  return `# AGENTS.md

## Design system

This project follows the **${name}** design system, defined in \`DESIGN.md\`.

When doing any UI work — building components, pages, or styling — you MUST:

1. Read \`DESIGN.md\` first and treat its tokens as the single source of truth.
2. Use the design tokens (colors, typography, spacing, radii, button style) exactly
   as specified. Prefer the CSS custom properties from the system's \`design.css\`
   over hardcoded values.
3. Match the button style preset and component conventions described in \`DESIGN.md\`.
4. If a needed token is missing, propose an addition to \`DESIGN.md\` rather than
   inventing an inconsistent value.

Keep the implementation visually consistent with the system at all times.
`;
}

/** Trigger a client-side text download. Mirrors the pattern in src/storage.ts. */
export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** A filesystem-safe slug for export filenames. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'design-system'
  );
}
