import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * 스키마에 Score를 추가한 뒤 `prisma generate`만 하고 프로세스를 재시작하지 않으면,
 * global에 붙은 예전 PrismaClient 인스턴스에는 `score` delegate가 없어 런타임에서 터질 수 있습니다.
 */
function prismaHasScoreDelegate(client: unknown): boolean {
  return typeof client === 'object' && client !== null && 'score' in client
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

const prismaSingleton = ((): PrismaClient => {
  const existing = globalForPrisma.prisma
  if (existing && prismaHasScoreDelegate(existing)) {
    return existing
  }
  if (existing) {
    void existing.$disconnect().catch(() => {})
    globalForPrisma.prisma = undefined
  }
  const created = createPrismaClient()
  globalForPrisma.prisma = created
  return created
})()

export const prisma = prismaSingleton
