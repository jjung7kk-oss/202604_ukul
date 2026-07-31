---
name: 후이코드 Vercel port decisions
description: Key decisions made when porting the 후이코드 ukulele chord app from Vercel to Replit.
---

# 후이코드 Vercel port

## What was ported
A Vite + React + Express app (NOT Next.js) — no framework conversion needed. The original already used react-router-dom and Vite.

## Database: Prisma + Supabase (NOT Drizzle/Replit DB)
The app uses the original Prisma + Supabase PostgreSQL setup.
- `DATABASE_URL` Replit Secret = existing Supabase connection string
- Schema lives in `artifacts/api-server/prisma/schema.prisma`
- Prisma client is generated during `pnpm run generate` (runs before build on every `dev` start)
- **Never run migrate/push/seed against the Supabase DB from Replit** — it is the live production DB

**Why:** User explicitly wants Replit to be a dev/editing environment only; production data lives in Supabase.

## Early mistake: Drizzle was added, then removed
During initial porting, Drizzle ORM + Replit PostgreSQL was used (lib/db/). This was reverted:
- `lib/db/` still exists in workspace but is unused
- `artifacts/api-server` no longer depends on `@workspace/db` or `drizzle-orm`
- All routes now use Prisma service layer (`src/lib/chordService.ts`, `scoreService.ts`, `scoreDbError.ts`, `db.ts`)

## Auth design
- Admin auth uses HMAC-SHA256 signed session tokens (7-day TTL)
- Secrets required at startup: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`
- Fails fast (throws at module load) if any are missing — intentional, secure-by-default
- No insecure fallback values; the server will not start without all three secrets set

## API server dev script
`dev` = `generate && build && start` — Prisma client is always regenerated before esbuild runs.
`@prisma/client` is externalized in esbuild so the generated client is loaded at runtime from node_modules.

## Frontend
- Copied directly from `.migration-backup/src/` via `fullstack-copy-frontend.sh`
- Uses react-router-dom (not wouter), custom CSS (not Tailwind) — scaffold CSS was fully replaced
- No @workspace/api-client-react hooks used; original raw fetch clients preserved
