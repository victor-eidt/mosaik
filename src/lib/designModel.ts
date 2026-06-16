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

// ---- Parse / serialize ---------------------------------------------------

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** Deep-merge parsed frontmatter over defaults so partial / hand-edited files stay valid. */
function coerceTokens(raw: unknown): DesignTokens {
  const r = (raw ?? {}) as Record<string, unknown>;
  const d = DEFAULT_TOKENS;
  const obj = <T,>(v: unknown, fallback: T): T =>
    v && typeof v === 'object' ? ({ ...fallback, ...(v as object) } as T) : fallback;
  const buttonStyle = (['pill', 'rounded', 'square'] as const).includes(r.buttonStyle as ButtonStyle)
    ? (r.buttonStyle as ButtonStyle)
    : d.buttonStyle;
  const spacing = Array.isArray(r.spacing) && r.spacing.every((n) => typeof n === 'number')
    ? (r.spacing as number[])
    : d.spacing;
  return {
    buttonStyle,
    colors: obj(r.colors, d.colors),
    typography: obj(r.typography, d.typography),
    radii: obj(r.radii, d.radii),
    spacing,
    components: obj(r.components, d.components),
  };
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
    front = (yaml.load(match[1]) as Record<string, unknown>) ?? {};
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
