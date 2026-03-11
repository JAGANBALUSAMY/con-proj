-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductionStage" AS ENUM ('CUTTING', 'STITCHING', 'QUALITY_CHECK', 'REWORK', 'LABELING', 'FOLDING', 'PACKING');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('OPERATIONAL', 'MAINTENANCE', 'OUT_OF_ORDER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReworkStage" AS ENUM ('CUTTING', 'STITCHING');

-- CreateEnum
CREATE TYPE "ReworkOutcome" AS ENUM ('CURED', 'SCRAPPED');

-- CreateEnum
CREATE TYPE "ReworkStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BoxStatus" AS ENUM ('PACKED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" INTEGER,
    "verifiedByUserId" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" SERIAL NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIReport" (
    "id" SERIAL NOT NULL,
    "filterHash" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "reportText" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" INTEGER NOT NULL,

    CONSTRAINT "AIReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionAssignment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "stage" "ProductionStage" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" SERIAL NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "briefTypeName" TEXT NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "usableQuantity" INTEGER NOT NULL DEFAULT 0,
    "defectiveQuantity" INTEGER NOT NULL DEFAULT 0,
    "reworkedPendingQuantity" INTEGER NOT NULL DEFAULT 0,
    "pendingQCQuantity" INTEGER NOT NULL DEFAULT 0,
    "scrappedQuantity" INTEGER NOT NULL DEFAULT 0,
    "currentStage" "ProductionStage" NOT NULL DEFAULT 'CUTTING',
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" SERIAL NOT NULL,
    "machineCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "status" "MachineStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionLog" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "stage" "ProductionStage" NOT NULL,
    "operatorUserId" INTEGER NOT NULL,
    "recordedByUserId" INTEGER NOT NULL,
    "machineId" INTEGER,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "quantityIn" INTEGER NOT NULL,
    "quantityOut" INTEGER,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedByUserId" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectRecord" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "stage" "ProductionStage" NOT NULL DEFAULT 'QUALITY_CHECK',
    "reworkStage" "ReworkStage",
    "defectCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "severity" "Severity" NOT NULL,
    "detectedByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefectRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReworkRecord" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "reworkStage" "ReworkStage" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "operatorUserId" INTEGER NOT NULL,
    "managedByUserId" INTEGER NOT NULL,
    "status" "ReworkStatus" NOT NULL DEFAULT 'PENDING',
    "outcome" "ReworkOutcome",
    "curedQuantity" INTEGER NOT NULL DEFAULT 0,
    "scrappedQuantity" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedByUserId" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReworkRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Box" (
    "id" SERIAL NOT NULL,
    "boxCode" TEXT NOT NULL,
    "batchId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "BoxStatus" NOT NULL DEFAULT 'PACKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Box_pkey" PRIMARY KEY ("id")
);

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
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" INTEGER,
    "rejectionReason" TEXT,

    CONSTRAINT "SectionTransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeCode_key" ON "User"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_reportDate_key" ON "DailyReport"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "AIReport_filterHash_key" ON "AIReport"("filterHash");

-- CreateIndex
CREATE INDEX "SectionAssignment_userId_idx" ON "SectionAssignment"("userId");

-- CreateIndex
CREATE INDEX "SectionAssignment_stage_idx" ON "SectionAssignment"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "SectionAssignment_userId_stage_key" ON "SectionAssignment"("userId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_batchNumber_key" ON "Batch"("batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_machineCode_key" ON "Machine"("machineCode");

-- CreateIndex
CREATE UNIQUE INDEX "Box_boxCode_key" ON "Box"("boxCode");

-- CreateIndex
CREATE UNIQUE INDEX "Box_batchId_key" ON "Box"("batchId");

-- CreateIndex
CREATE INDEX "SectionTransferRequest_operatorId_status_idx" ON "SectionTransferRequest"("operatorId", "status");

-- CreateIndex
CREATE INDEX "SectionTransferRequest_targetManagerId_status_idx" ON "SectionTransferRequest"("targetManagerId", "status");

-- CreateIndex
CREATE INDEX "SectionTransferRequest_requestedBy_idx" ON "SectionTransferRequest"("requestedBy");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReport" ADD CONSTRAINT "AIReport_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionAssignment" ADD CONSTRAINT "SectionAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_operatorUserId_fkey" FOREIGN KEY ("operatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectRecord" ADD CONSTRAINT "DefectRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectRecord" ADD CONSTRAINT "DefectRecord_detectedByUserId_fkey" FOREIGN KEY ("detectedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReworkRecord" ADD CONSTRAINT "ReworkRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReworkRecord" ADD CONSTRAINT "ReworkRecord_operatorUserId_fkey" FOREIGN KEY ("operatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReworkRecord" ADD CONSTRAINT "ReworkRecord_managedByUserId_fkey" FOREIGN KEY ("managedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReworkRecord" ADD CONSTRAINT "ReworkRecord_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Box" ADD CONSTRAINT "Box_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionTransferRequest" ADD CONSTRAINT "SectionTransferRequest_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionTransferRequest" ADD CONSTRAINT "SectionTransferRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionTransferRequest" ADD CONSTRAINT "SectionTransferRequest_targetManagerId_fkey" FOREIGN KEY ("targetManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionTransferRequest" ADD CONSTRAINT "SectionTransferRequest_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
