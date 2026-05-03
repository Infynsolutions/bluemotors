-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'used_vehicle';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "tradeInVehicleId" TEXT;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "isUsado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "mileage" INTEGER;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tradeInVehicleId_fkey" FOREIGN KEY ("tradeInVehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
