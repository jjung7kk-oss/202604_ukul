import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import {
  getChordDetail,
  getChordLibrary,
  replaceChordShapes,
} from '../lib/chordService'

const app = express()
const PORT = Number(process.env.PORT) || 4000

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
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

app.get('/api/chords/detail', async (req, res) => {
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

app.put('/api/chords/detail', async (req, res) => {
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
