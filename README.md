# Språket Web (W2 / PWA-first)

TypeScript core + React web monorepo for learning Bokmål Norwegian. Mobile viewport first, installable PWA with offline shell basics.

**SwiftUI iOS app** (`../spraket-ios`) is **reference-only** — do not feature-develop it. Pedagogy and content packs were ported from there.

**Later path:** mature on web → React Native / Expo sharing `@spraket/core`.

## Layout

```
spraket-web/
  packages/core/     Pure TS: content, answer eval, path, EMA/skills, placement, SRS
  apps/web/          Vite + React PWA (onboarding, path, player, practice/review, progress)
  scripts/           Worktree bootstrap + deploy helpers
  vercel.json        Vercel build + SPA rewrites
  wrangler.toml      Cloudflare Pages output dir
```

## Prerequisites

- **Node.js 20+** (`node -v`) — also pinned in `.node-version`
- **pnpm 9** — pinned via `packageManager` in root `package.json`
- **GitHub remote** — required for the dashboard “connect repo” deploy path (this repo may start with no `origin`)

Enable pnpm with Corepack (recommended):

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

Or: `npm install -g pnpm@9`

## Install (recommended everywhere)

```bash
cd /cursor/stores/self/artifacts/spraket-web   # or your clone path
pnpm run bootstrap
pnpm test
pnpm build
pnpm dev
```

`pnpm run bootstrap` is the supported install entrypoint:

| Where the repo lives | What bootstrap does |
|----------------------|---------------------|
| **Cursor Project store** (`/cursor/stores/...`, `fuse.agent-store`) | Syncs sources → `~/.cache/spraket-web` (override with `SPRAKET_WORK_ROOT`) and runs `pnpm install` there |
| **Normal disk** (macOS / Linux home, `/tmp`, etc.) | Runs `pnpm install` in place |

**Why not bare `pnpm install` on the Agent Store?** That FUSE volume cannot host `node_modules`: symlinks return `EPERM`, and installs fail with `ENOSYS` / `EAGAIN` on rename/copy. This is an environment limit, not a bad lockfile. On a normal clone, `pnpm install` alone is fine.

After bootstrap from the store path, `pnpm test` / `pnpm build` / `pnpm dev` re-sync store edits into the worktree and run there. Inspect with `pnpm run doctor`.

Optional: `npm install` works on a normal disk (npm `workspaces` are declared); pnpm remains the default.

## Run web

```bash
pnpm dev
```

Open the printed local URL (default `http://localhost:5173`). Use a narrow viewport or device toolbar — UI is mobile-first.

Production build:

```bash
pnpm build
pnpm --filter @spraket/web preview
```

(`pnpm --filter …` only applies inside the worktree / a normal clone after install. From the store path prefer `pnpm build` / `pnpm dev`.)

## Run tests

```bash
pnpm test
```

## Deploy (free static hosting)

Publish `apps/web/dist` as a static SPA. No paid services; no app secrets required for the dashboard path.

### Dashboard build settings (both hosts)

Use these when connecting the GitHub repo in the Cloudflare Pages or Vercel UI:

| Setting | Value |
|---------|--------|
| **Root directory** | repository root (leave empty / `/`) |
| **Install command** | `pnpm install` (auto if lockfile detected) |
| **Build command** | `pnpm --filter @spraket/web build` |
| **Output directory** | `apps/web/dist` |
| **Node version** | `20` |

Configs in-repo: `vercel.json`, `wrangler.toml`, SPA fallback via `apps/web/public/_redirects` (Cloudflare) and Vercel `rewrites`.

### SPA gotchas

- Client routes (`/path`, `/lesson/...`, …) need a fallback to `index.html`. Without `_redirects` / Vercel rewrites, refresh on a deep link 404s.
- Do **not** set the Pages/Vercel root directory to `apps/web` — the monorepo build needs the repo root so `@spraket/core` and content JSON resolve.
- Progress is **localStorage-only** — each browser/device has its own progress; there is no cloud sync.

### Norwegian TTS caveat (share with friends)

Listen / dictation items use the browser’s `speechSynthesis` with `nb-NO`. Friends need a **Norwegian system voice** installed or Play audio may be silent. On macOS: System Settings → Accessibility → Spoken Content → ⓘ next to System Voice → download **Norwegian / Norsk Bokmål**. Real bundled MP3s are still a later improvement.

### A) Connect GitHub in the dashboard (recommended)

**Note:** Cursor’s GitHub account link does **not** give Cloud Agents a `gh`/`git` token. Push/deploy from an agent needs `gh auth login` (device flow) or a `GH_TOKEN` / PAT with `repo` scope in the environment.

This repo may have **no git remote** until the first push. After GitHub auth:

```bash
cd /cursor/stores/self/artifacts/spraket-web
gh repo create spraket-web --public --source=. --remote=origin --push
# or manually:
# git remote add origin git@github.com:<YOU>/spraket-web.git
# git push -u origin main
```

**Cloudflare Pages (free):** [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect to Git → select `spraket-web` → use the build settings table above → Save and Deploy. Share the `*.pages.dev` URL.

**Vercel (free Hobby):** [vercel.com/new](https://vercel.com/new) → Import the GitHub repo → confirm settings from `vercel.json` / table above → Deploy. Share the `*.vercel.app` URL.

GitHub Actions CI (`.github/workflows/ci.yml`) runs install/test/build on push; hosting still comes from the Pages/Vercel Git integration (no deploy tokens required).

### B) One-command CLI deploy

After a normal-disk bootstrap (or from the store path after `pnpm run bootstrap`):

```bash
# once per machine
pnpm dlx wrangler@4 login          # Cloudflare
# or
pnpm dlx vercel@39 login           # Vercel

pnpm run deploy                    # Cloudflare Pages (default)
pnpm run deploy:cloudflare         # same
pnpm run deploy:vercel             # Vercel production
```

Optional: `SPRAKET_CF_PROJECT=my-name pnpm run deploy:cloudflare` (default project name `spraket`).

## Content

Eight Bokmål unit packs (A1→B1) live in `packages/core/content/`, copied from the iOS JSON schema:

| Pack | Unit theme |
|------|------------|
| a1-greetings | Greetings & introductions |
| a1-numbers | Numbers & time |
| a1-food | Food & café |
| a2-daily | Daily routines |
| a2-shopping | Shopping |
| a2-travel | Travel |
| b1-opinions | Opinions & reasons |
| b1-work | Workplace messages |

Each unit: 3 lessons + checkpoint. Exercise kinds: translate, listenChoose, readAnswer, fillBlank, matchPairs, orderWords, dictation.

## Stubbed / deferred

- Speak & compare (ASR)
- Human / bundled lesson audio (browser TTS `nb-NO` fallback for listen/dictation)
- Cloud sync / accounts
- Full B2–C2 depth / timed Norskprøven mocks
- Expo / React Native app (future consumer of `@spraket/core`)

## Architecture note

See `/cursor/stores/self/docs/project-context.md` for the W2 stack decision and SwiftUI freeze.
