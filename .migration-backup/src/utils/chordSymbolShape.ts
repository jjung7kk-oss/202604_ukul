import type { ChordLibrary, ChordShape } from '../types/chord'
import { parseChordSymbol } from './transposeChordName'

/**
 * 변환된 코드명(또는 임의 샵 표기 심볼)으로 라이브러리에서 첫 번째 shape 조회.
 * 운지 이동 계산 없음 — DB/정적 데이터에 있는 그대로 사용.
 */
export function getRepresentativeShapeForSymbol(
  library: ChordLibrary | null,
  symbol: string,
): ChordShape | null {
  if (!library) return null
  const parsed = parseChordSymbol(symbol)
  if (!parsed) return null
  const shapes = library[parsed.root]?.[parsed.quality]?.shapes
  const first = shapes?.[0]
  return first ?? null
}
