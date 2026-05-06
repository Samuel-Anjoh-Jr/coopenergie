/*
  Warnings:

  - A unique constraint covering the columns `[campayRegistrationRef]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "campayRegistrationRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_campayRegistrationRef_key" ON "Vendor"("campayRegistrationRef");
