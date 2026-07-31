import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, chordsTable, chordShapesTable } from "@workspace/db";
import { getBearerToken, verifySessionToken } from "../lib/adminAuth";

const router: IRouter = Router();

const CANONICAL_ROOTS = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

const QUALITIES = [
  "major", "m", "7", "m7", "maj7", "sus4", "sus2", "dim", "aug",
  "6", "m6", "add9", "9",
] as const;

type CanonicalRoot = (typeof CANONICAL_ROOTS)[number];
type Quality = (typeof QUALITIES)[number];

function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = getBearerToken(req.headers.authorization);
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function emptyLibrary() {
  const lib: Record<string, Record<string, { shapes: { frets: [number, number, number, number] }[] }>> = {};
  for (const r of CANONICAL_ROOTS) {
    lib[r] = {};
    for (const q of QUALITIES) {
      lib[r]![q] = { shapes: [] };
    }
  }
  return lib;
}

router.get("/chords/library", async (_req, res) => {
  try {
    const chords = await db.query.chordsTable.findMany({
      with: { shapes: { orderBy: asc(chordShapesTable.orderIndex) } },
    });
    const library = emptyLibrary();
    for (const chord of chords) {
      const root = chord.root as CanonicalRoot;
      const type = chord.type as Quality;
      if (!(root in library)) continue;
      library[root]![type] = {
        shapes: chord.shapes.map((s) => ({
          frets: [s.g, s.c, s.e, s.a] as [number, number, number, number],
        })),
      };
    }
    res.json(library);
  } catch (e) {
    res.status(500).json({ error: "Failed to load chord library" });
  }
});

router.get("/chords/detail", requireAdminAuth, async (req, res) => {
  const root = String(req.query["root"] ?? "");
  const type = String(req.query["type"] ?? "");
  if (!root || !type) {
    res.status(400).json({ error: "root and type query params required" });
    return;
  }
  try {
    const chord = await db.query.chordsTable.findFirst({
      where: and(eq(chordsTable.root, root), eq(chordsTable.type, type)),
      with: { shapes: { orderBy: asc(chordShapesTable.orderIndex) } },
    });
    if (!chord) {
      res.json({ shapes: [] });
      return;
    }
    res.json({
      shapes: chord.shapes.map((s) => ({
        frets: [s.g, s.c, s.e, s.a] as [number, number, number, number],
      })),
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to load chord" });
  }
});

router.put("/chords/detail", requireAdminAuth, async (req, res) => {
  const body = req.body as {
    root?: string;
    type?: string;
    shapes?: { frets: [number, number, number, number] }[];
  };
  const root = body.root;
  const type = body.type;
  const shapes = body.shapes;
  if (!root || !type || !Array.isArray(shapes)) {
    res.status(400).json({ error: "root, type, shapes[] required" });
    return;
  }
  if (shapes.length > 4) {
    res.status(400).json({ error: "At most 4 shapes" });
    return;
  }
  for (const s of shapes) {
    if (
      !s?.frets ||
      s.frets.length !== 4 ||
      s.frets.some((n) => typeof n !== "number" || n < 0 || n > 15)
    ) {
      res.status(400).json({ error: "Invalid frets in shapes" });
      return;
    }
  }
  try {
    await db.transaction(async (tx) => {
      // upsert chord
      const existing = await tx.query.chordsTable.findFirst({
        where: and(eq(chordsTable.root, root), eq(chordsTable.type, type)),
      });
      let chordId: string;
      if (existing) {
        chordId = existing.id;
      } else {
        const inserted = await tx.insert(chordsTable).values({ root, type }).returning({ id: chordsTable.id });
        chordId = inserted[0]!.id;
      }
      // replace shapes
      await tx.delete(chordShapesTable).where(eq(chordShapesTable.chordId, chordId));
      if (shapes.length > 0) {
        await tx.insert(chordShapesTable).values(
          shapes.map((s, i) => ({
            chordId,
            orderIndex: i,
            g: s.frets[0],
            c: s.frets[1],
            e: s.frets[2],
            a: s.frets[3],
          })),
        );
      }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save" });
  }
});

export default router;
