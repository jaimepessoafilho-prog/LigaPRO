-- AlterTable
ALTER TABLE "matches" ADD COLUMN "proposedScheduledAt" TIMESTAMP(3);
ALTER TABLE "matches" ADD COLUMN "proposedCourtNumber" INTEGER;
ALTER TABLE "matches" ADD COLUMN "dateProposedById" TEXT;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_dateProposedById_fkey" FOREIGN KEY ("dateProposedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
