import { prisma } from './db.js'

export type ScoreVerseInput = {
  label: string
  lyrics: string
}

export type SaveScoreInput = {
  scoreId?: string
  userId: string
  title: string
  sharedChordText: string
  verses: ScoreVerseInput[]
}

export type StoredScore = {
  id: string
  userId: string
  title: string
  sharedChordText: string
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

function shapeScore(score: {
  id: string
  userId: string
  title: string
  sharedChordText: string
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
    include: {
      verses: {
        orderBy: [{ orderIndex: 'asc' }],
      },
    },
  })
  return rows.map(shapeScore)
}

export async function saveScore(input: SaveScoreInput) {
  const title = input.title.trim()
  if (!title) {
    throw new ScoreServiceError('BAD_REQUEST', '제목을 입력해 주세요.')
  }
  const normalizedVerses = normalizeVerses(input.verses)
  if (normalizedVerses.length === 0) {
    throw new ScoreServiceError('BAD_REQUEST', '최소 1개의 절이 필요합니다.')
  }

  const sharedChordText =
    typeof input.sharedChordText === 'string' ? input.sharedChordText : ''

  if (input.scoreId) {
    const existing = await prisma.score.findUnique({
      where: { id: input.scoreId },
      select: { id: true, userId: true },
    })
    if (!existing) {
      throw new ScoreServiceError('NOT_FOUND', '악보를 찾을 수 없습니다.')
    }
    if (existing.userId !== input.userId) {
      throw new ScoreServiceError('FORBIDDEN', '다른 사용자의 악보입니다.')
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.score.update({
        where: { id: input.scoreId },
        data: {
          title,
          sharedChordText,
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
        include: {
          verses: {
            orderBy: [{ orderIndex: 'asc' }],
          },
        },
      })
    })
    return shapeScore(updated)
  }

  const created = await prisma.score.create({
    data: {
      userId: input.userId,
      title,
      sharedChordText,
      verses: {
        create: normalizedVerses.map((verse, index) => ({
          orderIndex: index,
          label: verse.label,
          lyrics: verse.lyrics,
        })),
      },
    },
    include: {
      verses: {
        orderBy: [{ orderIndex: 'asc' }],
      },
    },
  })
  return shapeScore(created)
}
