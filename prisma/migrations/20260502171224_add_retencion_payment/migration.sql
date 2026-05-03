-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'retencion';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "retentionCertNumber" TEXT,
ADD COLUMN     "retentionDate" TIMESTAMP(3),
ADD COLUMN     "retentionType" TEXT;
