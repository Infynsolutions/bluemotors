-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('IVA', 'IIBB', 'TEM');

-- CreateEnum
CREATE TYPE "TaxEntryKind" AS ENUM ('debito', 'credito');

-- CreateTable
CREATE TABLE "tax_entries" (
    "id" TEXT NOT NULL,
    "taxType" "TaxType" NOT NULL,
    "kind" "TaxEntryKind" NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "tax_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tax_entries" ADD CONSTRAINT "tax_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
