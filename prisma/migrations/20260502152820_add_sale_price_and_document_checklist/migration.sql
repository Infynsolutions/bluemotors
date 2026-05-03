-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "receivedBy" TEXT,
ALTER COLUMN "fileKey" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "salePrice" DECIMAL(12,2);

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
