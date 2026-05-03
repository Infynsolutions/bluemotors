-- AlterTable
ALTER TABLE "purchase_invoices" ADD COLUMN     "invoiceType" "InvoiceType" NOT NULL DEFAULT 'B',
ADD COLUMN     "netAmount" DECIMAL(12,2),
ADD COLUMN     "vatAmount" DECIMAL(12,2);
