import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Runs daily at 9am via Vercel Cron (vercel.json)
// Sends alert when a sale has had no step movement for >5 days
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  const staleSales = await prisma.sale.findMany({
    where: {
      status: "active",
      lastStepUpdatedAt: { lt: fiveDaysAgo },
    },
    include: {
      vendor: { select: { name: true, email: true } },
      client: { select: { name: true } },
      vehicle: { select: { brand: true, model: true } },
    },
  });

  // TODO: send email via Resend to admin + gerente
  // For now, just log the count
  console.log(`[cron/stale-sales] Found ${staleSales.length} stale sales`);

  return NextResponse.json({ stale: staleSales.length });
}
