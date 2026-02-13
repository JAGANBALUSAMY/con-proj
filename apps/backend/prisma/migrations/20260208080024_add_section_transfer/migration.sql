-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "SectionTransferRequest" (
    "id" SERIAL NOT NULL,
    "operatorId" INTEGER NOT NULL,
    "fromSection" "ProductionStage" NOT NULL,
    "toSection" "ProductionStage" NOT NULL,
    "requestedBy" INTEGER NOT NULL,
    "targetManagerId" INTEGER NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" INTEGER,
    "rejectionReason" TEXT,

    CONSTRAINT "SectionTransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SectionTransferRequest_operatorId_idx" ON "SectionTransferRequest"("operatorId");

-- CreateIndex
CREATE INDEX "SectionTransferRequest_targetManagerId_status_idx" ON "SectionTransferRequest"("targetManagerId", "status");

-- CreateIndex
CREATE INDEX "SectionTransferRequest_requestedBy_idx" ON "SectionTransferRequest"("requestedBy");

-- AddForeignKey
ALTER TABLE "SectionTransferRequest" ADD CONSTRAINT "SectionTransferRequest_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionTransferRequest" ADD CONSTRAINT "SectionTransferRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionTransferRequest" ADD CONSTRAINT "SectionTransferRequest_targetManagerId_fkey" FOREIGN KEY ("targetManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionTransferRequest" ADD CONSTRAINT "SectionTransferRequest_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
