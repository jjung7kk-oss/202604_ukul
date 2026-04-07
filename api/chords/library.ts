import type { VercelRequest, VercelResponse } from '@vercel/node'
import { setCors } from '../_cors'
import { getChordLibrary } from '../../lib/chordService'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const library = await getChordLibrary()
    res.status(200).json(library)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to load chord library' })
  }
}
