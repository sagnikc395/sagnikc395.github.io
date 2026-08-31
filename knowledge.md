# knowledge.md

## Project

Personal website + blog for Sagnik Chatterjee (`sagnikc395.github.io`), deployed to GitHub Pages.
React 19 SPA (Vite 6, TypeScript, Tailwind CSS v4) with custom build-time Markdown rendering and HTML prerendering for SEO.

## Commands

- Install: `npm install` (uses package-lock.json / npm)
- Dev: `npm run dev` (vite dev)
- Build: `npm run build` (vite build; output in `dist/`)
- Lint: `npm run lint` (prettier --check . && eslint .)
- Format: `npm run format` (prettier --write .)
- Content check: `npm run check:reading-list` (assert-based test for reading list parser — the project's de-facto test suite; no test framework installed)
- Typecheck: no dedicated script; use `npx tsc --noEmit`

## Architecture

- `src/main.tsx` → `src/App.tsx`: BrowserRouter + Routes. Home is eager; Blog/Projects/ReadingList/ProjectPage are React.lazy and prefetched on idle (`src/lib/idle.ts`).
- Routes: `/` Home, `/projects`, `/project/:slug`, `/blog`, `/blog/:slug`, `/reading-list`, `*` 404.
- `vite.config.ts` is the heart of the build:
  - `markdown()` plugin: compiles `src/posts/*.md` and `src/projects/*.md` (YAML frontmatter via js-yaml) to HTML via marked + Shiki (vitesse-light/dark). Import modifiers: `?raw` (raw source), `?meta` (frontmatter + excerpt only, max ~55 words, computed by `excerptOf`).
  - `prerender()` plugin (closeBundle): writes static `index.html` copies for `/blog`, `/projects`, `/reading-list` (SPA fallback so GitHub Pages returns 200) and fully prerendered HTML for each blog post (`/blog/<slug>`, skips `draft: true`) and project (`/project/<slug>`).
  - Path aliases: `$lib` → `/src/lib`, `$posts` → `/src/posts`, `$projects` → `/src/projects`.
  - Build tuning: esnext target, manualChunks vendor bundle (react/react-dom/react-router-dom), console/debugger dropped, `publicDir: "static"`.
- Content lives as Markdown:
  - `src/posts/*.md` — blog posts (frontmatter: title, date, draft, references[])
  - `src/projects/*.md` — project pages
  - `reading/READING_LIST.md` — reading list (dated bullets, optional `[x]` checkboxes); moved from legacy root `READING_LIST.md` (script asserts legacy file must NOT exist)
- `src/lib/readingList.ts` — pure parser (`parseReadingList`, `groupReadingMonths`); validated by `scripts/check-reading-list.ts` (node:assert). UI checkbox state overrides file defaults via localStorage.
- Styling: Tailwind v4 via `@tailwindcss/vite` + `@tailwindcss/typography`; all custom component styles in `src/app.css` using `@apply` (`.link`, `.layout-md`, `.md-output`, `.umaring-*`). Dark theme is default (stone palette); Shiki forced to dark via CSS vars.

## Conventions & gotchas

- Formatting: Prettier (no semicolons, double quotes) + eslint (typescript-eslint, prettier-config). Run `npm run lint` before committing.
- Content files must keep valid YAML frontmatter with `---` delimiters; unclosed frontmatter throws at build time.
- Dates in content are UTC ISO (`YYYY-MM-DD`); reading-list parser rejects invalid calendar dates (e.g. 2026-02-31).
- If you rename/move `reading/READING_LIST.md`, update `scripts/check-reading-list.ts` — it asserts the file exists at that path and the legacy root file does not.
- Prerendered post/project pages hardcode stone-palette classes; changing theme classes in `vite.config.ts` prerender templates must stay in sync with `src/app.css`.
- `static/` is Vite's publicDir (copied verbatim to dist); `dist/` is build output (gitignored).
- Deployed via GitHub Pages (user site, repo name = domain); `vercel.json` present but Pages is the deploy target.
- No unit-test framework; the only automated check is `npm run check:reading-list`.

# Agent Configuration
- Import skills from: ./.agents/skills/SKILL.md
