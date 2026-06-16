import { DEFAULT_TOKENS, serializeDoc, type DesignDoc, type DesignTokens } from './designModel';

/**
 * Built-in starter design systems shown in the "new system" template picker.
 * `markdown` is a full, valid DESIGN.md (frontmatter + body).
 *
 * The user's own `templates/*.md` files are auto-appended via a Vite glob below,
 * so committing that folder makes them appear here with no code change.
 */
export interface Preset {
  id: string;
  label: string;
  description: string;
  markdown: string;
}

function make(name: string, body: string, tokens: Partial<DesignTokens>): string {
  const doc: DesignDoc = {
    name,
    tokens: { ...DEFAULT_TOKENS, ...tokens },
    body: body.trim() + '\n',
  };
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

// Auto-register any committed templates/*.md as additional presets.
const templateFiles = import.meta.glob('/templates/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const fromTemplates: Preset[] = Object.entries(templateFiles).map(([path, markdown]) => {
  const file = path.split('/').pop() ?? path;
  const label = file.replace(/\.md$/i, '').replace(/[-_]/g, ' ');
  return { id: `template:${file}`, label, description: 'From your templates/', markdown };
});

export const PRESETS: Preset[] = [...builtIn, ...fromTemplates];
