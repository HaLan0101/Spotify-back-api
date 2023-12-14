-- AlterTable
ALTER TABLE "audios" ADD COLUMN     "lastListenedAt" TIMESTAMP(3),
ADD COLUMN     "listenCount" INTEGER NOT NULL DEFAULT 0;
