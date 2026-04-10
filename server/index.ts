import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import {
  getBearerToken,
  signSessionToken,
  verifyCredentials,
  verifySessionToken,
} from '../lib/adminAuth'
import {
  getChordDetail,
  getChordLibrary,
  replaceChordShapes,
} from '../lib/chordService'

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

app.listen(PORT, () => {
  console.log(`API server http://localhost:${PORT}`)
})
