-- CreateEnum
CREATE TYPE "VendorPaymentModel" AS ENUM ('ONE_TIME', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "VendorSubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING');

-- CreateEnum
CREATE TYPE "VendorAccountStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'SUSPENDED', 'SUBSCRIPTION_EXPIRED');

-- AlterEnum
ALTER TYPE "ProposalType" ADD VALUE 'VENDOR_PURCHASE';

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "vendorMonthlyFeeXAF" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vendorOneTimeFeeXAF" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vendorPaymentModel" "VendorPaymentModel" NOT NULL DEFAULT 'ONE_TIME',
ADD COLUMN     "vendorYearlyFeeXAF" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "withdrawalFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT,
    "coverImageUrl" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CM',
    "email" TEXT,
    "whatsappNumber" TEXT,
    "website" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "twitterUrl" TEXT,
    "linkedinUrl" TEXT,
    "status" "VendorAccountStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentModel" "VendorPaymentModel" NOT NULL DEFAULT 'ONE_TIME',
    "rankScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorProduct" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceXAF" INTEGER NOT NULL,
    "unit" TEXT,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VendorProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalVendorLink" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "productId" TEXT,
    "note" TEXT,

    CONSTRAINT "ProposalVendorLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorReview" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "cooperativeId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorSubscriptionRecord" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "priceXAF" INTEGER NOT NULL,
    "status" "VendorSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "campayReference" TEXT,
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorSubscriptionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_userId_key" ON "Vendor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_slug_key" ON "Vendor"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalVendorLink_proposalId_key" ON "ProposalVendorLink"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorReview_reviewerId_proposalId_key" ON "VendorReview"("reviewerId", "proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorSubscriptionRecord_campayReference_key" ON "VendorSubscriptionRecord"("campayReference");

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorProduct" ADD CONSTRAINT "VendorProduct_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorProductImage" ADD CONSTRAINT "VendorProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "VendorProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVendorLink" ADD CONSTRAINT "ProposalVendorLink_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVendorLink" ADD CONSTRAINT "ProposalVendorLink_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVendorLink" ADD CONSTRAINT "ProposalVendorLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "VendorProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReview" ADD CONSTRAINT "VendorReview_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorSubscriptionRecord" ADD CONSTRAINT "VendorSubscriptionRecord_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
