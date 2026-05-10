import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { ImpuestosClient } from "@/features/impuestos/components/impuestos-client";
import type { TaxType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const RETENCION_TAX_MAP: Record<string, TaxType | null> = {
  "IVA": "IVA",
  "Ingresos Brutos": "IIBB",
  "Municipal": "TEM",
  "Ganancias": null,
  "Otro": null,
};

export type LedgerEntry = {
  id: string;
  date: Date;
  concept: string;
  debito: number;
  credito: number;
  origin: "auto_factura" | "auto_retencion" | "manual";
  deletable: boolean;
};

export type TaxSummary = {
  taxType: TaxType;
  label: string;
  entries: LedgerEntry[];
  saldoHistorico: number;
};

export type CompanyOption = { id: string; name: string };

export default async function ImpuestosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; periodo?: string; desde?: string; hasta?: string; empresa?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!["admin", "gerente"].includes(session.user.role)) redirect("/ventas");

  const { tab = "IVA", periodo = "mes", desde, hasta, empresa } = await searchParams;

  // ── Empresas disponibles ──────────────────────────────────────────────────
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });
  const activeCompanyId = empresa && companies.find((c) => c.id === empresa)
    ? empresa
    : companies[0]?.id ?? "empresa_blue_motors";

  // ── Rango de visualización ────────────────────────────────────────────────
  const now = new Date();
  let viewFrom: Date;
  let viewTo: Date = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  if (periodo === "mes") {
    viewFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (periodo === "rango" && desde && hasta) {
    viewFrom = new Date(desde);
    viewTo = new Date(`${hasta}T23:59:59`);
  } else {
    viewFrom = new Date(2000, 0, 1);
    viewTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  // ── Fetch data filtrado por empresa ───────────────────────────────────────
  const [invoices, retenciones, manualEntries] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId: activeCompanyId },
      select: {
        id: true,
        invoiceType: true,
        totalAmount: true,
        netAmount: true,
        vatAmount: true,
        createdAt: true,
        sale: { select: { client: { select: { name: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    // Retenciones: siempre de Blue Motors (son retenciones de ventas de vehículos)
    activeCompanyId === "empresa_blue_motors"
      ? prisma.payment.findMany({
          where: { type: "retencion" },
          select: {
            id: true,
            amount: true,
            retentionType: true,
            retentionDate: true,
            retentionCertNumber: true,
            sale: { select: { client: { select: { name: true } } } },
          },
          orderBy: { retentionDate: "asc" },
        })
      : Promise.resolve([]),
    prisma.taxEntry.findMany({
      where: { companyId: activeCompanyId },
      orderBy: { date: "asc" },
    }),
  ]);

  // ── Construir libro mayor por impuesto ─────────────────────────────────────
  const TAX_TYPES: { type: TaxType; label: string }[] = [
    { type: "IVA", label: "IVA" },
    { type: "IIBB", label: "Ingresos Brutos" },
    { type: "TEM", label: "TEM" },
  ];

  const summaries: TaxSummary[] = TAX_TYPES.map(({ type, label }) => {
    const entries: LedgerEntry[] = [];

    if (type === "IVA") {
      for (const inv of invoices) {
        const vat = Number(inv.vatAmount ?? 0);
        if (vat <= 0) continue;
        const clientName = inv.sale?.client?.name ?? "Sin cliente";
        entries.push({
          id: `inv-${inv.id}`,
          date: inv.createdAt,
          concept: `Factura emitida — ${clientName}`,
          debito: vat,
          credito: 0,
          origin: "auto_factura",
          deletable: false,
        });
      }
    }

    for (const ret of retenciones) {
      const taxForRet = RETENCION_TAX_MAP[ret.retentionType ?? ""] ?? null;
      if (taxForRet !== type) continue;
      const clientName = ret.sale?.client?.name ?? "Sin cliente";
      const cert = ret.retentionCertNumber ? ` — Cert. ${ret.retentionCertNumber}` : "";
      entries.push({
        id: `ret-${ret.id}`,
        date: ret.retentionDate ?? new Date(),
        concept: `Retención ${ret.retentionType} — ${clientName}${cert}`,
        debito: 0,
        credito: Number(ret.amount),
        origin: "auto_retencion",
        deletable: false,
      });
    }

    for (const e of manualEntries) {
      if (e.taxType !== type) continue;
      entries.push({
        id: e.id,
        date: e.date,
        concept: e.concept,
        debito: e.kind === "debito" ? Number(e.amount) : 0,
        credito: e.kind === "credito" ? Number(e.amount) : 0,
        origin: "manual",
        deletable: true,
      });
    }

    entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    const saldoHistorico = entries.reduce((s, e) => s + e.debito - e.credito, 0);

    return { taxType: type, label, entries, saldoHistorico };
  });

  const summariesFiltered = summaries.map((s) => ({
    ...s,
    entriesInPeriod: s.entries.filter((e) => e.date >= viewFrom && e.date <= viewTo),
  }));

  const summariesWithCarry = summariesFiltered.map((s) => {
    const saldoAnterior = s.entries
      .filter((e) => e.date < viewFrom)
      .reduce((acc, e) => acc + e.debito - e.credito, 0);
    return { ...s, saldoAnterior };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Impuestos</h1>
        <p className="text-sm text-muted-foreground">
          Libro mayor por impuesto — saldo acumulado con carry-forward mensual
        </p>
      </div>

      {/* Resumen general */}
      <div className="grid grid-cols-3 gap-4">
        {summariesWithCarry.map((s) => {
          const saldo = s.saldoHistorico;
          const aPagar = saldo > 0;
          const aFavor = saldo < 0;
          return (
            <div key={s.taxType} className={`rounded-xl border p-5 space-y-1 ${
              aPagar ? "border-red-200 bg-red-50/30" :
              aFavor ? "border-green-200 bg-green-50/30" : ""
            }`}>
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              <p className={`text-2xl font-bold ${
                aPagar ? "text-red-700" : aFavor ? "text-green-700" : ""
              }`}>
                {formatCurrency(Math.abs(saldo))}
              </p>
              <p className={`text-xs font-medium ${
                aPagar ? "text-red-600" : aFavor ? "text-green-600" : "text-muted-foreground"
              }`}>
                {aPagar ? "A pagar" : aFavor ? "Saldo a favor" : "Neutral"}
              </p>
            </div>
          );
        })}
      </div>

      <Suspense>
        <ImpuestosClient
          summaries={summariesWithCarry}
          activeTab={(["IVA", "IIBB", "TEM"].includes(tab) ? tab : "IVA") as TaxType}
          periodo={periodo}
          desde={desde ?? ""}
          hasta={hasta ?? ""}
          companies={companies.map((c) => ({ id: c.id, name: c.name }))}
          activeCompanyId={activeCompanyId}
        />
      </Suspense>
    </div>
  );
}
