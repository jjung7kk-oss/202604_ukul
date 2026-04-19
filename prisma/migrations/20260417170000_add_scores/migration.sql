-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sharedChordText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreVerse" (
    "id" TEXT NOT NULL,
    "scoreId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "lyrics" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ScoreVerse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Score_userId_updatedAt_idx" ON "Score"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ScoreVerse_scoreId_orderIndex_idx" ON "ScoreVerse"("scoreId", "orderIndex");

-- AddForeignKey
ALTER TABLE "ScoreVerse" ADD CONSTRAINT "ScoreVerse_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "Score"("id") ON DELETE CASCADE ON UPDATE CASCADE;
