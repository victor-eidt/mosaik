# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**mosaik** (package name; repo is `prompt-manager`) is a personal library for reusable AI assets — prompts, landing-page design references, UI snippets, and saved tweets — with cloud sync per user. It's a Vite + React 18 + TypeScript SPA backed by Supabase (Postgres + Auth + Storage), deployed on Vercel.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc (typecheck, no emit) then vite build — use this to verify types
npm run preview  # serve the production build
```

There is no test runner, linter, or formatter configured. `npm run build` is the only correctness gate — run it after non-trivial changes since `tsc` will catch type errors.

## Environment

Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Local values live in gitignored `.env.local`; production values must also be set in the Vercel project. When both are missing, `isConfigured` is false (`src/lib/supabase.ts`) and `App` renders a setup screen instead of crashing.

## Architecture

**Routing via `react-router-dom`** (`BrowserRouter` in `main.tsx`). `App.tsx` owns nearly all top-level state and renders `<Routes>`: `/` → marketing `Landing`, `/login` → `Auth`, `/app/:space` → the workspace (redirects based on auth; logged-out hits fall to `Landing`). Deep links rely on `vercel.json`'s SPA rewrite in production. Two navigation axes:
- `Space` (`'prompts' | 'landing' | 'ui' | 'tweets'`) — the top-level section, **derived from the URL** (`/app/:space`); `Sidebar` switches it via `navigate`. A `useEffect` on `space` resets the filters.
- `SelectedView` — a folder id or one of the `VIEW_ALL` / `VIEW_FAVORITES` / `VIEW_UNCATEGORIZED` sentinel constants (`src/types.ts`), still **in-memory** (not routed). Folders apply only to the prompts space.

**The prompts space lives directly in `App.tsx`** (loading, filtering, sorting, all CRUD). The other three spaces are self-contained components (`LandingSpace`, `UiSpace`, `TweetSpace`) that each load and manage their own data and follow the same internal pattern: `useState` list + `db.fetch*` on mount + signed-URL map for images. When adding a feature to a non-prompts space, edit that space component, not `App.tsx`.

**All persistence goes through `src/lib/db.ts`** — the only module that talks to Supabase tables/storage. Each entity (`prompts`, `folders`, `landing_pages`, `ui_elements`, `tweets`) has a parallel set of helpers: a `*Row` interface (snake_case, as stored), a `to*` mapper to the camelCase domain type, a `*Row()` builder, and `fetch/create/update/delete` functions. Domain types are in `src/types.ts`. **Keep these three in sync** when adding or renaming a column: the SQL column, the `*Row` interface + mapper in `db.ts`, and the domain interface in `types.ts`.

**Optimistic UI:** mutations update React state first, then call `db.*`, reverting on error (see `toggleFavorite`, `renameFolder` in `App.tsx`). `uses` counter increments are fire-and-forget.

### Supabase specifics
- Auth is **email + password** (`signInWithPassword` / `signUp`). All tables have a `user_id` column with owner-only RLS, so queries don't filter by user manually — RLS does it.
- Schema changes: use the Supabase MCP `apply_migration` against project ref `cgociqdhdcpkqltaicmu` (project "prompt-manager"), then run `get_advisors` to confirm RLS coverage.
- Images live in the private `prompt-images` Storage bucket under `{user_id}/{uuid}.{ext}`. They're never public — `db.ts` mints 8-hour signed URLs (`signedUrl`/`signedUrls`), which the UI holds in a `imageUrls: Record<path, url>` map. A storage file is owned by one row; duplicating a prompt deliberately drops the image so deleting either copy can't break the other.
- `prompts.folder_id` is `ON DELETE SET NULL`, so deleting a folder leaves its prompts as uncategorized.

### Legacy localStorage migration
`src/storage.ts` is the pre-cloud localStorage layer, now mostly dormant. On first login, if the user's cloud account is empty, `App` one-time-migrates any legacy localStorage prompts into the DB via `db.bulkImport` (which remaps local folder ids to server ids by name), then clears local. `exportData` (the footer "Backup" button) still uses it to download a JSON snapshot.

### Other lib modules
- `src/lib/template.ts` — `{{variable}}` placeholder handling. `extractVars` drives whether copying a prompt opens the `VariableFiller` modal; `renderTemplate` fills it. Names allow `[\w.-]`.
- `src/lib/preview.ts` — fetches Open Graph preview metadata for landing-page URLs via the free Microlink API (no key); returns nulls on any failure so saving still works.

### UI conventions
- Icons come from `@phosphor-icons/react`.
- Toasts via `useToast()` (`components/Toast.tsx`); confirm dialogs via `useConfirm()` (`components/ConfirmDialog.tsx`).
- Theme (`dark`/`light`) is a `data-theme` attribute on `<html>`, persisted to `localStorage` under `mosaik:theme`.
- All styling is one global `src/styles.css` (no CSS modules / Tailwind). Note: a linter reorders CSS properties in this file — re-read a block verbatim right before an Edit or the `old_string` match will fail.
