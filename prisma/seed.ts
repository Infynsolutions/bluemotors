import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const COMPANY_BLUE_MOTORS = "empresa_blue_motors";
const COMPANY_GSI = "empresa_gsi";

async function main() {
  const hash = await bcrypt.hash("bluemotors2025", 10);

  // ── Empresas ─────────────────────────────────────────────────────────────
  await prisma.company.upsert({
    where: { id: COMPANY_BLUE_MOTORS },
    update: {},
    create: {
      id: COMPANY_BLUE_MOTORS,
      name: "Blue Motors",
    },
  });

  await prisma.company.upsert({
    where: { id: COMPANY_GSI },
    update: {},
    create: {
      id: COMPANY_GSI,
      name: "GSI",
    },
  });

  // Backfill: facturas y entradas sin empresa → Blue Motors
  await prisma.invoice.updateMany({
    where: { companyId: null },
    data: { companyId: COMPANY_BLUE_MOTORS },
  });
  await prisma.taxEntry.updateMany({
    where: { companyId: null },
    data: { companyId: COMPANY_BLUE_MOTORS },
  });

  await prisma.user.upsert({
    where: { email: "admin@bluemotors.com" },
    update: {},
    create: {
      name: "Admin Blue Motors",
      email: "admin@bluemotors.com",
      passwordHash: hash,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "gerente@bluemotors.com" },
    update: {},
    create: {
      name: "Gerente",
      email: "gerente@bluemotors.com",
      passwordHash: hash,
      role: "gerente",
    },
  });

  await prisma.user.upsert({
    where: { email: "vendedor@bluemotors.com" },
    update: {},
    create: {
      name: "Vendedor Demo",
      email: "vendedor@bluemotors.com",
      passwordHash: hash,
      role: "vendedor",
    },
  });

  // Vehículo de ejemplo para probar el Paso 1
  await prisma.vehicle.upsert({
    where: { vin: "LZWBBAH48MA123456" },
    update: {},
    create: {
      brand: "DFSK",
      model: "Glory 500",
      year: 2024,
      color: "Blanco",
      vin: "LZWBBAH48MA123456",
      price: 28500000,
      status: "available",
    },
  });

  console.log("Seed completado.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
