/*
  Warnings:

  - You are about to drop the column `lastMaintenanceDate` on the `Machine` table. All the data in the column will be lost.
  - You are about to drop the column `nextMaintenanceDate` on the `Machine` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Machine" DROP COLUMN "lastMaintenanceDate",
DROP COLUMN "nextMaintenanceDate";

-- AlterTable
ALTER TABLE "ProductionLog" ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedByUserId" INTEGER,
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
