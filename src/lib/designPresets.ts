import {
  DEFAULT_TOKENS,
  MONO_FONTS,
  SANS_FONTS,
  fontStack,
  serializeDoc,
  type DesignDoc,
  type DesignTokens,
} from './designModel';

/** Brand whose monogram mark we show on a preset card. */
export type PresetBrand = 'linear' | 'elevenlabs' | 'scale' | 'awesomic';

/**
 * Starter design systems shown in the "new system" template picker.
 * `markdown` is a full, valid DESIGN.md (frontmatter + body).
 *
 * The four brand presets below carry tokens hand-derived from the matching
 * `templates/variables-*.css` files, so their fonts/colors/radii are accurate
 * (the prose `templates/*.md` files have no frontmatter to parse). Any *other*
 * `templates/*.md` is still auto-registered via the Vite glob at the bottom.
 */
export interface Preset {
  id: string;
  label: string;
  description: string;
  markdown: string;
  /** Drives the brand monogram mark on the card. */
  brand?: PresetBrand;
  /** The templates/<file> this preset represents (so the glob can skip it). */
  sourceFile?: string;
}

const sans = (key: string) => fontStack(key, SANS_FONTS);
const mono = (key: string) => fontStack(key, MONO_FONTS);

/** Deep-partial token overrides — sub-objects fill any missing fields from DEFAULT_TOKENS. */
type PartialTokens = {
  buttonStyle?: DesignTokens['buttonStyle'];
  shadow?: DesignTokens['shadow'];
  colors?: Partial<DesignTokens['colors']>;
  typography?: Partial<DesignTokens['typography']>;
  radii?: Partial<DesignTokens['radii']>;
  spacing?: number[];
  components?: Partial<DesignTokens['components']>;
};

function make(name: string, body: string, tokens: PartialTokens): string {
  const d = DEFAULT_TOKENS;
  const merged: DesignTokens = {
    ...d,
    ...tokens,
    colors: { ...d.colors, ...tokens.colors },
    typography: { ...d.typography, ...tokens.typography },
    radii: { ...d.radii, ...tokens.radii },
    components: { ...d.components, ...tokens.components },
  };
  const doc: DesignDoc = { name, tokens: merged, body: body.trim() + '\n' };
  return serializeDoc(doc);
}

// Reconstructed from mosaik's own :root[data-theme='dark'] tokens in styles.css.
const mosaik = make(
  'Mosaik',
  `# Mosaik

A monochrome, high-contrast system. Near-white ink on near-black surfaces, a single
inverted "accent" (the text color itself), and one semantic red. Restrained radii,
Sora for UI and JetBrains Mono for code.

## Principles
- No hues except semantic states. Contrast comes from value, not color.
- Surfaces: \`background\` for the canvas, \`surface\` for cards/modals/inputs.
- Radii: 10px surfaces, 8px buttons, pill chips.`,
  {
    buttonStyle: 'rounded',
    colors: {
      background: '#0a0a0a',
      surface: '#141414',
      text: '#ededed',
      textMuted: '#9b9b9b',
      border: '#262626',
      primary: '#ededed',
      primaryText: '#0a0a0a',
      accent: '#ededed',
      danger: '#ef4444',
      success: '#22c55e',
    },
    radii: { surface: '10px', button: '8px', pill: '999px' },
  }
);

const minimal = make(
  'Minimal Light',
  `# Minimal Light

Clean, airy, neutral. Plenty of whitespace, hairline borders, a calm indigo accent.
Built for content-first products and dashboards.

## Principles
- Light canvas, subtle elevation, no heavy shadows.
- One accent used sparingly for primary actions and links.`,
  {
    buttonStyle: 'rounded',
    colors: {
      background: '#ffffff',
      surface: '#f7f7f8',
      text: '#18181b',
      textMuted: '#71717a',
      border: '#e4e4e7',
      primary: '#4f46e5',
      primaryText: '#ffffff',
      accent: '#4f46e5',
      danger: '#dc2626',
      success: '#16a34a',
    },
    typography: {
      ...DEFAULT_TOKENS.typography,
      fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      scaleRatio: 1.2,
    },
    radii: { surface: '12px', button: '8px', pill: '999px' },
  }
);

const brutalist = make(
  'Neo-Brutalist',
  `# Neo-Brutalist

Loud, blocky, unapologetic. Hard square corners, thick black borders, flat blocks of
color, chunky mono type. Shadows are solid offsets, not blurs.

## Principles
- Square everything. No rounded corners.
- High-contrast primary blocks; borders do the heavy lifting.`,
  {
    buttonStyle: 'square',
    colors: {
      background: '#fffef2',
      surface: '#ffffff',
      text: '#000000',
      textMuted: '#444444',
      border: '#000000',
      primary: '#ffde00',
      primaryText: '#000000',
      accent: '#ff5c00',
      danger: '#ff0000',
      success: '#00c853',
    },
    typography: {
      ...DEFAULT_TOKENS.typography,
      fontSans: "'Space Grotesk', 'JetBrains Mono', ui-monospace, monospace",
      headingWeight: 800,
      scaleRatio: 1.333,
    },
    radii: { surface: '0px', button: '0px', pill: '0px' },
    components: { shadows: true, borders: true, density: 'comfortable' },
  }
);

const soft = make(
  'Soft Pop',
  `# Soft Pop

Friendly and rounded. Pill buttons, gentle pastel surfaces, a warm violet accent.
Great for consumer apps and onboarding flows.

## Principles
- Generous radii; pill-shaped buttons and inputs.
- Soft elevation, low-contrast borders.`,
  {
    buttonStyle: 'pill',
    colors: {
      background: '#faf7ff',
      surface: '#ffffff',
      text: '#2e1065',
      textMuted: '#7c6f9b',
      border: '#ece5fa',
      primary: '#7c3aed',
      primaryText: '#ffffff',
      accent: '#ec4899',
      danger: '#e11d48',
      success: '#10b981',
    },
    typography: {
      ...DEFAULT_TOKENS.typography,
      fontSans: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      scaleRatio: 1.2,
    },
    radii: { surface: '18px', button: '14px', pill: '999px' },
  }
);

const corporate = make(
  'Corporate Blue',
  `# Corporate Blue

Trustworthy and professional. A confident blue primary, neutral grays, restrained
radii. Built for B2B SaaS, admin tools, and enterprise dashboards.

## Principles
- Blue primary for actions; neutral surfaces everywhere else.
- Conservative radii and clear, legible typography.`,
  {
    buttonStyle: 'rounded',
    colors: {
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#0f172a',
      textMuted: '#64748b',
      border: '#e2e8f0',
      primary: '#2563eb',
      primaryText: '#ffffff',
      accent: '#0ea5e9',
      danger: '#dc2626',
      success: '#16a34a',
    },
    typography: {
      ...DEFAULT_TOKENS.typography,
      fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      scaleRatio: 1.25,
    },
    radii: { surface: '8px', button: '6px', pill: '999px' },
  }
);

const builtIn: Preset[] = [
  { id: 'mosaik', label: 'Mosaik', description: "mosaik's own monochrome system", markdown: mosaik },
  { id: 'minimal', label: 'Minimal Light', description: 'Clean, airy, neutral', markdown: minimal },
  { id: 'brutalist', label: 'Neo-Brutalist', description: 'Loud, blocky, square', markdown: brutalist },
  { id: 'soft', label: 'Soft Pop', description: 'Rounded, pastel, friendly', markdown: soft },
  { id: 'corporate', label: 'Corporate Blue', description: 'Professional B2B SaaS', markdown: corporate },
];

// --- Brand presets (tokens hand-derived from templates/variables-*.css) -----

const linear = make(
  'Linear',
  `# Linear

A midnight command deck: near-black canvas, razor-thin Inter, one indigo primary,
and an acid-lime accent rationed to a single status cue. Dense, quiet, engineered.

## Principles
- Cool monochrome surfaces; contrast from value, not color.
- 1px inset borders and soft shadows instead of fills.
- Compact density; tight tracking on display type.`,
  {
    buttonStyle: 'rounded',
    colors: {
      background: '#08090a',
      surface: '#161718',
      text: '#f7f8f8',
      textMuted: '#8a8f98',
      border: '#23252a',
      primary: '#5e6ad2',
      primaryText: '#ffffff',
      accent: '#e4f222',
      danger: '#eb5757',
      success: '#27a644',
    },
    typography: {
      ...DEFAULT_TOKENS.typography,
      fontSans: sans('Inter'),
      fontMono: mono('JetBrains Mono'),
      scaleRatio: 1.25,
      headingWeight: 600,
      bodyWeight: 400,
    },
    radii: { surface: '12px', button: '6px', pill: '9999px' },
    components: { shadows: true, borders: true, density: 'compact' },
  }
);

const elevenlabs = make(
  'ElevenLabs',
  `# ElevenLabs

Warm editorial light: parchment canvas, ink-black text, an electric blue primary
and an ember-orange accent. Pill buttons, generous radii, calm and trustworthy.

## Principles
- Off-white surfaces with hairline borders and barely-there shadows.
- One vivid primary for action; ember accent used sparingly.
- Rounded, friendly geometry throughout.`,
  {
    buttonStyle: 'pill',
    colors: {
      background: '#fdfcfc',
      surface: '#f5f3f1',
      text: '#000000',
      textMuted: '#777169',
      border: '#e5e5e5',
      primary: '#0447ff',
      primaryText: '#ffffff',
      accent: '#ff4704',
      danger: '#e5484d',
      success: '#1a7f37',
    },
    typography: {
      ...DEFAULT_TOKENS.typography,
      fontSans: sans('Manrope'),
      fontMono: mono('JetBrains Mono'),
      scaleRatio: 1.2,
      headingWeight: 700,
      bodyWeight: 400,
    },
    radii: { surface: '20px', button: '9999px', pill: '9999px' },
    components: { shadows: true, borders: true, density: 'comfortable' },
  }
);

const scale = make(
  'Scale',
  `# Scale

Pure black canvas, white CTAs, and an iridescent accent. Minimal, high-contrast,
and confident — a lot of negative space and a single bright moment of color.

## Principles
- True black surfaces; white is the primary action color.
- Iridescent accent as the only hue; everything else is grayscale.
- Roomy spacing, large type, no heavy elevation.`,
  {
    buttonStyle: 'pill',
    colors: {
      background: '#000000',
      surface: '#111111',
      text: '#ffffff',
      textMuted: '#a1a1a1',
      border: '#262626',
      primary: '#ffffff',
      primaryText: '#000000',
      accent: '#d1aad7',
      danger: '#ef4444',
      success: '#22c55e',
    },
    typography: {
      ...DEFAULT_TOKENS.typography,
      fontSans: sans('DM Sans'),
      fontMono: mono('JetBrains Mono'),
      scaleRatio: 1.3,
      headingWeight: 500,
      bodyWeight: 400,
    },
    shadow: 'none',
    radii: { surface: '16px', button: '9999px', pill: '9999px' },
    components: { shadows: false, borders: true, density: 'comfortable' },
  }
);

const awesomic = make(
  'Awesomic',
  `# Awesomic

Playful and bright: soft off-white canvas, vivid orange primary, an orchid-pink
accent, and big pillowy radii. Bold Space Grotesk headings, friendly and energetic.

## Principles
- Large corner radii on cards and controls.
- Hot orange primary with a magenta accent for delight.
- Light, airy surfaces with clear elevation.`,
  {
    buttonStyle: 'rounded',
    colors: {
      background: '#f4f4f5',
      surface: '#ffffff',
      text: '#09090b',
      textMuted: '#71717a',
      border: '#ececee',
      primary: '#ff5a00',
      primaryText: '#ffffff',
      accent: '#fe45e2',
      danger: '#ef4444',
      success: '#22c55e',
    },
    typography: {
      ...DEFAULT_TOKENS.typography,
      fontSans: sans('Space Grotesk'),
      fontMono: mono('JetBrains Mono'),
      scaleRatio: 1.25,
      headingWeight: 700,
      bodyWeight: 400,
    },
    radii: { surface: '28px', button: '16px', pill: '9999px' },
    components: { shadows: true, borders: true, density: 'comfortable' },
  }
);

const brandPresets: Preset[] = [
  { id: 'linear', label: 'Linear', description: 'Dark, dense, engineered', markdown: linear, brand: 'linear', sourceFile: 'linear-design.md' },
  { id: 'elevenlabs', label: 'ElevenLabs', description: 'Warm editorial light', markdown: elevenlabs, brand: 'elevenlabs', sourceFile: 'elevenlabs-design.md' },
  { id: 'scale', label: 'Scale', description: 'Black canvas, iridescent accent', markdown: scale, brand: 'scale', sourceFile: 'scale-design.md' },
  { id: 'awesomic', label: 'Awesomic', description: 'Playful, bright, rounded', markdown: awesomic, brand: 'awesomic', sourceFile: 'awesomic-design.md' },
];

// Auto-register any *other* templates/*.md (ones without a curated brand preset
// above). The real heading becomes the name, so they read sensibly in the picker.
const CURATED_FILES = new Set(brandPresets.map((p) => p.sourceFile));

function firstHeading(markdown: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/[—–-].*$/, '').trim() : '';
}

const templateFiles = import.meta.glob('/templates/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const fromTemplates: Preset[] = Object.entries(templateFiles)
  .filter(([path]) => !CURATED_FILES.has(path.split('/').pop() ?? ''))
  .map(([path, markdown]) => {
    const file = path.split('/').pop() ?? path;
    const label = firstHeading(markdown) || file.replace(/\.md$/i, '').replace(/[-_]/g, ' ');
    return { id: `template:${file}`, label, description: 'Custom template', markdown, sourceFile: file };
  });

export const PRESETS: Preset[] = [...builtIn, ...brandPresets, ...fromTemplates];
