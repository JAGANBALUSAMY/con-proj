-- AlterEnum
ALTER TYPE "TransferStatus" ADD VALUE 'CANCELLED';

-- DropIndex
DROP INDEX "SectionTransferRequest_operatorId_idx";

-- AlterTable
ALTER TABLE "SectionTransferRequest" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" INTEGER;

-- CreateIndex
CREATE INDEX "SectionAssignment_userId_idx" ON "SectionAssignment"("userId");

-- CreateIndex
CREATE INDEX "SectionAssignment_stage_idx" ON "SectionAssignment"("stage");

-- CreateIndex
CREATE INDEX "SectionTransferRequest_operatorId_status_idx" ON "SectionTransferRequest"("operatorId", "status");
