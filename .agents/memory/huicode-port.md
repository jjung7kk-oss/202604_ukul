---
name: 후이코드 Vercel port decisions
description: Key decisions made when porting the 후이코드 ukulele chord app from Vercel to Replit.
---

# 후이코드 Vercel port

## What was ported
A Vite + React + Express app (NOT Next.js) — no framework conversion needed. The original already used react-router-dom and Vite.

## Prisma → Drizzle
Replaced Prisma (original) with Drizzle ORM (workspace standard).
- Schema: `lib/db/src/schema/chord.ts` (chordsTable, chordShapesTable) and `lib/db/src/schema/score.ts` (scoresTable, scoreVersesTable)
- Relations defined with `drizzle-orm/relations` so `db.query` with `with:` works
- Tables: `chords`, `chord_shapes`, `scores`, `score_verses`

## Auth design
- Admin auth uses HMAC-SHA256 signed session tokens (7-day TTL)
- Secrets required at startup: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`
- Fails fast (throws at module load) if any are missing — intentional, secure-by-default
- No insecure fallback values; the server will not start without all three secrets set

**Why:** Code reviewer required fail-fast behavior rather than insecure defaults.

## Frontend
- Copied directly from `.migration-backup/src/` via `fullstack-copy-frontend.sh`
- Uses react-router-dom (not wouter), custom CSS (not Tailwind) — scaffold CSS was fully replaced
- No @workspace/api-client-react hooks used; original raw fetch clients preserved
