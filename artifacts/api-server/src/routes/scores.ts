import { Router, type IRouter } from "express";
import { eq, desc, asc } from "drizzle-orm";
import { db, scoresTable, scoreVersesTable } from "@workspace/db";
import { getBearerToken, getSessionUserId } from "../lib/adminAuth";

const router: IRouter = Router();

const NOTATION_JSON_MAX_BYTES = 120_000;

class ScoreServiceError extends Error {
  code: "BAD_REQUEST" | "NOT_FOUND" | "FORBIDDEN";
  constructor(code: "BAD_REQUEST" | "NOT_FOUND" | "FORBIDDEN", message: string) {
    super(message);
    this.code = code;
  }
}

function requireUserId(req: { headers: { authorization?: string | string[] } }, res: { status: (n: number) => { json: (d: unknown) => void } }): string | null {
  const token = getBearerToken(req.headers.authorization);
  const userId = getSessionUserId(token);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

function notationToDb(raw: unknown): unknown {
  if (raw == null) return {};
  let value: unknown = raw;
  if (typeof raw === "string") {
    try { value = JSON.parse(raw) as unknown; }
    catch { throw new ScoreServiceError("BAD_REQUEST", "악보 기호(JSON) 형식이 올바르지 않습니다."); }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ScoreServiceError("BAD_REQUEST", "악보 기호는 JSON 객체여야 합니다.");
  }
  let encoded: string;
  try { encoded = JSON.stringify(value); }
  catch { throw new ScoreServiceError("BAD_REQUEST", "악보 기호를 직렬화할 수 없습니다."); }
  if (encoded.length > NOTATION_JSON_MAX_BYTES) {
    throw new ScoreServiceError("BAD_REQUEST", "악보 기호 데이터가 너무 큽니다.");
  }
  return value;
}

function normalizeVerses(verses: { label?: unknown; lyrics?: unknown }[]): { label: string; lyrics: string }[] {
  return verses.slice(0, 4).map((verse, index) => ({
    label: typeof verse.label === "string" && verse.label.trim() ? verse.label.trim() : `${index + 1}절`,
    lyrics: typeof verse.lyrics === "string" ? verse.lyrics : "",
  }));
}

function shapeScore(
  score: typeof scoresTable.$inferSelect,
  verses: (typeof scoreVersesTable.$inferSelect)[],
) {
  return {
    id: score.id,
    title: score.title,
    artist: score.artist,
    sharedChordText: score.sharedChordText,
    notation: score.notation,
    createdAt: score.createdAt.toISOString(),
    updatedAt: score.updatedAt.toISOString(),
    verses: [...verses]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((v) => ({ id: v.id, orderIndex: v.orderIndex, label: v.label, lyrics: v.lyrics })),
  };
}

router.get("/scores", async (req, res) => {
  const userId = requireUserId(req, res as Parameters<typeof requireUserId>[1]);
  if (!userId) return;
  try {
    const scores = await db.query.scoresTable.findMany({
      where: eq(scoresTable.userId, userId),
      orderBy: desc(scoresTable.updatedAt),
      with: { verses: { orderBy: asc(scoreVersesTable.orderIndex) } },
    });
    res.json({
      scores: scores.map((s) => shapeScore(s, s.verses)),
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to load scores" });
  }
});

router.post("/scores", async (req, res) => {
  const userId = requireUserId(req, res as Parameters<typeof requireUserId>[1]);
  if (!userId) return;

  const body = req.body as {
    scoreId?: unknown;
    title?: unknown;
    artist?: unknown;
    sharedChordText?: unknown;
    notation?: unknown;
    verses?: unknown;
  };

  const rawScoreId = body.scoreId;
  const scoreId =
    typeof rawScoreId === "string" && rawScoreId.trim().length > 0
      ? rawScoreId.trim()
      : undefined;
  const title = (typeof body.title === "string" ? body.title : "").trim();
  if (!title) {
    res.status(400).json({ error: "제목을 입력해 주세요." });
    return;
  }
  const artist = typeof body.artist === "string" ? body.artist.trim() : "";
  const sharedChordText = typeof body.sharedChordText === "string" ? body.sharedChordText : "";
  const rawVerses = Array.isArray(body.verses) ? body.verses as { label?: unknown; lyrics?: unknown }[] : [];
  const normalizedVerses = normalizeVerses(rawVerses);
  if (normalizedVerses.length === 0) {
    res.status(400).json({ error: "최소 1개의 절이 필요합니다." });
    return;
  }

  let notationValue: unknown;
  try {
    notationValue = body.notation !== undefined ? notationToDb(body.notation) : undefined;
  } catch (e) {
    if (e instanceof ScoreServiceError) {
      res.status(400).json({ error: e.message });
      return;
    }
    res.status(500).json({ error: "Failed to process notation" });
    return;
  }

  try {
    if (scoreId) {
      // update existing
      const existing = await db.query.scoresTable.findFirst({
        where: eq(scoresTable.id, scoreId),
        columns: { id: true, userId: true },
      });
      if (!existing) {
        res.status(404).json({ error: "악보를 찾을 수 없습니다." });
        return;
      }
      if (existing.userId !== userId) {
        res.status(403).json({ error: "다른 사용자의 악보입니다." });
        return;
      }
      const updated = await db.transaction(async (tx) => {
        await tx.update(scoresTable)
          .set({
            title,
            artist,
            sharedChordText,
            ...(notationValue !== undefined ? { notation: notationValue } : {}),
          })
          .where(eq(scoresTable.id, scoreId));
        await tx.delete(scoreVersesTable).where(eq(scoreVersesTable.scoreId, scoreId));
        if (normalizedVerses.length > 0) {
          await tx.insert(scoreVersesTable).values(
            normalizedVerses.map((v, i) => ({
              scoreId,
              orderIndex: i,
              label: v.label,
              lyrics: v.lyrics,
            })),
          );
        }
        const score = await tx.query.scoresTable.findFirst({
          where: eq(scoresTable.id, scoreId),
          with: { verses: { orderBy: asc(scoreVersesTable.orderIndex) } },
        });
        return score!;
      });
      res.json({ score: shapeScore(updated, updated.verses) });
    } else {
      // create
      const created = await db.transaction(async (tx) => {
        const [score] = await tx.insert(scoresTable).values({
          userId,
          title,
          artist,
          sharedChordText,
          notation: notationValue ?? {},
        }).returning();
        if (normalizedVerses.length > 0) {
          await tx.insert(scoreVersesTable).values(
            normalizedVerses.map((v, i) => ({
              scoreId: score!.id,
              orderIndex: i,
              label: v.label,
              lyrics: v.lyrics,
            })),
          );
        }
        const verses = await tx.query.scoreVersesTable.findMany({
          where: eq(scoreVersesTable.scoreId, score!.id),
          orderBy: asc(scoreVersesTable.orderIndex),
        });
        return { ...score!, verses };
      });
      res.json({ score: shapeScore(created, created.verses) });
    }
  } catch (e) {
    if (e instanceof ScoreServiceError) {
      const status = e.code === "BAD_REQUEST" ? 400 : e.code === "NOT_FOUND" ? 404 : 403;
      res.status(status).json({ error: e.message });
      return;
    }
    res.status(500).json({ error: "Failed to save score" });
  }
});

export default router;
