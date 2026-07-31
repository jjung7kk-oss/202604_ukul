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

/** 정적 폴백 / 초기값 (API 로드 전 표시용). DB 기반 목록은 useChordTypes 훅 사용. */
export const QUALITY_ORDER: { key: string; label: string }[] = [
  { key: 'major', label: '' },
  { key: 'm',     label: 'm' },
  { key: '7',     label: '7' },
  { key: 'm7',    label: 'm7' },
  { key: 'maj7',  label: 'maj7' },
  { key: 'mM7',   label: 'mM7' },
  { key: 'sus4',  label: 'sus4' },
  { key: 'sus2',  label: 'sus2' },
  { key: 'dim',   label: 'dim' },
  { key: 'aug',   label: 'aug' },
  { key: '6',     label: '6' },
  { key: 'm6',    label: 'm6' },
  { key: 'add9',  label: 'add9' },
  { key: '9',     label: '9' },
]

type GceaFrets = [number, number, number, number]

/** GCEA 표준 운지 (최대 3가지) — chordLibrary·DB 시드 공통 소스 */
export const UKE_CHORD_SHAPES_GCEA: Record<string, GceaFrets[]> = {
  C: [
    [0, 0, 0, 3],
    [0, 4, 3, 3],
    [5, 4, 3, 3],
  ],
  Cm: [
    [0, 3, 3, 3],
    [5, 3, 3, 3],
    [8, 7, 8, 6],
  ],
  C7: [
    [0, 0, 0, 1],
    [3, 4, 3, 3],
    [5, 7, 6, 7],
  ],
  Cm7: [
    [3, 3, 3, 3],
    [5, 7, 6, 6],
    [0, 0, 6, 6],
  ],
  Cmaj7: [
    [0, 0, 0, 2],
    [4, 4, 3, 3],
    [5, 7, 7, 7],
  ],
  Csus4: [
    [0, 0, 1, 3],
    [5, 5, 3, 3],
    [0, 7, 8, 8],
  ],
  'C#': [
    [1, 1, 1, 4],
    [6, 5, 4, 4],
    [10, 8, 9, 8],
  ],
  'C#m': [
    [1, 1, 0, 4],
    [6, 4, 4, 4],
    [1, 4, 4, 4],
  ],
  'C#7': [
    [1, 1, 1, 2],
    [4, 5, 4, 4],
    [6, 8, 7, 8],
  ],
  'C#m7': [
    [1, 1, 0, 2],
    [4, 4, 4, 4],
    [6, 8, 7, 7],
  ],
  'C#maj7': [
    [1, 1, 1, 3],
    [5, 5, 4, 4],
    [6, 8, 8, 8],
  ],
  'C#sus4': [
    [6, 6, 4, 4],
    [1, 1, 2, 4],
    [6, 8, 9, 9],
  ],
  D: [
    [2, 2, 2, 0],
    [7, 6, 5, 5],
    [2, 2, 2, 5],
  ],
  Dm: [
    [2, 2, 1, 0],
    [7, 5, 5, 5],
    [2, 5, 5, 5],
  ],
  D7: [
    [2, 0, 2, 0],
    [2, 2, 2, 3],
    [5, 6, 5, 5],
  ],
  Dm7: [
    [5, 5, 5, 5],
    [2, 2, 1, 3],
    [7, 9, 8, 8],
  ],
  Dmaj7: [
    [2, 2, 2, 4],
    [6, 6, 5, 5],
    [7, 9, 9, 9],
  ],
  Dsus4: [
    [0, 2, 3, 0],
    [2, 2, 3, 0],
    [7, 7, 5, 5],
  ],
  'D#': [
    [0, 3, 3, 1],
    [3, 3, 3, 1],
    [0, 7, 6, 6],
  ],
  'D#m': [
    [3, 3, 2, 1],
    [8, 6, 6, 6],
    [3, 6, 6, 6],
  ],
  'D#7': [
    [3, 3, 3, 4],
    [6, 7, 6, 6],
    [8, 10, 9, 10],
  ],
  'D#m7': [
    [6, 6, 6, 6],
    [3, 3, 2, 4],
    [8, 10, 9, 9],
  ],
  'D#maj7': [
    [3, 3, 3, 5],
    [7, 7, 6, 6],
    [8, 10, 10, 10],
  ],
  'D#sus4': [
    [1, 3, 4, 1],
    [8, 8, 6, 6],
    [3, 3, 4, 1],
  ],
  E: [
    [4, 4, 4, 2],
    [1, 4, 4, 2],
    [9, 8, 7, 7],
  ],
  Em: [
    [0, 7, 7, 7],
    [4, 4, 3, 2],
    [9, 7, 7, 7],
  ],
  E7: [
    [1, 2, 0, 2],
    [4, 4, 4, 5],
    [7, 8, 7, 7],
  ],
  Em7: [
    [0, 2, 0, 2],
    [7, 7, 7, 7],
    [4, 4, 3, 5],
  ],
  Emaj7: [
    [1, 3, 0, 2],
    [8, 8, 7, 7],
    [4, 4, 4, 6],
  ],
  Esus4: [
    [4, 4, 0, 0],
    [4, 4, 5, 0],
    [9, 9, 7, 7],
  ],
  F: [
    [2, 0, 1, 0],
    [5, 5, 5, 0],
    [5, 5, 5, 3],
  ],
  Fm: [
    [1, 0, 1, 3],
    [5, 5, 4, 3],
    [10, 8, 8, 8],
  ],
  F7: [
    [2, 3, 1, 3],
    [5, 5, 5, 6],
    [8, 9, 8, 8],
  ],
  Fm7: [
    [1, 3, 1, 3],
    [8, 8, 8, 8],
    [5, 5, 4, 6],
  ],
  Fmaj7: [
    [5, 5, 0, 0],
    [9, 9, 8, 8],
    [5, 5, 5, 7],
  ],
  Fsus4: [
    [3, 0, 1, 1],
    [3, 0, 1, 3],
    [10, 10, 8, 8],
  ],
  'F#': [
    [3, 1, 2, 1],
    [6, 6, 6, 4],
    [3, 1, 2, 4],
  ],
  'F#m': [
    [2, 1, 2, 0],
    [6, 6, 5, 4],
    [6, 6, 5, 0],
  ],
  'F#7': [
    [3, 4, 2, 4],
    [6, 6, 6, 7],
    [9, 10, 9, 9],
  ],
  'F#m7': [
    [6, 6, 0, 0],
    [9, 9, 9, 9],
    [2, 4, 2, 4],
  ],
  'F#maj7': [
    [6, 6, 6, 8],
    [10, 10, 9, 9],
    [3, 5, 2, 4],
  ],
  'F#sus4': [
    [4, 1, 2, 2],
    [4, 1, 2, 4],
    [4, 6, 7, 4],
  ],
  G: [
    [0, 2, 3, 2],
    [4, 2, 3, 2],
    [7, 7, 7, 5],
  ],
  Gm: [
    [0, 2, 3, 1],
    [3, 2, 3, 1],
    [0, 10, 10, 10],
  ],
  G7: [
    [0, 2, 1, 2],
    [7, 7, 7, 8],
    [4, 5, 3, 5],
  ],
  Gm7: [
    [0, 2, 1, 1],
    [10, 10, 10, 10],
    [3, 5, 3, 5],
  ],
  Gmaj7: [
    [0, 2, 2, 2],
    [7, 7, 7, 9],
    [4, 6, 3, 5],
  ],
  Gsus4: [
    [0, 2, 3, 3],
    [5, 2, 3, 3],
    [5, 2, 3, 5],
  ],
  'G#': [
    [5, 0, 4, 6],
    [5, 3, 4, 3],
    [8, 8, 8, 6],
  ],
  'G#m': [
    [4, 3, 4, 2],
    [8, 8, 7, 6],
    [1, 3, 4, 2],
  ],
  'G#7': [
    [1, 3, 2, 3],
    [8, 8, 8, 9],
    [5, 6, 4, 6],
  ],
  'G#m7': [
    [1, 3, 2, 2],
    [4, 6, 4, 6],
    [8, 8, 7, 9],
  ],
  'G#maj7': [
    [0, 3, 4, 3],
    [1, 3, 3, 3],
    [8, 8, 8, 10],
  ],
  'G#sus4': [
    [1, 3, 4, 4],
    [6, 3, 4, 4],
    [6, 3, 4, 6],
  ],
  A: [
    [2, 1, 0, 0],
    [9, 9, 9, 0],
    [6, 4, 5, 4],
  ],
  Am: [
    [2, 0, 0, 0],
    [5, 4, 5, 3],
    [5, 4, 5, 0],
  ],
  A7: [
    [0, 1, 0, 0],
    [2, 4, 3, 4],
    [0, 4, 5, 4],
  ],
  Am7: [
    [0, 0, 0, 0],
    [2, 4, 3, 3],
    [5, 7, 5, 7],
  ],
  Amaj7: [
    [1, 1, 0, 0],
    [2, 4, 4, 4],
    [9, 8, 9, 0],
  ],
  Asus4: [
    [2, 2, 0, 0],
    [2, 4, 5, 5],
    [7, 4, 5, 5],
  ],
  'A#': [
    [3, 2, 1, 1],
    [7, 5, 6, 5],
    [10, 10, 10, 8],
  ],
  'A#m': [
    [3, 1, 1, 1],
    [6, 5, 6, 4],
    [3, 1, 1, 4],
  ],
  'A#7': [
    [1, 2, 1, 1],
    [3, 5, 4, 5],
    [7, 8, 6, 8],
  ],
  'A#m7': [
    [1, 1, 1, 1],
    [3, 5, 4, 4],
    [6, 8, 6, 8],
  ],
  'A#maj7': [
    [2, 2, 1, 1],
    [3, 5, 5, 5],
    [10, 10, 10, 0],
  ],
  'A#sus4': [
    [3, 3, 1, 1],
    [3, 5, 6, 6],
    [8, 5, 6, 6],
  ],
  B: [
    [4, 3, 2, 2],
    [8, 6, 7, 6],
    [4, 6, 7, 6],
  ],
  Bm: [
    [4, 2, 2, 2],
    [7, 6, 7, 5],
    [4, 2, 2, 5],
  ],
  B7: [
    [2, 3, 2, 0],
    [2, 3, 2, 2],
    [4, 6, 5, 6],
  ],
  Bm7: [
    [2, 2, 2, 2],
    [4, 6, 5, 5],
    [7, 6, 7, 0],
  ],
  Bmaj7: [
    [3, 3, 2, 2],
    [4, 6, 6, 6],
    [4, 3, 2, 1],
  ],
  Bsus4: [
    [4, 4, 2, 2],
    [4, 6, 7, 7],
    [9, 6, 7, 7],
  ],
}

function ukeChordSymbol(root: CanonicalRootName, quality: 'major' | 'm' | '7' | 'm7' | 'maj7' | 'sus4'): string {
  if (quality === 'major') return root
  return `${root}${quality}`
}

function ukeShapes(symbol: string): ChordShape[] {
  return (UKE_CHORD_SHAPES_GCEA[symbol] ?? []).map((frets) => ({ frets }))
}

function ukeEntry(root: CanonicalRootName, quality: 'major' | 'm' | '7' | 'm7' | 'maj7' | 'sus4') {
  return { shapes: ukeShapes(ukeChordSymbol(root, quality)) }
}

export const chordLibrary: ChordLibrary = {
  C: {
    major: ukeEntry('C', 'major'),
    m: ukeEntry('C', 'm'),
    '7': ukeEntry('C', '7'),
    m7: ukeEntry('C', 'm7'),
    maj7: ukeEntry('C', 'maj7'),
    sus4: ukeEntry('C', 'sus4'),
    sus2: { shapes: [{ frets: [0, 2, 3, 3] }] },
    dim: { shapes: [{ frets: [5, 3, 2, 3] }] },
    aug: { shapes: [{ frets: [1, 0, 0, 3] }] },
    '6': { shapes: [{ frets: [0, 0, 0, 0] }] },
    m6: { shapes: [{ frets: [2, 3, 3, 3] }] },
    add9: { shapes: [{ frets: [0, 2, 0, 3] }] },
    '9': { shapes: [{ frets: [3, 2, 0, 3] }] },
  },

  'C#': {
    major: ukeEntry('C#', 'major'),
    m: ukeEntry('C#', 'm'),
    '7': ukeEntry('C#', '7'),
    m7: ukeEntry('C#', 'm7'),
    maj7: ukeEntry('C#', 'maj7'),
    sus4: ukeEntry('C#', 'sus4'),
    sus2: { shapes: [{ frets: [1, 3, 4, 4] }] },
    dim: { shapes: [{ frets: [0, 4, 3, 4] }] },
    aug: { shapes: [{ frets: [2, 1, 1, 0] }] },
    '6': { shapes: [{ frets: [1, 1, 1, 1] }] },
    m6: { shapes: [{ frets: [1, 1, 0, 1] }] },
    add9: { shapes: [{ frets: [1, 3, 1, 4] }] },
    '9': { shapes: [{ frets: [1, 1, 1, 2] }] },
  },

  D: {
    major: ukeEntry('D', 'major'),
    m: ukeEntry('D', 'm'),
    '7': ukeEntry('D', '7'),
    m7: ukeEntry('D', 'm7'),
    maj7: ukeEntry('D', 'maj7'),
    sus4: ukeEntry('D', 'sus4'),
    sus2: { shapes: [{ frets: [2, 2, 0, 0] }] },
    dim: { shapes: [{ frets: [7, 5, 4, 5] }] },
    aug: { shapes: [{ frets: [3, 2, 2, 1] }] },
    '6': { shapes: [{ frets: [2, 2, 2, 2] }] },
    m6: { shapes: [{ frets: [2, 2, 1, 2] }] },
    add9: { shapes: [{ frets: [2, 4, 2, 5] }] },
    '9': { shapes: [{ frets: [5, 4, 2, 5] }] },
  },

  'D#': {
    major: ukeEntry('D#', 'major'),
    m: ukeEntry('D#', 'm'),
    '7': ukeEntry('D#', '7'),
    m7: ukeEntry('D#', 'm7'),
    maj7: ukeEntry('D#', 'maj7'),
    sus4: ukeEntry('D#', 'sus4'),
    sus2: { shapes: [{ frets: [3, 3, 1, 1] }] },
    dim: { shapes: [{ frets: [2, 3, 2, 0] }] },
    aug: { shapes: [{ frets: [0, 3, 3, 2] }] },
    '6': { shapes: [{ frets: [3, 3, 3, 3] }] },
    m6: { shapes: [{ frets: [3, 3, 2, 3] }] },
    add9: { shapes: [{ frets: [0, 3, 1, 1] }] },
    '9': { shapes: [{ frets: [0, 3, 1, 4] }] },
  },

  E: {
    major: ukeEntry('E', 'major'),
    m: ukeEntry('E', 'm'),
    '7': ukeEntry('E', '7'),
    m7: ukeEntry('E', 'm7'),
    maj7: ukeEntry('E', 'maj7'),
    sus4: ukeEntry('E', 'sus4'),
    sus2: { shapes: [{ frets: [4, 4, 2, 2] }] },
    dim: { shapes: [{ frets: [0, 4, 0, 1] }] },
    aug: { shapes: [{ frets: [1, 0, 0, 3] }] },
    '6': { shapes: [{ frets: [4, 4, 4, 4] }] },
    m6: { shapes: [{ frets: [0, 1, 0, 2] }] },
    add9: { shapes: [{ frets: [1, 4, 2, 2] }] },
    '9': { shapes: [{ frets: [7, 6, 4, 7] }] },
  },

  F: {
    major: ukeEntry('F', 'major'),
    m: ukeEntry('F', 'm'),
    '7': ukeEntry('F', '7'),
    m7: ukeEntry('F', 'm7'),
    maj7: ukeEntry('F', 'maj7'),
    sus4: ukeEntry('F', 'sus4'),
    sus2: { shapes: [{ frets: [0, 0, 1, 3] }] },
    dim: { shapes: [{ frets: [4, 5, 4, 2] }] },
    aug: { shapes: [{ frets: [2, 1, 1, 0] }] },
    '6': { shapes: [{ frets: [2, 2, 1, 3] }] },
    m6: { shapes: [{ frets: [1, 2, 1, 3] }] },
    add9: { shapes: [{ frets: [0, 0, 1, 0] }] },
    '9': { shapes: [{ frets: [0, 3, 1, 0] }] },
  },

  'F#': {
    major: ukeEntry('F#', 'major'),
    m: ukeEntry('F#', 'm'),
    '7': ukeEntry('F#', '7'),
    m7: ukeEntry('F#', 'm7'),
    maj7: ukeEntry('F#', 'maj7'),
    sus4: ukeEntry('F#', 'sus4'),
    sus2: { shapes: [{ frets: [1, 1, 2, 4] }] },
    dim: { shapes: [{ frets: [2, 0, 2, 0] }] },
    aug: { shapes: [{ frets: [3, 2, 2, 1] }] },
    '6': { shapes: [{ frets: [3, 3, 2, 4] }] },
    m6: { shapes: [{ frets: [2, 3, 2, 4] }] },
    add9: { shapes: [{ frets: [1, 1, 2, 1] }] },
    '9': { shapes: [{ frets: [1, 4, 2, 1] }] },
  },

  G: {
    major: ukeEntry('G', 'major'),
    m: ukeEntry('G', 'm'),
    '7': ukeEntry('G', '7'),
    m7: ukeEntry('G', 'm7'),
    maj7: ukeEntry('G', 'maj7'),
    sus4: ukeEntry('G', 'sus4'),
    sus2: { shapes: [{ frets: [0, 2, 3, 0] }] },
    dim: { shapes: [{ frets: [3, 1, 3, 1] }] },
    aug: { shapes: [{ frets: [0, 3, 3, 2] }] },
    '6': { shapes: [{ frets: [0, 2, 0, 2] }] },
    m6: { shapes: [{ frets: [0, 2, 0, 1] }] },
    add9: { shapes: [{ frets: [0, 2, 5, 2] }] },
    '9': { shapes: [{ frets: [0, 5, 5, 2] }] },
  },

  'G#': {
    major: ukeEntry('G#', 'major'),
    m: ukeEntry('G#', 'm'),
    '7': ukeEntry('G#', '7'),
    m7: ukeEntry('G#', 'm7'),
    maj7: ukeEntry('G#', 'maj7'),
    sus4: ukeEntry('G#', 'sus4'),
    sus2: { shapes: [{ frets: [1, 3, 4, 1] }] },
    dim: { shapes: [{ frets: [4, 2, 4, 2] }] },
    aug: { shapes: [{ frets: [1, 0, 0, 3] }] },
    '6': { shapes: [{ frets: [1, 3, 1, 3] }] },
    m6: { shapes: [{ frets: [4, 5, 4, 6] }] },
    add9: { shapes: [{ frets: [3, 3, 4, 3] }] },
    '9': { shapes: [{ frets: [1, 0, 2, 1] }] },
  },

  A: {
    major: ukeEntry('A', 'major'),
    m: ukeEntry('A', 'm'),
    '7': ukeEntry('A', '7'),
    m7: ukeEntry('A', 'm7'),
    maj7: ukeEntry('A', 'maj7'),
    sus4: ukeEntry('A', 'sus4'),
    sus2: { shapes: [{ frets: [2, 4, 5, 2] }] },
    dim: { shapes: [{ frets: [2, 3, 5, 3] }] },
    aug: { shapes: [{ frets: [2, 1, 1, 4] }] },
    '6': { shapes: [{ frets: [2, 4, 2, 4] }] },
    m6: { shapes: [{ frets: [2, 4, 2, 3] }] },
    add9: { shapes: [{ frets: [2, 1, 0, 2] }] },
    '9': { shapes: [{ frets: [2, 1, 3, 2] }] },
  },

  'A#': {
    major: ukeEntry('A#', 'major'),
    m: ukeEntry('A#', 'm'),
    '7': ukeEntry('A#', '7'),
    m7: ukeEntry('A#', 'm7'),
    maj7: ukeEntry('A#', 'maj7'),
    sus4: ukeEntry('A#', 'sus4'),
    sus2: { shapes: [{ frets: [3, 0, 1, 1] }] },
    dim: { shapes: [{ frets: [3, 1, 0, 1] }] },
    aug: { shapes: [{ frets: [3, 2, 2, 1] }] },
    '6': { shapes: [{ frets: [0, 2, 1, 1] }] },
    m6: { shapes: [{ frets: [0, 1, 1, 1] }] },
    add9: { shapes: [{ frets: [3, 2, 1, 3] }] },
    '9': { shapes: [{ frets: [3, 2, 4, 3] }] },
  },

  B: {
    major: ukeEntry('B', 'major'),
    m: ukeEntry('B', 'm'),
    '7': ukeEntry('B', '7'),
    m7: ukeEntry('B', 'm7'),
    maj7: ukeEntry('B', 'maj7'),
    sus4: ukeEntry('B', 'sus4'),
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
