const base = '/api'

export type ScoreVerseDto = {
  id?: string
  orderIndex?: number
  label: string
  lyrics: string
}

export type ScoreDto = {
  id: string
  title: string
  sharedChordText: string
  createdAt: string
  updatedAt: string
  verses: ScoreVerseDto[]
}

export type SaveScorePayload = {
  scoreId?: string | null
  title: string
  sharedChordText: string
  verses: { label: string; lyrics: string }[]
}

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function parseApiError(err: unknown, fallbackMessage: string): string {
  if (typeof err === 'object' && err && 'error' in err) {
    const maybe = (err as { error?: unknown }).error
    if (typeof maybe === 'string' && maybe.trim().length > 0) return maybe
  }
  return fallbackMessage
}

export async function fetchMyScores(authToken: string): Promise<ScoreDto[]> {
  const res = await fetch(`${base}/scores`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${authToken}` },
  })
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('로그인이 만료되었거나 권한이 없습니다.')
    }
    const err = await res.json().catch(() => ({}))
    throw new Error(parseApiError(err, '내 악보 목록을 불러오지 못했습니다.'))
  }
  const data = (await res.json()) as { scores?: ScoreDto[] }
  return Array.isArray(data.scores) ? data.scores : []
}

export async function saveMyScore(
  payload: SaveScorePayload,
  authToken: string,
): Promise<ScoreDto> {
  const res = await fetch(`${base}/scores`, {
    method: 'POST',
    headers: authHeaders(authToken),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('로그인이 만료되었거나 권한이 없습니다.')
    }
    const err = await res.json().catch(() => ({}))
    throw new Error(parseApiError(err, '악보 저장에 실패했습니다.'))
  }
  const data = (await res.json()) as { score?: ScoreDto }
  if (!data.score) {
    throw new Error('저장 응답이 올바르지 않습니다.')
  }
  return data.score
}
