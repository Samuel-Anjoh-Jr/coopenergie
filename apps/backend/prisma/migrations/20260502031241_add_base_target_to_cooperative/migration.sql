-- AlterTable
ALTER TABLE "Cooperative" ADD COLUMN     "baseTargetXAF" INTEGER;

-- AlterTable
ALTER TABLE "WithdrawalRequest" ADD COLUMN     "platformFeeXAF" INTEGER NOT NULL DEFAULT 0;
