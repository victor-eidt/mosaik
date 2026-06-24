# Building with mosaik

mosaik is a monochrome design system (neutral grays + one semantic red), Sora for
text and JetBrains Mono for code. It styles via **global CSS classes + CSS custom
properties** — there are no utility classes, no style props, no CSS-in-JS.

## Setup — a theme attribute is REQUIRED

All color/elevation tokens are defined under `:root[data-theme='dark']` and
`:root[data-theme='light']`. With **no** `data-theme` attribute on `<html>`, the
tokens are undefined and everything renders unstyled (white background, default
fonts). Always set one:

```html
<html data-theme="dark">   <!-- dark is the signature look; "light" also ships -->
```

Two components are **providers** — wrap the app once so their hooks work:
`Toast` (gives `useToast()` → `push(message, 'success'|'info'|'error')`) and
`ConfirmDialog` (gives `useConfirm()` → `await confirm({ title, message, confirmText, danger })`).
Their UI (toast stack / confirm modal) is rendered by the provider; you trigger it
via the hook, you don't mount it yourself.

```jsx
<Toast><ConfirmDialog>{/* app */}</ConfirmDialog></Toast>
```

## Styling idiom — class families (use these, don't invent names)

- **Buttons:** `.btn` + a variant `.primary` | `.ghost` | `.danger-solid`, plus size `.sm`
  (`<button class="btn primary sm">`). Icon-only: `.icon-btn` (add `.danger` for destructive).
- **Surfaces:** `.card` (with `.card-head` / `.card-body` / `.card-foot` / `.card-actions`);
  modals `.modal-overlay` > `.modal` (with `.modal-head` / `.modal-foot`).
- **Inputs:** `.field` + `.field-label`; the custom select is `.dropdown` > `.dropdown-trigger`.
- **Chips & labels:** `.tag` (in a `.tag-row`), `.meta-chip`, `.link-chip`, `.hint`, `.star`.
- **Toasts:** `.toast` inside `.toast-stack` (provider-rendered — see above).

## Tokens (CSS custom properties — style your own layout glue with these)

- Color: `--bg`, `--bg-elev`, `--bg-elev-2`, `--bg-inset`, `--text`, `--text-dim`,
  `--text-faint`, `--accent`, `--on-accent`, `--border`, `--border-strong`,
  `--accent-soft`, `--danger`, `--danger-soft`.
- Type: `--font-sans` (Sora), `--font-mono` (JetBrains Mono).
- Radius (a documented rule): `--r-surface` = 10px (cards/modals/inputs),
  `--r-btn` = 8px (buttons), `--r-pill` (tags/chips). Motion easing: `--ease`.

## Where the truth lives

Read the bound stylesheet closure before styling — `_ds/<folder>/styles.css`
`@import`s the real component CSS (`_ds_bundle.css`), the font faces, and the
token definitions. Per-component API + usage is in each `<Name>.prompt.md` and
`<Name>.d.ts`.

## Idiomatic snippet

```jsx
import { PromptCard } from '<ds-package>';

// app shell: tokens for layout glue, library component for the content
<div style={{ background: 'var(--bg)', color: 'var(--text)', padding: 'var(--r-surface)' }}>
  <header style={{ fontFamily: 'var(--font-sans)' }}>
    <button className="btn primary sm">New prompt</button>
    <button className="icon-btn" aria-label="Settings">…</button>
  </header>
  <PromptCard prompt={prompt} folderName="Engineering" /* …handlers */ />
</div>
```

## Notes / scope

mosaik's components are app parts, not generic primitives: `PromptCard`,
`VariableFiller`, `Dropdown`, `ImageDropzone`, plus full marketing sections
(`StatsSection`, `MarqueeSection`, `WhySection`, `HowItWorksSection`,
`WorkspaceSection`, `CtaSection`, `Footer`). The landing sections use a `.reveal`
entrance animation that activates on scroll into view.
