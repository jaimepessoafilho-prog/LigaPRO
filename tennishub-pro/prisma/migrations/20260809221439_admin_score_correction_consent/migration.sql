-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "correctionConfirmedA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "correctionConfirmedB" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "correctionContestedAt" TIMESTAMP(3),
ADD COLUMN     "correctionContestedById" TEXT,
ADD COLUMN     "correctionPendingSets" JSONB,
ADD COLUMN     "correctionPendingWinnerId" TEXT,
ADD COLUMN     "correctionProposedAt" TIMESTAMP(3),
ADD COLUMN     "correctionProposedById" TEXT;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_correctionProposedById_fkey" FOREIGN KEY ("correctionProposedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_correctionContestedById_fkey" FOREIGN KEY ("correctionContestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
