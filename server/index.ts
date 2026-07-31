import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import {
  getBearerToken,
  getSessionUserId,
  signSessionToken,
  verifyCredentials,
  verifySessionToken,
} from '../shared/adminAuth'
import {
  getChordDetail,
  getChordLibrary,
  getChordTypes,
  createChordType,
  replaceChordShapes,
  seedChordTypesIfEmpty,
} from '../shared/chordService'
import { formatScoreDbError } from '../shared/scoreDbError'
import {
  saveScore,
  listScoresByUser,
  deleteScore,
  ScoreServiceError,
} from '../shared/scoreService'

function logRouteError(route: string, e: unknown): void {
  if (e instanceof Error) { console.error(`[${route}]`, e.message, e.stack); return }
  console.error(`[${route}]`, e)
}

const app = express()
const PORT = Number(process.env.PORT) || 4000

app.use(cors({ origin: '*', allowedHeaders: ['Content-Type', 'Authorization'] }))
app.use(express.json())

function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const token = getBearerToken(req.headers.authorization)
  if (!verifySessionToken(token)) { res.status(401).json({ error: 'Unauthorized' }); return }
  next()
}

function requireAdminUserId(req: express.Request, res: express.Response): string | null {
  const token = getBearerToken(req.headers.authorization)
  const userId = getSessionUserId(token)
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return null }
  return userId
}

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => { res.json({ ok: true }) })

// ── Auth ────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const body = req.body as { username?: string; password?: string }
  if (typeof body.username !== 'string' || typeof body.password !== 'string') {
    res.status(400).json({ error: 'username and password required' }); return
  }
  if (!verifyCredentials(body.username, body.password)) {
    res.status(401).json({ error: 'Invalid credentials' }); return
  }
  res.json({ token: signSessionToken() })
})

// ── Chord types ─────────────────────────────────────────────────────────────
app.get('/api/chord-types', async (_req, res) => {
  try {
    const types = await getChordTypes()
    res.json(types)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load chord types' }) }
})

app.post('/api/chord-types', requireAdminAuth, async (req, res) => {
  const body = req.body as { key?: string; label?: string; orderIndex?: number; aliases?: string[] }
  const key = (body.key ?? '').trim()
  if (!key) { res.status(400).json({ error: 'key 필드가 필요합니다.' }); return }
  if (!/^[^\s,;]{1,32}$/.test(key)) {
    res.status(400).json({ error: 'key는 공백/쉼표/세미콜론 없이 32자 이하여야 합니다.' }); return
  }
  const label = (body.label ?? key).trim()
  const orderIndex = typeof body.orderIndex === 'number' ? body.orderIndex : 999
  const aliases = Array.isArray(body.aliases) ? body.aliases.map((a) => String(a).trim()).filter(Boolean) : []
  try {
    const created = await createChordType(key, label, orderIndex, aliases)
    res.status(201).json(created)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('Unique constraint')) { res.status(409).json({ error: `'${key}' 코드 타입이 이미 존재합니다.` }) }
    else { console.error(e); res.status(500).json({ error: '저장에 실패했습니다.' }) }
  }
})

// ── Chords ──────────────────────────────────────────────────────────────────
app.get('/api/chords/library', async (_req, res) => {
  try { res.json(await getChordLibrary()) }
  catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load chord library' }) }
})

app.get('/api/chords/detail', requireAdminAuth, async (req, res) => {
  const root = String(req.query.root ?? ''); const type = String(req.query.type ?? '')
  if (!root || !type) { res.status(400).json({ error: 'root and type query params required' }); return }
  try { res.json(await getChordDetail(root, type)) }
  catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load chord' }) }
})

app.put('/api/chords/detail', requireAdminAuth, async (req, res) => {
  const body = req.body as { root?: string; type?: string; shapes?: { frets: [number, number, number, number] }[] }
  const { root, type, shapes } = body
  if (!root || !type || !Array.isArray(shapes)) { res.status(400).json({ error: 'root, type, shapes[] required' }); return }
  if (shapes.length > 4) { res.status(400).json({ error: 'At most 4 shapes' }); return }
  for (const s of shapes) {
    if (!s?.frets || s.frets.length !== 4 || s.frets.some((n) => typeof n !== 'number' || n < 0 || n > 15)) {
      res.status(400).json({ error: 'Invalid frets in shapes' }); return
    }
  }
  try { await replaceChordShapes(root, type, shapes); res.json({ ok: true }) }
  catch (e) { console.error(e); res.status(500).json({ error: 'Failed to save' }) }
})

// ── Scores ──────────────────────────────────────────────────────────────────
app.get('/api/scores', async (req, res) => {
  const userId = requireAdminUserId(req, res)
  if (!userId) return
  try {
    const scores = await listScoresByUser(userId)
    res.json({
      scores: scores.map((s) => ({
        id: s.id, title: s.title, artist: s.artist, sharedChordText: s.sharedChordText,
        notation: s.notation, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString(),
        verses: s.verses.map((v) => ({ id: v.id, orderIndex: v.orderIndex, label: v.label, lyrics: v.lyrics })),
      })),
    })
  } catch (e) { logRouteError('GET /api/scores', e); res.status(500).json({ error: formatScoreDbError(e) }) }
})

app.post('/api/scores', async (req, res) => {
  const userId = requireAdminUserId(req, res)
  if (!userId) return
  const body = req.body as { scoreId?: unknown; title?: unknown; artist?: unknown; sharedChordText?: unknown; notation?: unknown; verses?: unknown }
  const scoreId = typeof body.scoreId === 'string' && body.scoreId.trim() ? body.scoreId.trim() : undefined
  const title = typeof body.title === 'string' ? body.title : ''
  const artist = typeof body.artist === 'string' ? body.artist : ''
  const sharedChordText = typeof body.sharedChordText === 'string' ? body.sharedChordText : ''
  const verses = Array.isArray(body.verses)
    ? body.verses.map((v, i) => {
        if (!v || typeof v !== 'object') return null
        const vv = v as { label?: unknown; lyrics?: unknown }
        return { label: typeof vv.label === 'string' ? vv.label : `${i + 1}절`, lyrics: typeof vv.lyrics === 'string' ? vv.lyrics : '' }
      }).filter((v): v is { label: string; lyrics: string } => v != null)
    : []
  try {
    const score = await saveScore({ scoreId, userId, title, artist, sharedChordText, notation: body.notation, verses })
    res.json({
      score: {
        id: score.id, title: score.title, artist: score.artist, sharedChordText: score.sharedChordText,
        notation: score.notation, createdAt: score.createdAt.toISOString(), updatedAt: score.updatedAt.toISOString(),
        verses: score.verses.map((v) => ({ id: v.id, orderIndex: v.orderIndex, label: v.label, lyrics: v.lyrics })),
      },
    })
  } catch (e) {
    if (e instanceof ScoreServiceError) {
      if (e.code === 'BAD_REQUEST') { res.status(400).json({ error: e.message }); return }
      if (e.code === 'NOT_FOUND') { res.status(404).json({ error: e.message }); return }
      if (e.code === 'FORBIDDEN') { res.status(403).json({ error: e.message }); return }
    }
    logRouteError('POST /api/scores', e); res.status(500).json({ error: formatScoreDbError(e) })
  }
})

app.delete('/api/scores/:id', async (req, res) => {
  const userId = requireAdminUserId(req, res)
  if (!userId) return
  const scoreId = req.params.id
  try {
    await deleteScore(scoreId, userId)
    res.json({ ok: true })
  } catch (e) {
    if (e instanceof ScoreServiceError) {
      if (e.code === 'NOT_FOUND') { res.status(404).json({ error: e.message }); return }
      if (e.code === 'FORBIDDEN') { res.status(403).json({ error: e.message }); return }
    }
    logRouteError('DELETE /api/scores/:id', e); res.status(500).json({ error: formatScoreDbError(e) })
  }
})

app.listen(PORT, () => {
  console.log(`API server http://localhost:${PORT}`)
  seedChordTypesIfEmpty().catch((e) => console.error('seed chord types failed:', e))
})
