import { Router, type IRouter } from "express";
import { saveScore, listScoresByUser, ScoreServiceError } from "../lib/scoreService.js";
import { formatScoreDbError } from "../lib/scoreDbError.js";
import { getBearerToken, getSessionUserId } from "../lib/adminAuth.js";

const router: IRouter = Router();

function requireUserId(
  req: { headers: { authorization?: string | string[] } },
  res: { status: (n: number) => { json: (d: unknown) => void } },
): string | null {
  const token = getBearerToken(req.headers.authorization);
  const userId = getSessionUserId(token);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

router.get("/scores", async (req, res) => {
  const userId = requireUserId(req, res as Parameters<typeof requireUserId>[1]);
  if (!userId) return;
  try {
    const scores = await listScoresByUser(userId);
    res.json({
      scores: scores.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        sharedChordText: s.sharedChordText,
        notation: s.notation,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        verses: s.verses.map((v) => ({
          id: v.id,
          orderIndex: v.orderIndex,
          label: v.label,
          lyrics: v.lyrics,
        })),
      })),
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
  const rawVerses = Array.isArray(body.verses)
    ? (body.verses as { label?: unknown; lyrics?: unknown }[])
    : [];
  const verses = rawVerses.slice(0, 4).map((v, i) => ({
    label: typeof v.label === "string" && v.label.trim() ? v.label.trim() : `${i + 1}절`,
    lyrics: typeof v.lyrics === "string" ? v.lyrics : "",
  }));

  try {
    const score = await saveScore({
      scoreId,
      userId,
      title,
      artist,
      sharedChordText,
      notation: body.notation,
      verses,
    });
    res.json({
      score: {
        id: score.id,
        title: score.title,
        artist: score.artist,
        sharedChordText: score.sharedChordText,
        notation: score.notation,
        createdAt: score.createdAt.toISOString(),
        updatedAt: score.updatedAt.toISOString(),
        verses: score.verses.map((v) => ({
          id: v.id,
          orderIndex: v.orderIndex,
          label: v.label,
          lyrics: v.lyrics,
        })),
      },
    });
  } catch (e) {
    if (e instanceof ScoreServiceError) {
      const status = e.code === "BAD_REQUEST" ? 400 : e.code === "NOT_FOUND" ? 404 : 403;
      res.status(status).json({ error: e.message });
      return;
    }
    res.status(500).json({ error: formatScoreDbError(e) });
  }
});

export default router;
