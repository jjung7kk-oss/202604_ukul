import type {
  CanonicalRootName,
  ChordLibrary,
  ChordQuality,
  ChordShape,
  RootName,
} from '../types/chord'

/** 코드수정·DB 시드용 표준 루트 (동음이름 제외) */
export const CANONICAL_ROOTS = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const satisfies readonly CanonicalRootName[]

export const ROOT_ORDER: RootName[] = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
]

export const ROOT_ALIAS: Record<RootName, CanonicalRootName> = {
  C: 'C',
  'C#': 'C#',
  Db: 'C#',
  D: 'D',
  'D#': 'D#',
  Eb: 'D#',
  E: 'E',
  F: 'F',
  'F#': 'F#',
  Gb: 'F#',
  G: 'G',
  'G#': 'G#',
  Ab: 'G#',
  A: 'A',
  'A#': 'A#',
  Bb: 'A#',
  B: 'B',
}

export const QUALITY_ORDER: { key: ChordQuality; label: string }[] = [
  { key: 'major', label: '' },
  { key: 'm', label: 'm' },
  { key: '7', label: '7' },
  { key: 'm7', label: 'm7' },
  { key: 'maj7', label: 'maj7' },
  { key: 'sus4', label: 'sus4' },
  { key: 'sus2', label: 'sus2' },
  { key: 'dim', label: 'dim' },
  { key: 'aug', label: 'aug' },
  { key: '6', label: '6' },
  { key: 'm6', label: 'm6' },
  { key: 'add9', label: 'add9' },
  { key: '9', label: '9' },
]

export const chordLibrary: ChordLibrary = {
  C: {
    major: { shapes: [{ frets: [0, 0, 0, 3] }] },
    m: { shapes: [{ frets: [0, 3, 3, 3] }] },
    '7': { shapes: [{ frets: [0, 0, 0, 1] }] },
    m7: { shapes: [{ frets: [3, 3, 3, 3] }] },
    maj7: { shapes: [{ frets: [0, 0, 0, 2] }] },
    sus4: { shapes: [{ frets: [0, 0, 1, 3] }] },
    sus2: { shapes: [{ frets: [0, 2, 3, 3] }] },
    dim: { shapes: [{ frets: [5, 3, 2, 3] }] },
    aug: { shapes: [{ frets: [1, 0, 0, 3] }] },
    '6': { shapes: [{ frets: [0, 0, 0, 0] }] },
    m6: { shapes: [{ frets: [2, 3, 3, 3] }] },
    add9: { shapes: [{ frets: [0, 2, 0, 3] }] },
    '9': { shapes: [{ frets: [3, 2, 0, 3] }] },
  },

  'C#': {
    major: { shapes: [{ frets: [1, 1, 1, 4] }] },
    m: { shapes: [{ frets: [1, 4, 4, 4] }] },
    '7': { shapes: [{ frets: [1, 1, 1, 2] }] },
    m7: { shapes: [{ frets: [4, 4, 4, 4] }] },
    maj7: { shapes: [{ frets: [1, 1, 1, 3] }] },
    sus4: { shapes: [{ frets: [1, 1, 2, 4] }] },
    sus2: { shapes: [{ frets: [1, 3, 4, 4] }] },
    dim: { shapes: [{ frets: [0, 4, 3, 4] }] },
    aug: { shapes: [{ frets: [2, 1, 1, 0] }] },
    '6': { shapes: [{ frets: [1, 1, 1, 1] }] },
    m6: { shapes: [{ frets: [1, 1, 0, 1] }] },
    add9: { shapes: [{ frets: [1, 3, 1, 4] }] },
    '9': { shapes: [{ frets: [1, 1, 1, 2] }] },
  },

  D: {
    major: { shapes: [{ frets: [2, 2, 2, 0] }] },
    m: { shapes: [{ frets: [2, 2, 1, 0] }] },
    '7': {
      shapes: [{ frets: [2, 0, 2, 0] }, { frets: [2, 2, 2, 3] }],
    },
    m7: { shapes: [{ frets: [2, 2, 1, 3] }] },
    maj7: { shapes: [{ frets: [2, 2, 2, 4] }] },
    sus4: { shapes: [{ frets: [0, 2, 3, 0] }] },
    sus2: { shapes: [{ frets: [2, 2, 0, 0] }] },
    dim: { shapes: [{ frets: [7, 5, 4, 5] }] },
    aug: { shapes: [{ frets: [3, 2, 2, 1] }] },
    '6': { shapes: [{ frets: [2, 2, 2, 2] }] },
    m6: { shapes: [{ frets: [2, 2, 1, 2] }] },
    add9: { shapes: [{ frets: [2, 4, 2, 5] }] },
    '9': { shapes: [{ frets: [5, 4, 2, 5] }] },
  },

  'D#': {
    major: { shapes: [{ frets: [3, 3, 3, 1] }] },
    m: { shapes: [{ frets: [3, 3, 2, 1] }] },
    '7': { shapes: [{ frets: [3, 3, 3, 4] }] },
    m7: { shapes: [{ frets: [3, 3, 2, 4] }] },
    maj7: { shapes: [{ frets: [3, 3, 3, 5] }] },
    sus4: { shapes: [{ frets: [1, 3, 4, 1] }] },
    sus2: { shapes: [{ frets: [3, 3, 1, 1] }] },
    dim: { shapes: [{ frets: [2, 3, 2, 0] }] },
    aug: { shapes: [{ frets: [0, 3, 3, 2] }] },
    '6': { shapes: [{ frets: [3, 3, 3, 3] }] },
    m6: { shapes: [{ frets: [3, 3, 2, 3] }] },
    add9: { shapes: [{ frets: [0, 3, 1, 1] }] },
    '9': { shapes: [{ frets: [0, 3, 1, 4] }] },
  },

  E: {
    major: { shapes: [{ frets: [1, 4, 0, 2] }] },
    m: { shapes: [{ frets: [0, 4, 3, 2] }] },
    '7': { shapes: [{ frets: [1, 2, 0, 2] }] },
    m7: { shapes: [{ frets: [0, 2, 0, 2] }] },
    maj7: { shapes: [{ frets: [1, 3, 0, 2] }] },
    sus4: { shapes: [{ frets: [4, 4, 0, 0] }] },
    sus2: { shapes: [{ frets: [4, 4, 2, 2] }] },
    dim: { shapes: [{ frets: [0, 4, 0, 1] }] },
    aug: { shapes: [{ frets: [1, 0, 0, 3] }] },
    '6': { shapes: [{ frets: [4, 4, 4, 4] }] },
    m6: { shapes: [{ frets: [0, 1, 0, 2] }] },
    add9: { shapes: [{ frets: [1, 4, 2, 2] }] },
    '9': { shapes: [{ frets: [7, 6, 4, 7] }] },
  },

  F: {
    major: { shapes: [{ frets: [2, 0, 1, 0] }] },
    m: { shapes: [{ frets: [1, 0, 1, 3] }] },
    '7': { shapes: [{ frets: [2, 3, 1, 0] }] },
    m7: { shapes: [{ frets: [1, 3, 1, 3] }] },
    maj7: { shapes: [{ frets: [2, 4, 1, 3] }] },
    sus4: { shapes: [{ frets: [3, 0, 1, 1] }] },
    sus2: { shapes: [{ frets: [0, 0, 1, 3] }] },
    dim: { shapes: [{ frets: [4, 5, 4, 2] }] },
    aug: { shapes: [{ frets: [2, 1, 1, 0] }] },
    '6': { shapes: [{ frets: [2, 2, 1, 3] }] },
    m6: { shapes: [{ frets: [1, 2, 1, 3] }] },
    add9: { shapes: [{ frets: [0, 0, 1, 0] }] },
    '9': { shapes: [{ frets: [0, 3, 1, 0] }] },
  },

  'F#': {
    major: { shapes: [{ frets: [3, 1, 2, 1] }] },
    m: { shapes: [{ frets: [2, 1, 2, 0] }] },
    '7': { shapes: [{ frets: [3, 4, 2, 4] }] },
    m7: { shapes: [{ frets: [2, 4, 2, 4] }] },
    maj7: { shapes: [{ frets: [3, 5, 2, 4] }] },
    sus4: { shapes: [{ frets: [4, 1, 2, 2] }] },
    sus2: { shapes: [{ frets: [1, 1, 2, 4] }] },
    dim: { shapes: [{ frets: [2, 0, 2, 0] }] },
    aug: { shapes: [{ frets: [3, 2, 2, 1] }] },
    '6': { shapes: [{ frets: [3, 3, 2, 4] }] },
    m6: { shapes: [{ frets: [2, 3, 2, 4] }] },
    add9: { shapes: [{ frets: [1, 1, 2, 1] }] },
    '9': { shapes: [{ frets: [1, 4, 2, 1] }] },
  },

  G: {
    major: { shapes: [{ frets: [0, 2, 3, 2] }] },
    m: { shapes: [{ frets: [0, 2, 3, 1] }] },
    '7': { shapes: [{ frets: [0, 2, 1, 2] }] },
    m7: { shapes: [{ frets: [0, 2, 1, 1] }] },
    maj7: { shapes: [{ frets: [0, 2, 2, 2] }] },
    sus4: { shapes: [{ frets: [0, 2, 3, 3] }] },
    sus2: { shapes: [{ frets: [0, 2, 3, 0] }] },
    dim: { shapes: [{ frets: [3, 1, 3, 1] }] },
    aug: { shapes: [{ frets: [0, 3, 3, 2] }] },
    '6': { shapes: [{ frets: [0, 2, 0, 2] }] },
    m6: { shapes: [{ frets: [0, 2, 0, 1] }] },
    add9: { shapes: [{ frets: [0, 2, 5, 2] }] },
    '9': { shapes: [{ frets: [0, 5, 5, 2] }] },
  },

  'G#': {
    major: { shapes: [{ frets: [5, 3, 4, 3] }] },
    m: { shapes: [{ frets: [4, 3, 4, 2] }] },
    '7': { shapes: [{ frets: [1, 3, 2, 3] }] },
    m7: { shapes: [{ frets: [1, 3, 2, 2] }] },
    maj7: { shapes: [{ frets: [1, 3, 3, 3] }] },
    sus4: { shapes: [{ frets: [1, 3, 4, 4] }] },
    sus2: { shapes: [{ frets: [1, 3, 4, 1] }] },
    dim: { shapes: [{ frets: [4, 2, 4, 2] }] },
    aug: { shapes: [{ frets: [1, 0, 0, 3] }] },
    '6': { shapes: [{ frets: [1, 3, 1, 3] }] },
    m6: { shapes: [{ frets: [4, 5, 4, 6] }] },
    add9: { shapes: [{ frets: [3, 3, 4, 3] }] },
    '9': { shapes: [{ frets: [1, 0, 2, 1] }] },
  },

  A: {
    major: { shapes: [{ frets: [2, 1, 0, 0] }] },
    m: { shapes: [{ frets: [2, 0, 0, 0] }] },
    '7': { shapes: [{ frets: [0, 1, 0, 0] }] },
    m7: { shapes: [{ frets: [0, 0, 0, 0] }] },
    maj7: { shapes: [{ frets: [1, 1, 0, 0] }] },
    sus4: { shapes: [{ frets: [2, 2, 0, 0] }] },
    sus2: { shapes: [{ frets: [2, 4, 5, 2] }] },
    dim: { shapes: [{ frets: [2, 3, 5, 3] }] },
    aug: { shapes: [{ frets: [2, 1, 1, 4] }] },
    '6': { shapes: [{ frets: [2, 4, 2, 4] }] },
    m6: { shapes: [{ frets: [2, 4, 2, 3] }] },
    add9: { shapes: [{ frets: [2, 1, 0, 2] }] },
    '9': { shapes: [{ frets: [2, 1, 3, 2] }] },
  },

  'A#': {
    major: { shapes: [{ frets: [3, 2, 1, 1] }] },
    m: { shapes: [{ frets: [3, 1, 1, 1] }] },
    '7': { shapes: [{ frets: [1, 2, 1, 1] }] },
    m7: { shapes: [{ frets: [1, 1, 1, 1] }] },
    maj7: { shapes: [{ frets: [3, 2, 1, 0] }] },
    sus4: { shapes: [{ frets: [3, 3, 1, 1] }] },
    sus2: { shapes: [{ frets: [3, 0, 1, 1] }] },
    dim: { shapes: [{ frets: [3, 1, 0, 1] }] },
    aug: { shapes: [{ frets: [3, 2, 2, 1] }] },
    '6': { shapes: [{ frets: [0, 2, 1, 1] }] },
    m6: { shapes: [{ frets: [0, 1, 1, 1] }] },
    add9: { shapes: [{ frets: [3, 2, 1, 3] }] },
    '9': { shapes: [{ frets: [3, 2, 4, 3] }] },
  },

  B: {
    major: { shapes: [{ frets: [4, 3, 2, 2] }] },
    m: { shapes: [{ frets: [4, 2, 2, 2] }] },
    '7': { shapes: [{ frets: [2, 3, 2, 2] }] },
    m7: { shapes: [{ frets: [2, 2, 2, 2] }] },
    maj7: { shapes: [{ frets: [4, 3, 2, 1] }] },
    sus4: { shapes: [{ frets: [4, 4, 2, 2] }] },
    sus2: { shapes: [{ frets: [4, 1, 2, 2] }] },
    dim: { shapes: [{ frets: [7, 5, 7, 5] }] },
    aug: { shapes: [{ frets: [4, 3, 3, 2] }] },
    '6': { shapes: [{ frets: [1, 3, 2, 2] }] },
    m6: { shapes: [{ frets: [1, 2, 2, 2] }] },
    add9: { shapes: [{ frets: [4, 3, 2, 4] }] },
    '9': { shapes: [{ frets: [4, 3, 5, 4] }] },
  },
}

export function getChordDisplayName(root: RootName, quality: ChordQuality): string {
  return quality === 'major' ? root : `${root}${quality}`
}

/** 코드찾기 등: 루트와 타입을 띄어 읽기 (예: `C sus4`) */
export function getChordReadingLabel(root: RootName, quality: ChordQuality): string {
  if (quality === 'major') return root
  return `${root} ${quality}`
}

export function getCanonicalRoot(root: RootName): CanonicalRootName {
  return ROOT_ALIAS[root]
}

/** DB에서 받은 라이브러리에서 shape 조회 (최대 4개) */
export function getChordShapesFromLibrary(
  library: ChordLibrary | null,
  root: RootName,
  quality: ChordQuality,
): ChordShape[] {
  if (!library) return []
  const canonical = getCanonicalRoot(root)
  return library[canonical]?.[quality]?.shapes?.slice(0, 4) ?? []
}
