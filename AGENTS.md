# Agents

## Agent skills

### Issue tracker

GitHub Issues in this repo. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.

- Read `PROJECT_STATUS.md` and `MEMORY.md` before editing.
- Query graphify before a broad file search, once `.planning/graphs/graph.json` exists.
- Keep the theme in `DESIGN.md`. Change it only when the user asks.
- Prefer the free stack recorded in `MEMORY.md`.
- Docs: `PRD.md`, `docs/RUNBOOK.md`, `docs/ARCHITECTURE.md`, `SECURITY.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
