import { tokensToPreviewVars, typeScale, type DesignTokens } from '../../lib/designModel';

/**
 * Renders a live, scoped preview of a design system from its tokens. Everything is
 * driven by the `--ds-*` custom properties produced by `tokensToPreviewVars`, so the
 * preview updates instantly as the user edits tokens. Styles live in `.ds-preview` in
 * styles.css.
 */
export default function LivePreview({ tokens }: { tokens: DesignTokens }) {
  const scale = typeScale(tokens.typography);
  const swatches: { key: keyof DesignTokens['colors']; label: string }[] = [
    { key: 'background', label: 'Background' },
    { key: 'surface', label: 'Surface' },
    { key: 'primary', label: 'Primary' },
    { key: 'accent', label: 'Accent' },
    { key: 'text', label: 'Text' },
    { key: 'textMuted', label: 'Muted' },
    { key: 'border', label: 'Border' },
    { key: 'danger', label: 'Danger' },
    { key: 'success', label: 'Success' },
  ];

  return (
    <div className="ds-preview" style={tokensToPreviewVars(tokens)}>
      <div className="ds-preview-inner">
        {/* Colors */}
        <section className="ds-section">
          <h4 className="ds-section-title">Colors</h4>
          <div className="ds-swatches">
            {swatches.map((s) => (
              <div key={s.key} className="ds-swatch">
                <span className="ds-swatch-chip" style={{ background: tokens.colors[s.key] }} />
                <span className="ds-swatch-label">{s.label}</span>
                <span className="ds-swatch-hex">{tokens.colors[s.key]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="ds-section">
          <h4 className="ds-section-title">Typography</h4>
          <div className="ds-type-list">
            {scale.map((s) => (
              <div key={s.label} className="ds-type-row">
                <span
                  className="ds-type-sample"
                  style={{
                    fontSize: `${s.size}px`,
                    fontWeight:
                      s.label === 'Body' || s.label === 'Small'
                        ? tokens.typography.bodyWeight
                        : tokens.typography.headingWeight,
                    lineHeight: 1.15,
                  }}
                >
                  {s.label === 'Body' || s.label === 'Small'
                    ? 'The quick brown fox jumps over the lazy dog.'
                    : `${s.label} heading`}
                </span>
                <span className="ds-type-meta">
                  {s.label} · {s.size}px
                </span>
              </div>
            ))}
            <div className="ds-mono-sample">const tokens = "{tokens.buttonStyle}"; // mono</div>
          </div>
        </section>

        {/* Buttons */}
        <section className="ds-section">
          <h4 className="ds-section-title">Buttons · {tokens.buttonStyle}</h4>
          <div className="ds-row">
            <button className="ds-btn ds-btn-primary" type="button">
              Primary
            </button>
            <button className="ds-btn ds-btn-secondary" type="button">
              Secondary
            </button>
            <button className="ds-btn ds-btn-ghost" type="button">
              Ghost
            </button>
            <button className="ds-btn ds-btn-danger" type="button">
              Danger
            </button>
          </div>
        </section>

        {/* Components */}
        <section className="ds-section">
          <h4 className="ds-section-title">Components</h4>
          <div className="ds-row ds-row-wrap">
            <div className="ds-card">
              <div className="ds-card-title">Card title</div>
              <div className="ds-card-text">
                A surface using the system's radius, border, and shadow settings.
              </div>
              <div className="ds-row">
                <span className="ds-badge">Badge</span>
                <span className="ds-badge ds-badge-accent">Accent</span>
              </div>
            </div>
            <div className="ds-stack">
              <input className="ds-input" placeholder="Input field" readOnly />
              <div className="ds-alert">Heads up — this is an alert.</div>
            </div>
          </div>
        </section>

        {/* Spacing */}
        <section className="ds-section">
          <h4 className="ds-section-title">Spacing scale</h4>
          <div className="ds-spacing">
            {tokens.spacing.map((n, i) => (
              <div key={i} className="ds-spacing-item">
                <span className="ds-spacing-bar" style={{ width: `${n}px` }} />
                <span className="ds-spacing-label">{n}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
