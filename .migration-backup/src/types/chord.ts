export type CanonicalRootName =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B'

export type RootName =
  | 'C'
  | 'C#'
  | 'Db'
  | 'D'
  | 'D#'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab'
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B'

export type ChordQuality =
  | 'major'
  | 'm'
  | '7'
  | 'm7'
  | 'maj7'
  | 'sus4'
  | 'sus2'
  | 'dim'
  | 'aug'
  | '6'
  | 'm6'
  | 'add9'
  | '9'

/** 저장 순서 [G, C, E, A] */
export type Frets = [number, number, number, number]

export interface ChordShape {
  frets: Frets
}

export interface ChordEntry {
  shapes: ChordShape[]
}

export type ChordLibrary = Record<
  CanonicalRootName,
  Record<ChordQuality, ChordEntry>
>
