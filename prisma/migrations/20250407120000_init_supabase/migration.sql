-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Chord" (
    "id" TEXT NOT NULL,
    "root" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChordShape" (
    "id" TEXT NOT NULL,
    "chordId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "g" INTEGER NOT NULL,
    "c" INTEGER NOT NULL,
    "e" INTEGER NOT NULL,
    "a" INTEGER NOT NULL,

    CONSTRAINT "ChordShape_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Chord_root_type_key" ON "Chord"("root", "type");

-- CreateIndex
CREATE INDEX "ChordShape_chordId_orderIndex_idx" ON "ChordShape"("chordId", "orderIndex");

-- AddForeignKey
ALTER TABLE "ChordShape" ADD CONSTRAINT "ChordShape_chordId_fkey" FOREIGN KEY ("chordId") REFERENCES "Chord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
