-- AlterTable
ALTER TABLE "Cooperative" ADD COLUMN     "suspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "withdrawalsLocked" BOOLEAN NOT NULL DEFAULT false;
