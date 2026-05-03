-- CreateTable
CREATE TABLE "patentamientos" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "fechaPresentacion" TIMESTAMP(3) NOT NULL,
    "seccional" TEXT NOT NULL,
    "numeroExpediente" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patentamientos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patentamientos_saleId_key" ON "patentamientos"("saleId");

-- AddForeignKey
ALTER TABLE "patentamientos" ADD CONSTRAINT "patentamientos_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
