-- DropForeignKey
ALTER TABLE "ranking_points" DROP CONSTRAINT "ranking_points_eventId_fkey";

-- AlterTable
ALTER TABLE "ranking_points" ALTER COLUMN "eventId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ranking_points" ADD CONSTRAINT "ranking_points_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
