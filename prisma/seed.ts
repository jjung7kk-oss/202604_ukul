import { PrismaClient } from '@prisma/client'
import { chordLibrary, QUALITY_ORDER } from '../src/data/chordData'
import type { CanonicalRootName } from '../src/types/chord'

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.chord.count()
  if (count > 0) {
    console.log('Database already seeded, skipping.')
    return
  }

  for (const root of Object.keys(chordLibrary) as CanonicalRootName[]) {
    const byQuality = chordLibrary[root]
    for (const { key: type } of QUALITY_ORDER) {
      const entry = byQuality[type]
      const shapes = entry?.shapes?.slice(0, 4) ?? []
      await prisma.chord.create({
        data: {
          root,
          type,
          shapes: {
            create: shapes.map((s, orderIndex) => {
              const [g, c, e, a] = s.frets
              return { orderIndex, g, c, e, a }
            }),
          },
        },
      })
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
