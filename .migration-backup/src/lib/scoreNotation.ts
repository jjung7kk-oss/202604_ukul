/**
 * 악보 기호(마디 메타 / 구간 괄호) — 클라이언트 편집·미리보기·저장 직렬화.
 * 마디 키: verse1 기준 줄 인덱스 + 마디 인덱스 → `L{lineIndex}M{measureIndex}` (0부터)
 */

export const SCORE_NOTATION_VERSION = 1 as const

export type JumpDirectiveKind =
  | 'DS_AL_CODA'
  | 'DS_AL_FINE'
  | 'DC_AL_CODA'
  | 'DC_AL_FINE'

export type MeasureNotation = {
  repeatStart?: boolean
  repeatEnd?: boolean
  segno?: boolean
  coda?: boolean
  toCoda?: boolean
  fine?: boolean
  jumpDirective?: JumpDirectiveKind
}

export type EndingBracket = {
  id: string
  type: 1 | 2
  lineIndex: number
  startMeasureIndex: number
  endMeasureIndex: number
}

export type ScoreNotationState = {
  version: typeof SCORE_NOTATION_VERSION
  measures: Record<string, MeasureNotation>
  endings: EndingBracket[]
}

export function makeMeasureKey(lineIndex: number, measureIndex: number): string {
  return `L${lineIndex}M${measureIndex}`
}

export function parseMeasureKey(
  key: string,
): { lineIndex: number; measureIndex: number } | null {
  const m = /^L(\d+)M(\d+)$/.exec(key.trim())
  if (!m) return null
  return { lineIndex: Number(m[1]), measureIndex: Number(m[2]) }
}

export const JUMP_LABELS: Record<JumpDirectiveKind, string> = {
  DS_AL_CODA: 'D.S. al Coda',
  DS_AL_FINE: 'D.S. al Fine',
  DC_AL_CODA: 'D.C. al Coda',
  DC_AL_FINE: 'D.C. al Fine',
}

export function emptyNotationState(): ScoreNotationState {
  return {
    version: SCORE_NOTATION_VERSION,
    measures: {},
    endings: [],
  }
}

function isJumpDirective(v: unknown): v is JumpDirectiveKind {
  return (
    v === 'DS_AL_CODA' ||
    v === 'DS_AL_FINE' ||
    v === 'DC_AL_CODA' ||
    v === 'DC_AL_FINE'
  )
}

function coerceMeasureEntry(raw: unknown): MeasureNotation | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const out: MeasureNotation = {}
  if (o.repeatStart === true) out.repeatStart = true
  if (o.repeatEnd === true) out.repeatEnd = true
  if (o.segno === true) out.segno = true
  if (o.coda === true) out.coda = true
  if (o.toCoda === true) out.toCoda = true
  if (o.fine === true) out.fine = true
  if (isJumpDirective(o.jumpDirective)) out.jumpDirective = o.jumpDirective
  return Object.keys(out).length > 0 ? out : null
}

function coerceEnding(raw: unknown): EndingBracket | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : null
  const type = o.type === 1 || o.type === 2 ? o.type : null
  const lineIndex = typeof o.lineIndex === 'number' && o.lineIndex >= 0 ? o.lineIndex : null
  const startMeasureIndex =
    typeof o.startMeasureIndex === 'number' && o.startMeasureIndex >= 0
      ? o.startMeasureIndex
      : null
  const endMeasureIndex =
    typeof o.endMeasureIndex === 'number' && o.endMeasureIndex >= 0
      ? o.endMeasureIndex
      : null
  if (
    id == null ||
    type == null ||
    lineIndex == null ||
    startMeasureIndex == null ||
    endMeasureIndex == null
  ) {
    return null
  }
  if (startMeasureIndex > endMeasureIndex) return null
  return {
    id,
    type,
    lineIndex,
    startMeasureIndex,
    endMeasureIndex,
  }
}

/** API·DB에서 온 값을 편집 상태로 정규화 */
export function parseScoreNotation(raw: unknown): ScoreNotationState {
  const empty = emptyNotationState()
  if (raw == null) return empty
  let obj: unknown = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw) as unknown
    } catch {
      return empty
    }
  }
  if (!obj || typeof obj !== 'object') return empty
  const root = obj as Record<string, unknown>

  const measures: Record<string, MeasureNotation> = {}
  if (root.measures && typeof root.measures === 'object') {
    for (const [k, v] of Object.entries(root.measures as Record<string, unknown>)) {
      if (!/^L\d+M\d+$/.test(k)) continue
      const entry = coerceMeasureEntry(v)
      if (entry) measures[k] = entry
    }
  }

  const endings: EndingBracket[] = []
  if (Array.isArray(root.endings)) {
    for (const item of root.endings) {
      const e = coerceEnding(item)
      if (e) endings.push(e)
    }
  }

  return {
    version: SCORE_NOTATION_VERSION,
    measures,
    endings,
  }
}

/** 직렬화용(저장 전): 현재 미리보기에 존재하는 마디 키만 유지, 괄호는 무효 참조 제거 */
export function sanitizeNotationForLines(
  notation: ScoreNotationState,
  validKeys: ReadonlySet<string>,
  lineMeasureCounts: ReadonlyArray<number>,
): ScoreNotationState {
  const measures: Record<string, MeasureNotation> = {}
  for (const [k, v] of Object.entries(notation.measures)) {
    if (validKeys.has(k)) measures[k] = v
  }

  const endings = notation.endings.filter((e) => {
    if (e.lineIndex < 0 || e.lineIndex >= lineMeasureCounts.length) return false
    const count = lineMeasureCounts[e.lineIndex] ?? 0
    if (count <= 0) return false
    if (e.startMeasureIndex >= count || e.endMeasureIndex >= count) return false
    for (let m = e.startMeasureIndex; m <= e.endMeasureIndex; m += 1) {
      if (!validKeys.has(makeMeasureKey(e.lineIndex, m))) return false
    }
    return true
  })

  return {
    version: SCORE_NOTATION_VERSION,
    measures,
    endings,
  }
}

export function collectValidMeasureKeysFromPreview(
  lineLengths: ReadonlyArray<number>,
): Set<string> {
  const set = new Set<string>()
  lineLengths.forEach((len, lineIndex) => {
    for (let m = 0; m < len; m += 1) {
      set.add(makeMeasureKey(lineIndex, m))
    }
  })
  return set
}

export function notationToJson(notation: ScoreNotationState): string {
  return JSON.stringify(notation)
}
