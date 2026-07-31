import { CANONICAL_ROOTS } from '../data/chordData'
import type { CanonicalRootName, ChordQuality } from '../types/chord'

/** QUALITY_ORDER와 동일한 표기 규칙 (major는 접미사 없음) */
const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  major: '',
  m: 'm',
  '7': '7',
  m7: 'm7',
  maj7: 'maj7',
  sus4: 'sus4',
  sus2: 'sus2',
  dim: 'dim',
  aug: 'aug',
  '6': '6',
  m6: 'm6',
  add9: 'add9',
  '9': '9',
}

const SUFFIX_PARSE_ORDER: { suffix: string; quality: ChordQuality }[] = [
  { suffix: 'maj7', quality: 'maj7' },
  { suffix: 'm7', quality: 'm7' },
  { suffix: 'm6', quality: 'm6' },
  { suffix: 'add9', quality: 'add9' },
  { suffix: 'sus4', quality: 'sus4' },
  { suffix: 'sus2', quality: 'sus2' },
  { suffix: 'dim', quality: 'dim' },
  { suffix: 'aug', quality: 'aug' },
  { suffix: 'm', quality: 'm' },
  { suffix: '7', quality: '7' },
  { suffix: '6', quality: '6' },
  { suffix: '9', quality: '9' },
]

const ROOTS_LONGEST_FIRST: readonly CanonicalRootName[] = [...CANONICAL_ROOTS].sort(
  (a, b) => b.length - a.length,
)

const ROOT_INDEX: Record<CanonicalRootName, number> = CANONICAL_ROOTS.reduce(
  (acc, r, i) => {
    acc[r] = i
    return acc
  },
  {} as Record<CanonicalRootName, number>,
)

export type ParsedChordSymbol = {
  root: CanonicalRootName
  quality: ChordQuality
}

export function formatChordSymbol(parsed: ParsedChordSymbol): string {
  const suf = QUALITY_SUFFIX[parsed.quality]
  return suf === '' ? parsed.root : `${parsed.root}${suf}`
}

/**
 * 샵 기준 표기 코드 문자열을 루트 + 타입으로 분해 (예: F#m, Bdim, C)
 */
export function parseChordSymbol(symbol: string): ParsedChordSymbol | null {
  const s = symbol.trim()
  if (!s) return null

  let root: CanonicalRootName | null = null
  for (const r of ROOTS_LONGEST_FIRST) {
    if (s.startsWith(r)) {
      root = r
      break
    }
  }
  if (!root) return null

  const rest = s.slice(root.length)
  if (rest === '') {
    return { root, quality: 'major' }
  }

  for (const { suffix, quality } of SUFFIX_PARSE_ORDER) {
    if (rest === suffix) {
      return { root, quality }
    }
  }

  return null
}

/** 목표키 − 원곡키 반음 차이 (0~11), 순방향 이동량 */
export function semitoneStepsBetweenKeys(
  fromKey: CanonicalRootName,
  toKey: CanonicalRootName,
): number {
  return (ROOT_INDEX[toKey] - ROOT_INDEX[fromKey] + 12) % 12
}

/** 루트만 반음 이동, 타입(접미사) 유지 */
export function transposeParsedChord(
  parsed: ParsedChordSymbol,
  semitoneSteps: number,
): ParsedChordSymbol {
  const i = ROOT_INDEX[parsed.root]
  const next = CANONICAL_ROOTS[(i + semitoneSteps + 12) % 12]!
  return { root: next, quality: parsed.quality }
}

export function transposeChordName(
  symbol: string,
  semitoneSteps: number,
): string | null {
  const parsed = parseChordSymbol(symbol)
  if (!parsed) return null
  return formatChordSymbol(transposeParsedChord(parsed, semitoneSteps))
}
