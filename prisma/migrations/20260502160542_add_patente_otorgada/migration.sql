-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "dominio" TEXT;

-- CreateTable
CREATE TABLE "patente_otorgada" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "fechaOtorgamiento" TIMESTAMP(3) NOT NULL,
    "numeroDominio" TEXT NOT NULL,
    "preEntregaRealizada" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patente_otorgada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patente_otorgada_saleId_key" ON "patente_otorgada"("saleId");

-- AddForeignKey
ALTER TABLE "patente_otorgada" ADD CONSTRAINT "patente_otorgada_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
