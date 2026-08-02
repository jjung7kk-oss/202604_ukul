import type { Prisma } from '@prisma/client'
import { prisma } from './db.js'

const NOTATION_JSON_MAX_BYTES = 120_000

export type ScoreVerseInput = {
  label: string
  lyrics: string
}

export type SaveScoreInput = {
  scoreId?: string
  userId: string
  title: string
  artist: string
  sharedChordText: string
  verses: ScoreVerseInput[]
  /** 악보 기호(JSON 객체). 생략 시 기존 악보는 필드 유지 */
  notation?: unknown
}

export type StoredScore = {
  id: string
  userId: string
  title: string
  artist: string
  sharedChordText: string
  notation: Prisma.JsonValue
  createdAt: Date
  updatedAt: Date
  verses: { id: string; orderIndex: number; label: string; lyrics: string }[]
}

export class ScoreServiceError extends Error {
  code: 'BAD_REQUEST' | 'NOT_FOUND' | 'FORBIDDEN'

  constructor(code: 'BAD_REQUEST' | 'NOT_FOUND' | 'FORBIDDEN', message: string) {
    super(message)
    this.code = code
  }
}

function normalizeVerses(verses: ScoreVerseInput[]): ScoreVerseInput[] {
  return verses.slice(0, 4).map((verse, index) => ({
    label: verse.label?.trim() || `${index + 1}절`,
    lyrics: typeof verse.lyrics === 'string' ? verse.lyrics : '',
  }))
}

function notationToDb(raw: unknown): Prisma.InputJsonValue {
  if (raw == null) return {}
  let value: unknown = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw) as unknown
    } catch {
      throw new ScoreServiceError('BAD_REQUEST', '악보 기호(JSON) 형식이 올바르지 않습니다.')
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ScoreServiceError('BAD_REQUEST', '악보 기호는 JSON 객체여야 합니다.')
  }
  let encoded: string
  try {
    encoded = JSON.stringify(value)
  } catch {
    throw new ScoreServiceError('BAD_REQUEST', '악보 기호를 직렬화할 수 없습니다.')
  }
  if (encoded.length > NOTATION_JSON_MAX_BYTES) {
    throw new ScoreServiceError('BAD_REQUEST', '악보 기호 데이터가 너무 큽니다.')
  }
  return value as Prisma.InputJsonValue
}

function shapeScore(score: {
  id: string
  userId: string
  title: string
  artist: string
  sharedChordText: string
  notation: Prisma.JsonValue
  createdAt: Date
  updatedAt: Date
  verses: { id: string; orderIndex: number; label: string; lyrics: string }[]
}): StoredScore {
  return {
    ...score,
    verses: [...score.verses].sort((a, b) => a.orderIndex - b.orderIndex),
  }
}

export async function listScoresByUser(userId: string) {
  const rows = await prisma.score.findMany({
    where: { userId },
    orderBy: [{ updatedAt: 'desc' }],
    include: { verses: { orderBy: [{ orderIndex: 'asc' }] } },
  })
  return rows.map(shapeScore)
}

export async function deleteScore(scoreId: string, userId: string): Promise<void> {
  const existing = await prisma.score.findUnique({
    where: { id: scoreId },
    select: { userId: true },
  })
  if (!existing) throw new ScoreServiceError('NOT_FOUND', '악보를 찾을 수 없습니다.')
  if (existing.userId !== userId) throw new ScoreServiceError('FORBIDDEN', '다른 사용자의 악보입니다.')
  await prisma.score.delete({ where: { id: scoreId } })
}

export async function saveScore(input: SaveScoreInput) {
  const title = input.title.trim()
  if (!title) throw new ScoreServiceError('BAD_REQUEST', '제목을 입력해 주세요.')
  const artist = input.artist.trim()
  const normalizedVerses = normalizeVerses(input.verses)
  if (normalizedVerses.length === 0) {
    throw new ScoreServiceError('BAD_REQUEST', '최소 1개의 절이 필요합니다.')
  }
  const sharedChordText =
    typeof input.sharedChordText === 'string' ? input.sharedChordText : ''
  const notationUpdate =
    input.notation !== undefined ? notationToDb(input.notation) : undefined

  if (input.scoreId) {
    const existing = await prisma.score.findUnique({
      where: { id: input.scoreId },
      select: { id: true, userId: true },
    })
    if (!existing) throw new ScoreServiceError('NOT_FOUND', '악보를 찾을 수 없습니다.')
    if (existing.userId !== input.userId) throw new ScoreServiceError('FORBIDDEN', '다른 사용자의 악보입니다.')

    const updated = await prisma.$transaction(async (tx) => {
      await tx.score.update({
        where: { id: input.scoreId },
        data: {
          title,
          artist,
          sharedChordText,
          ...(notationUpdate !== undefined ? { notation: notationUpdate } : {}),
        },
      })
      await tx.scoreVerse.deleteMany({ where: { scoreId: input.scoreId } })
      await tx.scoreVerse.createMany({
        data: normalizedVerses.map((verse, index) => ({
          scoreId: input.scoreId!,
          orderIndex: index,
          label: verse.label,
          lyrics: verse.lyrics,
        })),
      })
      return tx.score.findUniqueOrThrow({
        where: { id: input.scoreId },
        include: { verses: { orderBy: [{ orderIndex: 'asc' }] } },
      })
    })
    return shapeScore(updated)
  }

  const created = await prisma.score.create({
    data: {
      userId: input.userId,
      title,
      artist,
      sharedChordText,
      notation: notationUpdate ?? {},
      verses: {
        create: normalizedVerses.map((verse, index) => ({
          orderIndex: index,
          label: verse.label,
          lyrics: verse.lyrics,
        })),
      },
    },
    include: { verses: { orderBy: [{ orderIndex: 'asc' }] } },
  })
  return shapeScore(created)
}
