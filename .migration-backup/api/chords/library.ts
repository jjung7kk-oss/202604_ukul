import type { VercelRequest, VercelResponse } from '@vercel/node'

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

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
    const { getChordLibrary } = await import('../../lib/chordService.js')
    const library = await getChordLibrary()
    res.status(200).json(library)
  } catch (e) {
    console.error(e)
    res.status(500).json({
      error: 'Failed to load chord library',
      detail: e instanceof Error ? e.message : String(e),
    })
  }
}
