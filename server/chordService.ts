import type { ChordLibrary, ChordQuality, ChordShape } from '../src/types/chord'
import { prisma } from './db'

const CANONICAL_ROOTS = [
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
] as const

const QUALITIES: ChordQuality[] = [
  'major',
  'm',
  '7',
  'm7',
  'maj7',
  'sus4',
  'sus2',
  'dim',
  'aug',
  '6',
  'm6',
  'add9',
  '9',
]

function emptyLibrary(): ChordLibrary {
  const lib = {} as ChordLibrary
  for (const r of CANONICAL_ROOTS) {
    const byType = {} as Record<ChordQuality, { shapes: ChordShape[] }>
    for (const q of QUALITIES) {
      byType[q] = { shapes: [] }
    }
    lib[r] = byType
  }
  return lib
}

export async function getChordLibrary(): Promise<ChordLibrary> {
  const chords = await prisma.chord.findMany({
    include: { shapes: { orderBy: { orderIndex: 'asc' } } },
  })
  const library = emptyLibrary()
  for (const chord of chords) {
    const root = chord.root as keyof ChordLibrary
    const type = chord.type as ChordQuality
    if (!(root in library)) continue
    library[root][type] = {
      shapes: chord.shapes.map(
        (s): ChordShape => ({
          frets: [s.g, s.c, s.e, s.a],
        }),
      ),
    }
  }
  return library
}

export async function getChordDetail(
  root: string,
  type: string,
): Promise<{ shapes: ChordShape[] }> {
  const chord = await prisma.chord.findUnique({
    where: { root_type: { root, type } },
    include: { shapes: { orderBy: { orderIndex: 'asc' } } },
  })
  if (!chord) {
    return { shapes: [] }
  }
  return {
    shapes: chord.shapes.map((s) => ({
      frets: [s.g, s.c, s.e, s.a],
    })),
  }
}

export async function replaceChordShapes(
  root: string,
  type: string,
  shapes: { frets: [number, number, number, number] }[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const chord = await tx.chord.upsert({
      where: { root_type: { root, type } },
      create: { root, type },
      update: {},
    })
    await tx.chordShape.deleteMany({ where: { chordId: chord.id } })
    for (let i = 0; i < shapes.length; i++) {
      const [g, c, e, a] = shapes[i].frets
      await tx.chordShape.create({
        data: {
          chordId: chord.id,
          orderIndex: i,
          g,
          c,
          e,
          a,
        },
      })
    }
  })
}
