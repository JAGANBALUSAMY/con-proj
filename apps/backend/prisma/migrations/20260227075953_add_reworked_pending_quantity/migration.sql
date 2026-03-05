/*
  Warnings:

  - A unique constraint covering the columns `[batchId]` on the table `Box` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "reworkedPendingQuantity" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Box_batchId_key" ON "Box"("batchId");
