import { tokensToPreviewVars, type DesignTokens } from '../../lib/designModel';
import type { PresetBrand } from '../../lib/designPresets';

/**
 * A compact, accurate mini-mockup of a design system rendered straight from its
 * tokens (same `--ds-*` vars as the full LivePreview), so cards in the picker and
 * grid show a truthful vignette — surface, type, primary button, accent — instead
 * of a bare palette strip. Styles live under `.ds-thumb` in styles.css.
 */
export default function DesignThumbnail({ tokens }: { tokens: DesignTokens }) {
  return (
    <div
      className="ds-thumb"
      style={{ ...tokensToPreviewVars(tokens), fontFamily: tokens.typography.fontSans }}
      aria-hidden
    >
      <div className="ds-thumb-card">
        <span className="ds-thumb-line head" />
        <span className="ds-thumb-line muted w80" />
        <span className="ds-thumb-line muted w60" />
        <div className="ds-thumb-actions">
          <span className="ds-thumb-btn">Aa</span>
          <span className="ds-thumb-chip" />
          <span className="ds-thumb-dot" />
        </div>
      </div>
    </div>
  );
}

/** Short monogram for a system — recognisable per brand, else the first letter. */
function monogram(brand: PresetBrand | undefined, name: string): string {
  switch (brand) {
    case 'elevenlabs':
      return '11';
    case 'linear':
      return 'L';
    case 'scale':
      return 'S';
    case 'awesomic':
      return 'A';
    default:
      return (name.trim()[0] || '?').toUpperCase();
  }
}

/**
 * A small brand "mark": a rounded chip filled with the system's primary color and
 * its monogram, set in the system's own font. Evokes the brand without reproducing
 * a trademarked logo.
 */
export function DesignBrandMark({
  tokens,
  brand,
  name,
}: {
  tokens: DesignTokens;
  brand?: PresetBrand;
  name: string;
}) {
  return (
    <span
      className="ds-brandmark"
      style={{
        background: tokens.colors.primary,
        color: tokens.colors.primaryText,
        fontFamily: tokens.typography.fontSans,
        borderColor: tokens.colors.border,
      }}
      aria-hidden
    >
      {monogram(brand, name)}
    </span>
  );
}
