import { tokensToPreviewVars, typeScale, type DesignTokens } from '../../lib/designModel';

/**
 * Live, scoped preview of a design system, driven entirely by the `--ds-*` custom
 * properties from `tokensToPreviewVars` so it updates instantly as tokens change.
 * Shows a broad component set — colors, type (sans/serif/mono), buttons, form
 * controls, tabs, badges, alerts, an elevated panel, a table, and the shadow +
 * spacing scales. Styles live under `.ds-preview` in styles.css.
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
            <div className="ds-serif-sample">Editorial serif — for headlines &amp; quotes</div>
            <div className="ds-mono-sample">const tokens = "{tokens.buttonStyle}"; // mono</div>
          </div>
        </section>

        {/* Buttons */}
        <section className="ds-section">
          <h4 className="ds-section-title">Buttons · {tokens.buttonStyle}</h4>
          <div className="ds-row ds-row-wrap">
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
            <button className="ds-btn ds-btn-primary ds-btn-sm" type="button">
              Small
            </button>
          </div>
        </section>

        {/* Form controls */}
        <section className="ds-section">
          <h4 className="ds-section-title">Form controls</h4>
          <div className="ds-form">
            <input className="ds-input" placeholder="Text input" readOnly />
            <div className="ds-select">
              Select an option
              <span className="ds-select-caret">▾</span>
            </div>
            <label className="ds-control">
              <span className="ds-checkbox on">✓</span>
              <span>Checkbox</span>
            </label>
            <label className="ds-control">
              <span className="ds-radio on" />
              <span>Radio</span>
            </label>
            <label className="ds-control">
              <span className="ds-switch on">
                <span className="ds-switch-dot" />
              </span>
              <span>Toggle</span>
            </label>
          </div>
        </section>

        {/* Badges, chips, status */}
        <section className="ds-section">
          <h4 className="ds-section-title">Badges &amp; tags</h4>
          <div className="ds-row ds-row-wrap">
            <span className="ds-badge">Default</span>
            <span className="ds-badge ds-badge-accent">Accent</span>
            <span className="ds-badge ds-badge-primary">Primary</span>
            <span className="ds-chip">
              <span className="ds-dot ds-dot-success" /> Active
            </span>
            <span className="ds-chip">
              <span className="ds-dot ds-dot-danger" /> Error
            </span>
          </div>
        </section>

        {/* Alerts */}
        <section className="ds-section">
          <h4 className="ds-section-title">Alerts</h4>
          <div className="ds-stack">
            <div className="ds-alert ds-alert-accent">Heads up — an accent informational note.</div>
            <div className="ds-alert ds-alert-success">Saved successfully.</div>
            <div className="ds-alert ds-alert-danger">Something went wrong.</div>
          </div>
        </section>

        {/* Elevated panel + tabs */}
        <section className="ds-section">
          <h4 className="ds-section-title">Panel &amp; tabs</h4>
          <div className="ds-panel">
            <div className="ds-ptabs">
              <span className="ds-ptab on">Overview</span>
              <span className="ds-ptab">Activity</span>
              <span className="ds-ptab">Settings</span>
            </div>
            <div className="ds-panel-body">
              <div className="ds-panel-title">Project settings</div>
              <p className="ds-panel-text">
                An elevated surface using the system's radius, border, and shadow tokens.
              </p>
              <div className="ds-row">
                <button className="ds-btn ds-btn-primary ds-btn-sm" type="button">
                  Save
                </button>
                <button className="ds-btn ds-btn-ghost ds-btn-sm" type="button">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="ds-section">
          <h4 className="ds-section-title">Table</h4>
          <div className="ds-table">
            <div className="ds-tr ds-tr-head">
              <span>Name</span>
              <span>Status</span>
              <span>Value</span>
            </div>
            {[
              ['Production', 'success', '$4,200'],
              ['Staging', 'accent', '$980'],
              ['Archived', 'danger', '$0'],
            ].map(([name, tone, val]) => (
              <div key={name} className="ds-tr">
                <span>{name}</span>
                <span>
                  <span className={`ds-dot ds-dot-${tone}`} /> {tone === 'success' ? 'Live' : tone === 'danger' ? 'Down' : 'Idle'}
                </span>
                <span>{val}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Elevation scale */}
        <section className="ds-section">
          <h4 className="ds-section-title">Elevation · {tokens.shadow}</h4>
          <div className="ds-row ds-row-wrap">
            {(['none', 'sm', 'md', 'lg'] as const).map((lvl) => (
              <div key={lvl} className={`ds-elev ds-elev-${lvl}${tokens.shadow === lvl ? ' on' : ''}`}>
                {lvl}
              </div>
            ))}
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
