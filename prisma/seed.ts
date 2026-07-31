import { PrismaClient } from '@prisma/client'
import { chordLibrary, QUALITY_ORDER } from '../src/data/chordData'
import type { CanonicalRootName } from '../src/types/chord'

const prisma = new PrismaClient()

async function main() {
  let synced = 0

  for (const root of Object.keys(chordLibrary) as CanonicalRootName[]) {
    const byQuality = chordLibrary[root]
    for (const { key: type } of QUALITY_ORDER) {
      const entry = byQuality[type]
      const shapes = entry?.shapes?.slice(0, 4) ?? []

      const chord = await prisma.chord.upsert({
        where: { root_type: { root, type } },
        create: { root, type },
        update: {},
      })

      await prisma.chordShape.deleteMany({ where: { chordId: chord.id } })
      for (let orderIndex = 0; orderIndex < shapes.length; orderIndex++) {
        const [g, c, e, a] = shapes[orderIndex]!.frets
        await prisma.chordShape.create({
          data: { chordId: chord.id, orderIndex, g, c, e, a },
        })
      }

      synced += 1
    }
  }

  console.log(`Synced ${synced} chord entries from chordLibrary.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
