import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import {
  getBearerToken,
  getSessionUserId,
  signSessionToken,
  verifyCredentials,
  verifySessionToken,
} from '../lib/adminAuth'
import {
  getChordDetail,
  getChordLibrary,
  replaceChordShapes,
} from '../lib/chordService'
import { formatScoreDbError } from '../lib/scoreDbError'
import { saveScore, listScoresByUser, ScoreServiceError } from '../lib/scoreService'

function logRouteError(route: string, e: unknown): void {
  if (e instanceof Error) {
    console.error(`[${route}]`, e.message)
    console.error(e.stack)
    return
  }
  console.error(`[${route}]`, e)
}

const app = express()
const PORT = Number(process.env.PORT) || 4000

app.use(
  cors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(express.json())

function requireAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const token = getBearerToken(req.headers.authorization)
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

function requireAdminUserId(
  req: express.Request,
  res: express.Response,
): string | null {
  const token = getBearerToken(req.headers.authorization)
  const userId = getSessionUserId(token)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return userId
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/login', (req, res) => {
  const body = req.body as { username?: string; password?: string }
  const username = body.username
  const password = body.password
  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'username and password required' })
    return
  }
  if (!verifyCredentials(username, password)) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  res.json({ token: signSessionToken() })
})

app.get('/api/chords/library', async (_req, res) => {
  try {
    const library = await getChordLibrary()
    res.json(library)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to load chord library' })
  }
})

app.get('/api/chords/detail', requireAdminAuth, async (req, res) => {
  const root = String(req.query.root ?? '')
  const type = String(req.query.type ?? '')
  if (!root || !type) {
    res.status(400).json({ error: 'root and type query params required' })
    return
  }
  try {
    const detail = await getChordDetail(root, type)
    res.json(detail)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to load chord' })
  }
})

app.put('/api/chords/detail', requireAdminAuth, async (req, res) => {
  const body = req.body as {
    root?: string
    type?: string
    shapes?: { frets: [number, number, number, number] }[]
  }
  const root = body.root
  const type = body.type
  const shapes = body.shapes
  if (!root || !type || !Array.isArray(shapes)) {
    res.status(400).json({ error: 'root, type, shapes[] required' })
    return
  }
  if (shapes.length > 4) {
    res.status(400).json({ error: 'At most 4 shapes' })
    return
  }
  for (const s of shapes) {
    if (
      !s?.frets ||
      s.frets.length !== 4 ||
      s.frets.some((n) => typeof n !== 'number' || n < 0 || n > 15)
    ) {
      res.status(400).json({ error: 'Invalid frets in shapes' })
      return
    }
  }
  try {
    await replaceChordShapes(root, type, shapes)
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to save' })
  }
})

app.get('/api/scores', async (req, res) => {
  const userId = requireAdminUserId(req, res)
  if (!userId) return
  try {
    const scores = await listScoresByUser(userId)
    res.json({
      scores: scores.map((score) => ({
        id: score.id,
        title: score.title,
        sharedChordText: score.sharedChordText,
        createdAt: score.createdAt.toISOString(),
        updatedAt: score.updatedAt.toISOString(),
        verses: score.verses.map((verse) => ({
          id: verse.id,
          orderIndex: verse.orderIndex,
          label: verse.label,
          lyrics: verse.lyrics,
        })),
      })),
    })
  } catch (e) {
    logRouteError('GET /api/scores', e)
    res.status(500).json({ error: formatScoreDbError(e) })
  }
})

app.post('/api/scores', async (req, res) => {
  const userId = requireAdminUserId(req, res)
  if (!userId) return
  const body = req.body as {
    scoreId?: unknown
    title?: unknown
    sharedChordText?: unknown
    verses?: unknown
  }
  const scoreId = typeof body.scoreId === 'string' ? body.scoreId : undefined
  const title = typeof body.title === 'string' ? body.title : ''
  const sharedChordText =
    typeof body.sharedChordText === 'string' ? body.sharedChordText : ''
  const verses = Array.isArray(body.verses)
    ? body.verses
        .map((verse, index) => {
          if (!verse || typeof verse !== 'object') return null
          const v = verse as { label?: unknown; lyrics?: unknown }
          return {
            label: typeof v.label === 'string' ? v.label : `${index + 1}절`,
            lyrics: typeof v.lyrics === 'string' ? v.lyrics : '',
          }
        })
        .filter((verse): verse is { label: string; lyrics: string } => verse != null)
    : []

  try {
    const score = await saveScore({
      scoreId,
      userId,
      title,
      sharedChordText,
      verses,
    })
    res.json({
      score: {
        id: score.id,
        title: score.title,
        sharedChordText: score.sharedChordText,
        createdAt: score.createdAt.toISOString(),
        updatedAt: score.updatedAt.toISOString(),
        verses: score.verses.map((verse) => ({
          id: verse.id,
          orderIndex: verse.orderIndex,
          label: verse.label,
          lyrics: verse.lyrics,
        })),
      },
    })
  } catch (e) {
    if (e instanceof ScoreServiceError) {
      if (e.code === 'BAD_REQUEST') {
        res.status(400).json({ error: e.message })
        return
      }
      if (e.code === 'NOT_FOUND') {
        res.status(404).json({ error: e.message })
        return
      }
      if (e.code === 'FORBIDDEN') {
        res.status(403).json({ error: e.message })
        return
      }
    }
    logRouteError('POST /api/scores', e)
    res.status(500).json({ error: formatScoreDbError(e) })
  }
})

app.listen(PORT, () => {
  console.log(`API server http://localhost:${PORT}`)
})
