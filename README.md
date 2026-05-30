# mosaik

**Your personal library for the pieces you build with.** mosaik is a single, fast home
for the prompts, designs, UI snippets, and posts you collect while making things -
organized, searchable, and synced across every device you sign in on.

Most of us scatter this stuff everywhere: prompts in a notes app, design inspiration in
browser bookmarks, code snippets in random gists, great tweets lost in likes. mosaik
pulls them into one tiled workspace - a mosaic of your creative raw material - so you
can actually find and reuse them.

## The four spaces

- **Prompts** - your prompt library. Organize into folders, tag, favorite, search, and
  copy any prompt in one click. Supports `{{variables}}`: write a placeholder, hit
  **Use**, fill in the values with a live preview, and copy the rendered result.
  Attach a result image to remember what a prompt produced.
- **Landing pages** - a swipe file for design inspiration. Save any URL and mosaik
  fetches a live preview (image, title, description); drop in your own screenshot to
  override it. Tag and favorite the ones worth coming back to.
- **UI elements** - reusable interface pieces: a screenshot, the code snippet behind it,
  its language, and a link to the source. Copy the code straight to your clipboard.
- **Tweets / X posts** - save threads and posts worth keeping, rendered as live embeds,
  with your own notes and tags on top.

Every item is searchable, taggable, favoritable, and scoped privately to your account.

## How it works

mosaik is a **Vite + React + TypeScript** single-page app backed by **Supabase**
(Postgres, auth, and private file storage). Sign-in is by email - your whole library
syncs anywhere you log in. Every row is locked to your account by Postgres Row Level
Security, and attached images live in an owner-only Storage bucket. Prefer light or
dark? Toggle it in the footer; the choice sticks.

## Environment

The app needs two variables (Supabase project → Settings → API):

```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

For local dev, put them in `.env.local` (gitignored). For production, add the same two
variables in your host's project settings. The anon/publishable key is safe to expose
in the browser - security is enforced by Supabase Row Level Security + auth, not by
hiding the key.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build

```bash
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build locally
```

## Deploy

This is a standard Vite project, so most hosts (Vercel, Netlify, …) auto-detect it:
build command `npm run build`, output directory `dist`. Add the two environment
variables above, then add your production URL to the Supabase project's allowed
redirect/site URLs (Authentication → URL Configuration) so email sign-in works there.

## Project structure

```
mosaik/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx         # space switcher + folders/views nav, mobile drawer
│   │   ├── Auth.tsx            # email sign-in
│   │   ├── ChangePassword.tsx  # account password change
│   │   ├── PromptCard.tsx      # a prompt card (use/copy, duplicate, edit, delete, star)
│   │   ├── PromptEditor.tsx    # create / edit a prompt
│   │   ├── VariableFiller.tsx  # fill {{variables}} with a live preview, then copy
│   │   ├── LandingSpace.tsx    # design-inspiration swipe file with live previews
│   │   ├── UiSpace.tsx         # reusable UI elements (image + code + source)
│   │   ├── TweetSpace.tsx      # saved X posts as live embeds
│   │   ├── ImageDropzone.tsx   # drag-drop / paste / upload image input
│   │   └── Toast.tsx           # lightweight toast notifications
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   ├── db.ts               # data access for every space + image storage
│   │   ├── template.ts         # {{variable}} extraction + rendering
│   │   └── preview.ts          # link metadata / preview fetching
│   ├── App.tsx                 # app shell: auth, prompts space, theme, shortcuts
│   ├── storage.ts              # localStorage load/save, seed, normalize, import
│   ├── types.ts                # shared types + view constants
│   ├── main.tsx                # React entry point
│   └── styles.css              # all styling + theming
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```
