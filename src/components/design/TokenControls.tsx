import {
  type ButtonStyle,
  type DesignColors,
  type DesignTokens,
} from '../../lib/designModel';

/**
 * Structured editors for the design tokens (the frontmatter half of the doc).
 * Pure controlled component: every edit calls `onChange` with the next tokens.
 */
export default function TokenControls({
  tokens,
  onChange,
}: {
  tokens: DesignTokens;
  onChange: (next: DesignTokens) => void;
}) {
  const patch = (p: Partial<DesignTokens>) => onChange({ ...tokens, ...p });
  const setColor = (key: keyof DesignColors, value: string) =>
    patch({ colors: { ...tokens.colors, [key]: value } });

  const colorFields: { key: keyof DesignColors; label: string }[] = [
    { key: 'background', label: 'Background' },
    { key: 'surface', label: 'Surface' },
    { key: 'text', label: 'Text' },
    { key: 'textMuted', label: 'Muted text' },
    { key: 'border', label: 'Border' },
    { key: 'primary', label: 'Primary' },
    { key: 'primaryText', label: 'On primary' },
    { key: 'accent', label: 'Accent' },
    { key: 'danger', label: 'Danger' },
    { key: 'success', label: 'Success' },
  ];

  const buttonStyles: { value: ButtonStyle; label: string }[] = [
    { value: 'pill', label: 'Pill' },
    { value: 'rounded', label: 'Rounded' },
    { value: 'square', label: 'Square' },
  ];

  return (
    <div className="ds-controls">
      {/* Colors */}
      <details className="ds-group" open>
        <summary>Colors</summary>
        <div className="ds-color-grid">
          {colorFields.map((f) => (
            <div key={f.key} className="ds-color-field">
              <span className="ds-color-label">{f.label}</span>
              <div className="ds-color-input">
                <input
                  type="color"
                  value={normalizeHex(tokens.colors[f.key])}
                  onChange={(e) => setColor(f.key, e.target.value)}
                  aria-label={`${f.label} color`}
                />
                <input
                  type="text"
                  className="ds-hex"
                  value={tokens.colors[f.key]}
                  onChange={(e) => setColor(f.key, e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* Typography */}
      <details className="ds-group" open>
        <summary>Typography</summary>
        <label className="field">
          <span>Sans font stack</span>
          <input
            value={tokens.typography.fontSans}
            onChange={(e) => patch({ typography: { ...tokens.typography, fontSans: e.target.value } })}
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Mono font stack</span>
          <input
            value={tokens.typography.fontMono}
            onChange={(e) => patch({ typography: { ...tokens.typography, fontMono: e.target.value } })}
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Base size</span>
            <input
              value={tokens.typography.baseSize}
              onChange={(e) =>
                patch({ typography: { ...tokens.typography, baseSize: e.target.value } })
              }
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Scale ratio</span>
            <input
              type="number"
              step="0.01"
              min="1"
              value={tokens.typography.scaleRatio}
              onChange={(e) =>
                patch({
                  typography: { ...tokens.typography, scaleRatio: Number(e.target.value) || 1.2 },
                })
              }
            />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Heading weight</span>
            <input
              type="number"
              step="100"
              min="100"
              max="900"
              value={tokens.typography.headingWeight}
              onChange={(e) =>
                patch({
                  typography: { ...tokens.typography, headingWeight: Number(e.target.value) || 700 },
                })
              }
            />
          </label>
          <label className="field">
            <span>Body weight</span>
            <input
              type="number"
              step="100"
              min="100"
              max="900"
              value={tokens.typography.bodyWeight}
              onChange={(e) =>
                patch({
                  typography: { ...tokens.typography, bodyWeight: Number(e.target.value) || 400 },
                })
              }
            />
          </label>
        </div>
      </details>

      {/* Button style */}
      <details className="ds-group" open>
        <summary>Button style</summary>
        <div className="ds-segmented" role="group" aria-label="Button style">
          {buttonStyles.map((b) => (
            <button
              key={b.value}
              type="button"
              className={`ds-seg${tokens.buttonStyle === b.value ? ' on' : ''}`}
              onClick={() => patch({ buttonStyle: b.value })}
            >
              {b.label}
            </button>
          ))}
        </div>
      </details>

      {/* Radii */}
      <details className="ds-group">
        <summary>Radii</summary>
        <div className="field-row">
          <label className="field">
            <span>Surface</span>
            <input
              value={tokens.radii.surface}
              onChange={(e) => patch({ radii: { ...tokens.radii, surface: e.target.value } })}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Button</span>
            <input
              value={tokens.radii.button}
              onChange={(e) => patch({ radii: { ...tokens.radii, button: e.target.value } })}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Pill</span>
            <input
              value={tokens.radii.pill}
              onChange={(e) => patch({ radii: { ...tokens.radii, pill: e.target.value } })}
              autoComplete="off"
            />
          </label>
        </div>
      </details>

      {/* Spacing */}
      <details className="ds-group">
        <summary>Spacing scale</summary>
        <label className="field">
          <span>Steps (px, comma-separated)</span>
          <input
            value={tokens.spacing.join(', ')}
            onChange={(e) =>
              patch({
                spacing: e.target.value
                  .split(',')
                  .map((n) => parseInt(n.trim(), 10))
                  .filter((n) => Number.isFinite(n)),
              })
            }
            autoComplete="off"
          />
        </label>
      </details>

      {/* Components */}
      <details className="ds-group">
        <summary>Components</summary>
        <label className="ds-check">
          <input
            type="checkbox"
            checked={tokens.components.shadows}
            onChange={(e) => patch({ components: { ...tokens.components, shadows: e.target.checked } })}
          />
          <span>Elevation shadows</span>
        </label>
        <label className="ds-check">
          <input
            type="checkbox"
            checked={tokens.components.borders}
            onChange={(e) => patch({ components: { ...tokens.components, borders: e.target.checked } })}
          />
          <span>Component borders</span>
        </label>
        <div className="ds-segmented" role="group" aria-label="Density">
          {(['comfortable', 'compact'] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={`ds-seg${tokens.components.density === d ? ' on' : ''}`}
              onClick={() => patch({ components: { ...tokens.components, density: d } })}
            >
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

/** `<input type=color>` only accepts #rrggbb; fall back to black for named/rgba values. */
function normalizeHex(value: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
}
