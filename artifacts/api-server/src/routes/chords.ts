import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import {
  getChordLibrary,
  getChordDetail,
  replaceChordShapes,
  getChordTypes,
  createChordType,
} from "../lib/chordService.js";
import { getBearerToken, verifySessionToken } from "../lib/adminAuth.js";

const router: IRouter = Router();

function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = getBearerToken(req.headers.authorization);
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// ── 코드 타입 ───────────────────────────────────────────────────────────────

/** 전체 코드 타입 목록 (공개) */
router.get("/chord-types", async (_req, res) => {
  try {
    const types = await getChordTypes();
    res.json(types);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load chord types" });
  }
});

/** 새 코드 타입 등록 (관리자 전용) */
router.post("/chord-types", requireAdminAuth, async (req, res) => {
  const body = req.body as {
    key?: string;
    label?: string;
    orderIndex?: number;
    aliases?: string[];
  };

  const key = (body.key ?? "").trim();
  if (!key) {
    res.status(400).json({ error: "key 필드가 필요합니다." });
    return;
  }
  if (!/^[^\s,;]{1,32}$/.test(key)) {
    res.status(400).json({ error: "key는 공백/쉼표/세미콜론 없이 32자 이하여야 합니다." });
    return;
  }

  const label = (body.label ?? key).trim();
  const orderIndex = typeof body.orderIndex === "number" ? body.orderIndex : 999;
  const aliases = Array.isArray(body.aliases)
    ? body.aliases.map((a) => String(a).trim()).filter(Boolean)
    : [];

  try {
    const created = await createChordType(key, label, orderIndex, aliases);
    res.status(201).json(created);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint")) {
      res.status(409).json({ error: `'${key}' 코드 타입이 이미 존재합니다.` });
    } else {
      console.error(e);
      res.status(500).json({ error: "저장에 실패했습니다." });
    }
  }
});

// ── 코드 운지 ───────────────────────────────────────────────────────────────

router.get("/chords/library", async (_req, res) => {
  try {
    const library = await getChordLibrary();
    res.json(library);
  } catch (e) {
    console.error(e);
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
    const detail = await getChordDetail(root, type);
    res.json(detail);
  } catch (e) {
    console.error(e);
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
    await replaceChordShapes(root, type, shapes);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save" });
  }
});

export default router;
