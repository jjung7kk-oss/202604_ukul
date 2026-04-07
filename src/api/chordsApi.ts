import type { ChordLibrary } from '../types/chord'

const base = '/api'

export async function fetchChordLibrary(): Promise<ChordLibrary> {
  const res = await fetch(`${base}/chords/library`)
  if (!res.ok) {
    throw new Error(`코드 라이브러리를 불러오지 못했습니다. (${res.status})`)
  }
  return res.json() as Promise<ChordLibrary>
}

export async function fetchChordDetail(
  root: string,
  type: string,
): Promise<{ shapes: { frets: [number, number, number, number] }[] }> {
  const q = new URLSearchParams({ root, type })
  const res = await fetch(`${base}/chords/detail?${q}`)
  if (!res.ok) {
    throw new Error(`코드를 불러오지 못했습니다. (${res.status})`)
  }
  return res.json()
}

export async function saveChordDetail(
  root: string,
  type: string,
  shapes: { frets: [number, number, number, number] }[],
): Promise<void> {
  const res = await fetch(`${base}/chords/detail`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ root, type, shapes }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      typeof err === 'object' && err && 'error' in err
        ? String((err as { error: string }).error)
        : '저장에 실패했습니다.',
    )
  }
}
