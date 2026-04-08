import { chordLibrary } from '../data/chordData'
import type { CanonicalRootName, ChordLibrary, ChordQuality } from '../types/chord'

const base = '/api'

export type ChordLibrarySource = 'api' | 'fallback'

export type ChordLibraryFailureKind = 'network' | 'http_error' | 'not_found'

export type ChordLibraryLoadInfo = {
  source: ChordLibrarySource
  failure?: ChordLibraryFailureKind
  httpStatus?: number
}

export type FetchChordLibraryResult = {
  library: ChordLibrary
  loadInfo: ChordLibraryLoadInfo
}

let lastChordLibrarySource: ChordLibrarySource = 'api'

let chordLibraryLoadInfo: ChordLibraryLoadInfo = { source: 'api' }

/** @deprecated fetchChordLibrary 반환값의 loadInfo 사용 권장 */
export function getLastChordLibrarySource(): ChordLibrarySource {
  return lastChordLibrarySource
}

export function getChordLibraryLoadInfo(): ChordLibraryLoadInfo {
  return chordLibraryLoadInfo
}

const RETRIES = 3
const RETRY_DELAY_MS = [250, 600]

function cloneChordLibrary(): ChordLibrary {
  try {
    return structuredClone(chordLibrary)
  } catch {
    return JSON.parse(JSON.stringify(chordLibrary)) as ChordLibrary
  }
}

function staticChordDetail(root: string, type: string) {
  const r = root as CanonicalRootName
  const q = type as ChordQuality
  const shapes = chordLibrary[r]?.[q]?.shapes ?? []
  return {
    shapes: shapes.map((s) => ({
      frets: [...s.frets] as [number, number, number, number],
    })),
  }
}

async function fetchOkWithRetries(pathWithQuery: string): Promise<Response | null> {
  const url = `${base}${pathWithQuery}`
  for (let i = 0; i < RETRIES; i++) {
    if (i > 0) {
      await new Promise((r) =>
        setTimeout(r, RETRY_DELAY_MS[i - 1] ?? 400),
      )
    }
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) return res
    } catch {
      /* 연결 실패 */
    }
  }
  return null
}

/**
 * 서버 `/api/chords/library` 우선. 실패 시 번들 데이터.
 * - 연결 자체가 안 되면 `failure: 'network'` (Vite만 켠 경우 등)
 * - HTTP 404면 `not_found`
 * - 그 외 비정상 응답(500 등)은 `http_error` — 서버는 살아 있는데 DB 등 서버 측 오류
 */
export async function fetchChordLibrary(): Promise<FetchChordLibraryResult> {
  const url = `${base}/chords/library`
  let everGotResponse = false
  let lastHttpStatus: number | undefined

  for (let i = 0; i < RETRIES; i++) {
    if (i > 0) {
      await new Promise((r) =>
        setTimeout(r, RETRY_DELAY_MS[i - 1] ?? 400),
      )
    }
    try {
      const res = await fetch(url, { cache: 'no-store' })
      everGotResponse = true
      lastHttpStatus = res.status
      if (res.ok) {
        lastChordLibrarySource = 'api'
        chordLibraryLoadInfo = { source: 'api' }
        const library = (await res.json()) as ChordLibrary
        return { library, loadInfo: chordLibraryLoadInfo }
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('[chordsApi] /chords/library fetch 실패:', e)
      }
    }
  }

  lastChordLibrarySource = 'fallback'

  if (!everGotResponse) {
    chordLibraryLoadInfo = { source: 'fallback', failure: 'network' }
  } else if (lastHttpStatus === 404) {
    chordLibraryLoadInfo = {
      source: 'fallback',
      failure: 'not_found',
      httpStatus: 404,
    }
  } else {
    chordLibraryLoadInfo = {
      source: 'fallback',
      failure: 'http_error',
      httpStatus: lastHttpStatus,
    }
  }

  console.warn('[chordsApi] 번들 chord 라이브러리 사용', chordLibraryLoadInfo)

  return { library: cloneChordLibrary(), loadInfo: chordLibraryLoadInfo }
}

/**
 * 서버 우선. 실패 시 정적 `chordLibrary`에서 조회.
 */
export async function fetchChordDetail(
  root: string,
  type: string,
): Promise<{ shapes: { frets: [number, number, number, number] }[] }> {
  const q = new URLSearchParams({ root, type })
  const res = await fetchOkWithRetries(`/chords/detail?${q}`)
  if (res) {
    return res.json() as Promise<{
      shapes: { frets: [number, number, number, number] }[]
    }>
  }
  if (import.meta.env.DEV) {
    console.warn('[chordsApi] detail API 실패 → 번들 데이터 사용')
  }
  return staticChordDetail(root, type)
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
