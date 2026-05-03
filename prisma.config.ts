import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // DIRECT_URL: Supabase direct connection (bypasses pgBouncer) — used for migrations only
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
