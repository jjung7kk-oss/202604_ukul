import type { ChordLibrary, ChordShape } from '../types/chord'
import { CANONICAL_ROOTS } from '../data/chordData'
import { parseChordSymbol } from './transposeChordName'

const ROOTS_LONGEST_FIRST = [...CANONICAL_ROOTS].sort((a, b) => b.length - a.length)

/**
 * 변환된 코드명(또는 임의 샵 표기 심볼)으로 라이브러리에서 첫 번째 shape 조회.
 * 운지 이동 계산 없음 — DB/정적 데이터에 있는 그대로 사용.
 *
 * 1단계: 정적 파서(SUFFIX_PARSE_ORDER)로 루트+타입 분해.
 * 2단계: 파서가 인식 못 하면(동적으로 추가된 타입 등) 라이브러리 키를 직접 대조.
 */
export function getRepresentativeShapeForSymbol(
  library: ChordLibrary | null,
  symbol: string,
): ChordShape | null {
  if (!library) return null

  // ── 1단계: 정적 파서 ──────────────────────────────────────────────────────
  const parsed = parseChordSymbol(symbol)
  if (parsed) {
    const shapes = library[parsed.root]?.[parsed.quality]?.shapes
    return shapes?.[0] ?? null
  }

  // ── 2단계: 라이브러리 키 직접 대조 (동적 타입 폴백) ──────────────────────
  const s = symbol.trim()
  for (const root of ROOTS_LONGEST_FIRST) {
    if (!s.startsWith(root)) continue
    const rest = s.slice(root.length)
    const rootEntry = library[root]
    if (!rootEntry) continue

    // rest가 라이브러리에 있는 타입 키와 정확히 일치하는지 확인
    if (rest !== '' && Object.prototype.hasOwnProperty.call(rootEntry, rest)) {
      return rootEntry[rest]?.shapes?.[0] ?? null
    }
    // rest가 비어있으면 major
    if (rest === '' && Object.prototype.hasOwnProperty.call(rootEntry, 'major')) {
      return rootEntry['major']?.shapes?.[0] ?? null
    }
  }

  return null
}
