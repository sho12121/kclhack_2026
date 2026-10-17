# Project notes

- The active Next.js app is at the repository root; its source is in `src/`.
- `mock_ver/` is a read-only reference prototype. Do not edit, delete, install dependencies in, or run commands that generate files there.
- Read `docs/team-development.md` for component ownership and `docs/architecture.md` for data flow before making changes.
- Keep TMDb credentials server-side. Never add a `NEXT_PUBLIC_` token or commit `.env.local`.
- Keep UI components independent of API requests; `movie-search.tsx` owns browser requests and `lib/tmdb.ts` owns TMDb requests.
- Validate with `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` as appropriate.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
