# design-sync notes — mosaik

mosaik is an **application**, not a component library. This sync is a deliberate
"best-effort" import of a curated, mostly-presentational subset of its UI, via a
hand-written entry barrel (`ds-entry.tsx` at repo root) that re-exports the
chosen components under stable names → `window.Mosaik`. There is no `dist/`; the
converter runs in explicit-entry mode (`--entry ./ds-entry.tsx`), esbuild
bundles straight from `src/`.

## Build / run

```
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules ./node_modules --entry ./ds-entry.tsx --out ./ds-bundle
node .ds-sync/package-validate.mjs ./ds-bundle
```

- `--node-modules ./node_modules` (repo root; all deps already installed, no reinstall needed).
- Node 22, npm lockfile. Playwright chromium installed into the user cache for the render check.

## Preview authoring recipe (THIS repo)

- **Import:** `import { X } from 'mosaik'` (shims to `window.Mosaik`); `import { useEffect } from 'react'` (→ window.React). `jsx: automatic`.
- **DARK THEME IS MANDATORY.** Tokens live under `:root[data-theme='dark'|'light']` with **no default** — without the attribute, `--bg`/`--text` are undefined (white body, browser-default text). Every preview must, on mount:
  ```js
  document.documentElement.setAttribute('data-theme', 'dark');
  document.body.style.background = '#0a0a0a';
  ```
  (Dark is mosaik's signature look — landing page, `theme-color #0a0a0a`.)
- **Landing sections use `.reveal`** (opacity:0/blur until a shared IntersectionObserver in `Landing.tsx` adds `.in`). In isolation, force it on mount:
  ```js
  ref.current?.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  ```
  Without this, reveal content renders blank (Footer, WhySection) or dimmed (StatsSection).
- **Overlays** (VariableFiller, ConfirmDialog modal, Toast stack) → `cfg.overrides.<Name> = {cardMode:'single', viewport:'WxH'}` so the fixed overlay sits in the card.
- **Wide landing sections** → `cfg.overrides.<Name> = {cardMode:'column'}`.
- Helper functions inside a preview must **not** be exported (named exports become cells).
- Count-up / typewriter (StatsSection, WorkspaceSection) animate; capture (networkidle, no reduced-motion in package shape) catches them near-final — plausible, accept.

## Harness gotchas (folded from fan-out wave learnings)

- **Reveal-gating beyond `.reveal`.** Some sections hide body content behind a *different* class toggled by the component's OWN IntersectionObserver (which doesn't fire in headless capture). `HowItWorksSection`: step cards (`.hiw-card`) stay `opacity:0` until `.hiw-steps` gets `.in`. Rule: if a section's headline renders but its body/cards are blank, grep `src/styles.css` for the child class, find the `opacity:0 … <parent>.in <child>` gate, and add `.in` to that gating parent in the stage `useEffect` (not just `.reveal`). `WorkspaceSection`/`MarqueeSection` didn't need this (their inner mockup isn't gated).
- **`position:fixed` overlays mis-anchor in single-card mode.** The story root (`.ds-single` / `.ds-cell`) carries `transform: translateZ(0)`, which makes it the containing block for `position:fixed` descendants. mosaik's `.toast-stack` (`position:fixed; bottom:20px`) then pins to a collapsed root and captures BLANK even though it's in the DOM. Fix: wrap the provider's children in a `min-height:100vh` stage so the root fills the card. (Modals like `.modal-overlay` cover the viewport and have height, so they're fine — this bites height-collapsing overlays like the toast stack.)
- **Auto-dismiss runs on the real clock during capture.** `package-capture.mjs` uses `page.clock.setFixedTime` (freezes `Date.now()`) but does NOT fake timers — `setTimeout`/`setInterval` fire on wall-clock, and `networkidle`+settle exceeds mosaik's 2400ms toast dismiss. Fix: re-push the toast batch on a ~2000ms interval so a fresh one always overlaps before the previous expires. Legitimate "drive on mount", not faked markup.

## Known render warns (triaged, expected — not new)

- `[TOKENS_MISSING]` for `--ds-*` vars (--ds-bg, --ds-text, --ds-surface, …): these are injected at runtime by mosaik's *in-app design-preview feature*, whose CSS got swept into the copied 113KB `styles.css`. None of the 13 synced components use them. Expected, non-blocking.
- Fonts (Sora, JetBrains Mono) load via remote Google `@font-face` provided through `cfg.extraFonts` (`.design-sync/fonts.css`, fetched with a Chrome UA for woff2). They are runtime-fetched from gstatic — `[FONT_REMOTE]`-style, no local woff2 shipped.

## Component-specific

- **Dropdown**: the option menu is portaled + opened by internal state — can't be forced open from props, so cards show the resting trigger only.
- **ImageDropzone**: imports `db.ts` → bundles `@supabase/supabase-js` (≈ the bulk of the 960KB bundle). Harmless (module init has safe fallbacks), but it's why the bundle is large. Renders its empty drop state statically.
- **ConfirmDialog/Toast**: exported as the provider (ConfirmProvider→ConfirmDialog, ToastProvider→Toast). Their visible UI (modal / toast) only appears when `confirm()` / `toast()` is called — previews must drive that on mount (useConfirm/useToast ride on window.Mosaik).

## Known cosmetic gaps (accepted)

- **HowItWorksSection** renders a tiny broken-image glyph in its footer line: the component hardcodes `<img src="/favicon.svg">` (decorative, `aria-hidden`), an absolute path that resolves to the DS project root where no favicon ships. Harmless; left as-is (would require editing the app component). A future option: ship a `favicon.svg` at the bundle root.
- **StatsSection / WorkspaceSection** count-up + typewriter capture near-final (not exact target) — plausible, accepted.
- **Dropdown** cards show the resting trigger only (portaled menu can't open from props).

## Re-sync risks (watch list)

- `.design-sync/fonts.css` is a fetched snapshot of Google Fonts CSS (gstatic URLs versioned, e.g. Sora v18). If Google rotates URLs the faces still work (remote), but a refetch may be wanted.
- The curated set is pinned in `ds-entry.tsx` + `cfg.componentSrcMap`. Adding/removing app components does NOT change the sync unless the barrel is edited.
- Previews assume dark theme + the current class vocabulary in `src/styles.css`; a class rename upstream (e.g. `.card`, `.modal`, `.vs-card`, `.ws-app`) would silently degrade a card.
