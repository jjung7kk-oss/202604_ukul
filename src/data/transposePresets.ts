import type { CanonicalRootName } from '../types/chord'

/** 조변환 페이지 전용: 키별 기본(다이아토닉) 코드 7개, 샵 표기 통일 */
export const TRANSPOSE_KEY_PRESETS = {
  C: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
  'C#': ['C#', 'D#m', 'Fm', 'F#', 'G#', 'A#m', 'Cdim'],
  D: ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
  'D#': ['D#', 'Fm', 'Gm', 'G#', 'A#', 'Cm', 'Ddim'],
  E: ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'],
  F: ['F', 'Gm', 'Am', 'A#', 'C', 'Dm', 'Edim'],
  'F#': ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'Fdim'],
  G: ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
  'G#': ['G#', 'A#m', 'Cm', 'C#', 'D#', 'Fm', 'Gdim'],
  A: ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
  'A#': ['A#', 'Cm', 'Dm', 'D#', 'F', 'Gm', 'Adim'],
  B: ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#dim'],
} as const satisfies Record<CanonicalRootName, readonly string[]>
