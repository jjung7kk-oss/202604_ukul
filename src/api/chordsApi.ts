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

async function fetchOkWithRetries(
  pathWithQuery: string,
  init?: RequestInit,
): Promise<Response | null> {
  const url = `${base}${pathWithQuery}`
  let lastHttpResponse: Response | null = null
  for (let i = 0; i < RETRIES; i++) {
    if (i > 0) {
      await new Promise((r) =>
        setTimeout(r, RETRY_DELAY_MS[i - 1] ?? 400),
      )
    }
    try {
      const res = await fetch(url, { cache: 'no-store', ...init })
      lastHttpResponse = res
      if (res.ok) return res
      if (res.status === 401) return res
    } catch {
      /* 연결 실패 — lastHttpResponse는 이전 시도 값 유지 또는 무시 */
    }
  }
  // 연결은 됐지만 5xx 등으로 끝난 경우 마지막 응답으로 상태 코드를 알릴 수 있음
  if (lastHttpResponse && !lastHttpResponse.ok) {
    return lastHttpResponse
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

export type FetchChordDetailOptions = {
  /** 있으면 Bearer로 전송하며, 실패 시 번들로 폴백하지 않음(관리자 편집용). */
  authToken?: string | null
}

/**
 * 서버 우선. `authToken`이 없으면 실패 시 정적 `chordLibrary`에서 조회.
 * `authToken`이 있으면 인증이 필요하며 401·네트워크 오류 시 예외를 던짐.
 */
export async function fetchChordDetail(
  root: string,
  type: string,
  options?: FetchChordDetailOptions,
): Promise<{ shapes: { frets: [number, number, number, number] }[] }> {
  const authToken = options?.authToken
  const headers: HeadersInit = {}
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }
  const q = new URLSearchParams({ root, type })
  const res = await fetchOkWithRetries(`/chords/detail?${q}`, { headers })
  if (res) {
    if (authToken) {
      if (res.status === 401) {
        throw new Error('로그인이 만료되었거나 권한이 없습니다.')
      }
      if (res.ok) {
        return res.json() as Promise<{
          shapes: { frets: [number, number, number, number] }[]
        }>
      }
      throw new Error(`코드를 불러오지 못했습니다. (${res.status})`)
    }
    return res.json() as Promise<{
      shapes: { frets: [number, number, number, number] }[]
    }>
  }
  if (authToken) {
    throw new Error('서버에 연결할 수 없습니다.')
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
  authToken: string,
): Promise<void> {
  const res = await fetch(`${base}/chords/detail`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ root, type, shapes }),
  })
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('로그인이 만료되었거나 권한이 없습니다.')
    }
    const err = await res.json().catch(() => ({}))
    throw new Error(
      typeof err === 'object' && err && 'error' in err
        ? String((err as { error: string }).error)
        : '저장에 실패했습니다.',
    )
  }
}
