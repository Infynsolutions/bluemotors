-- CreateTable
CREATE TABLE "entregas" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "fechaEntrega" TIMESTAMP(3) NOT NULL,
    "receptorNombre" TEXT NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entregas_saleId_key" ON "entregas"("saleId");

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
