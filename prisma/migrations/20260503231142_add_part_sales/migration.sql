-- CreateEnum
CREATE TYPE "PartSaleStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "part_sales" (
    "id" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "notes" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "invoiceType" "InvoiceType",
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "netAmount" DECIMAL(12,2),
    "vatAmount" DECIMAL(12,2),
    "status" "PartSaleStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "paymentDate" TIMESTAMP(3),
    "companyId" TEXT NOT NULL DEFAULT 'empresa_gsi',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "part_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "part_sales_saleNumber_key" ON "part_sales"("saleNumber");

-- AddForeignKey
ALTER TABLE "part_sales" ADD CONSTRAINT "part_sales_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_sales" ADD CONSTRAINT "part_sales_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_sales" ADD CONSTRAINT "part_sales_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_sale_items" ADD CONSTRAINT "part_sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "part_sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_sale_items" ADD CONSTRAINT "part_sale_items_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
