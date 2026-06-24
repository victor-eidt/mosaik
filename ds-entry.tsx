// Design-system entry for /design-sync.
//
// mosaik is an application, not a component library, so it has no published
// `dist/` of named-export components. This barrel re-exports the curated,
// mostly-presentational subset we sync to claude.ai/design under stable names,
// which esbuild bundles into `window.Mosaik.*`. It is a sync input only — the
// app build (tsc, scoped to `src/`) never sees it.
//
// Provider/hook pairs are surfaced under their design-system-facing names:
// ConfirmProvider -> ConfirmDialog, ToastProvider -> Toast. The hooks ride along
// on the global so authored previews can drive the overlays.

export { default as PromptCard } from './src/components/PromptCard';
export { default as Dropdown } from './src/components/Dropdown';
export { default as VariableFiller } from './src/components/VariableFiller';
export { default as ImageDropzone } from './src/components/ImageDropzone';

export { ConfirmProvider as ConfirmDialog, useConfirm } from './src/components/ConfirmDialog';
export { ToastProvider as Toast, useToast } from './src/components/Toast';

export { default as StatsSection } from './src/components/StatsSection';
export { default as MarqueeSection } from './src/components/MarqueeSection';
export { default as WhySection } from './src/components/WhySection';
export { default as HowItWorksSection } from './src/components/HowItWorksSection';
export { default as WorkspaceSection } from './src/components/WorkspaceSection';
export { default as CtaSection } from './src/components/CtaSection';
export { default as Footer } from './src/components/Footer';
