import { prisma } from "./db.js";

type ChordShape = { frets: [number, number, number, number] };
type ChordLibrary = Record<string, Record<string, { shapes: ChordShape[] }>>;

const CANONICAL_ROOTS = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

export type ChordTypeRecord = {
  id: string;
  key: string;
  label: string;
  orderIndex: number;
  aliases: string[];
};

const INITIAL_CHORD_TYPES: Omit<ChordTypeRecord, "id">[] = [
  { key: "major", label: "",      orderIndex: 0,  aliases: [] },
  { key: "m",     label: "m",     orderIndex: 1,  aliases: [] },
  { key: "7",     label: "7",     orderIndex: 2,  aliases: [] },
  { key: "m7",    label: "m7",    orderIndex: 3,  aliases: [] },
  { key: "maj7",  label: "maj7",  orderIndex: 4,  aliases: [] },
  { key: "mM7",   label: "mM7",   orderIndex: 5,  aliases: ["mMaj7", "minMaj7"] },
  { key: "sus4",  label: "sus4",  orderIndex: 6,  aliases: [] },
  { key: "sus2",  label: "sus2",  orderIndex: 7,  aliases: [] },
  { key: "dim",   label: "dim",   orderIndex: 8,  aliases: [] },
  { key: "aug",   label: "aug",   orderIndex: 9,  aliases: [] },
  { key: "6",     label: "6",     orderIndex: 10, aliases: [] },
  { key: "m6",    label: "m6",    orderIndex: 11, aliases: [] },
  { key: "add9",  label: "add9",  orderIndex: 12, aliases: [] },
  { key: "9",     label: "9",     orderIndex: 13, aliases: [] },
];

export async function seedChordTypesIfEmpty(): Promise<void> {
  const count = await prisma.chordType.count();
  if (count > 0) return;
  await prisma.chordType.createMany({
    data: INITIAL_CHORD_TYPES,
    skipDuplicates: true,
  });
}

export async function getChordTypes(): Promise<ChordTypeRecord[]> {
  return prisma.chordType.findMany({ orderBy: { orderIndex: "asc" } });
}

export async function createChordType(
  key: string,
  label: string,
  orderIndex: number,
  aliases: string[],
): Promise<ChordTypeRecord> {
  return prisma.chordType.create({ data: { key, label, orderIndex, aliases } });
}

export async function getChordLibrary(): Promise<ChordLibrary> {
  const [chordTypes, chords] = await Promise.all([
    prisma.chordType.findMany({ orderBy: { orderIndex: "asc" } }),
    prisma.chord.findMany({
      include: { shapes: { orderBy: { orderIndex: "asc" } } },
    }),
  ]);

  const qualityKeys = chordTypes.map((ct) => ct.key);

  const library: ChordLibrary = {};
  for (const r of CANONICAL_ROOTS) {
    const byType: Record<string, { shapes: ChordShape[] }> = {};
    for (const key of qualityKeys) byType[key] = { shapes: [] };
    library[r] = byType;
  }

  for (const chord of chords) {
    const { root, type } = chord;
    if (!(root in library)) continue;
    if (!(type in library[root]!)) library[root]![type] = { shapes: [] };
    library[root]![type] = {
      shapes: chord.shapes.map((s): ChordShape => ({
        frets: [s.g, s.c, s.e, s.a],
      })),
    };
  }

  return library;
}

export async function getChordDetail(
  root: string,
  type: string,
): Promise<{ shapes: ChordShape[] }> {
  const chord = await prisma.chord.findUnique({
    where: { root_type: { root, type } },
    include: { shapes: { orderBy: { orderIndex: "asc" } } },
  });
  if (!chord) return { shapes: [] };
  return {
    shapes: chord.shapes.map((s) => ({
      frets: [s.g, s.c, s.e, s.a] as [number, number, number, number],
    })),
  };
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
    });
    await tx.chordShape.deleteMany({ where: { chordId: chord.id } });
    for (let i = 0; i < shapes.length; i++) {
      const [g, c, e, a] = shapes[i]!.frets;
      await tx.chordShape.create({
        data: { chordId: chord.id, orderIndex: i, g: g!, c: c!, e: e!, a: a! },
      });
    }
  });
}
