-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('FISICA', 'JURIDICA');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "city" TEXT,
ADD COLUMN     "clientType" "ClientType" NOT NULL DEFAULT 'FISICA',
ADD COLUMN     "email" TEXT,
ADD COLUMN     "ivaCondition" TEXT,
ADD COLUMN     "legalRepresentative" TEXT,
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "profession" TEXT,
ADD COLUMN     "province" TEXT,
ALTER COLUMN "dni" DROP NOT NULL;
