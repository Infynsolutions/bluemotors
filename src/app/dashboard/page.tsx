import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { DashboardFiltros } from "@/components/dashboard-filtros";

export const dynamic = "force-dynamic";

const STEP_NAMES = [
  "Venta confirmada",
  "Alta de cliente",
  "Carga de venta",
  "Facturación",
  "Patentamiento",
  "Patente otorgada",
  "Entrega",
];

const FUNNEL_STAGES = [
  { label: "Venta confirmada",    steps: [0, 1, 2, 3], color: "bg-foreground" },
  { label: "Cobrado",             steps: [4],          color: "bg-foreground" },
  { label: "Patentamiento",       steps: [5],          color: "bg-foreground" },
  { label: "Pendiente de entrega",steps: [6],          color: "bg-amber-500"  },
  { label: "Entregada",           steps: [7],          color: "bg-green-600"  },
];

function pct(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function delta(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string }>;
}) {
  const { periodo = "todos", desde, hasta } = await searchParams;
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const staleThreshold = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  // ── Filtro de fecha ──────────────────────────────────────────────────────────
  let dateWhere: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (periodo === "mes") {
    dateWhere = { createdAt: { gte: startOfThisMonth } };
  } else if (periodo === "rango" && desde && hasta) {
    dateWhere = { createdAt: { gte: new Date(desde), lte: new Date(`${hasta}T23:59:59`) } };
  }

  // Fecha where para postventa/repuestos (misma lógica que ventas)
  const servicioDateWhere = periodo === "mes"
    ? { createdAt: { gte: startOfThisMonth } }
    : periodo === "rango" && desde && hasta
    ? { createdAt: { gte: new Date(desde), lte: new Date(`${hasta}T23:59:59`) } }
    : {};

  const [
    salesThisMonth,
    salesLastMonth,
    activeSales,
    allVehicles,
    staleSales,
    vendorSales,
    serviceInvoicesPeriod,
    serviceInvoicesLastMonth,
    partSalesPeriod,
    partSalesLastMonth,
    fichasActivas,
    repuestosBajoStock,
    cuentaCorrienteDeuda,
    cuentaCorrientePagos,
  ] = await Promise.all([
    // Ventas del período seleccionado
    prisma.sale.findMany({
      where: { ...dateWhere },
      select: { salePrice: true, status: true },
    }),
    // Ventas del mes anterior (para deltas)
    prisma.sale.findMany({
      where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      select: { salePrice: true },
    }),
    // Ventas activas + completadas con sus pasos (embudo)
    prisma.sale.findMany({
      where: { status: { in: ["active", "completed"] } },
      include: {
        saleSteps: { select: { status: true } },
        client: { select: { name: true } },
        vehicle: { select: { brand: true, model: true, year: true } },
      },
    }),
    // Stock vehículos
    prisma.vehicle.findMany({
      select: { status: true, isUsado: true, isPedido: true },
    }),
    // Ventas estancadas
    prisma.sale.findMany({
      where: {
        status: "active",
        OR: [
          { lastStepUpdatedAt: { lt: staleThreshold } },
          { lastStepUpdatedAt: null, createdAt: { lt: staleThreshold } },
        ],
      },
      include: {
        client: { select: { name: true } },
        vehicle: { select: { brand: true, model: true, year: true } },
        saleSteps: { select: { status: true } },
      },
      orderBy: { lastStepUpdatedAt: "asc" },
    }),
    // Ranking vendedores del período
    prisma.sale.findMany({
      where: { ...dateWhere },
      select: { salePrice: true, vendor: { select: { name: true } } },
    }),
    // Facturas de servicio (postventa) del período
    prisma.serviceInvoice.findMany({
      where: { ...servicioDateWhere },
      select: { totalAmount: true, status: true },
    }),
    // Facturas de servicio del mes anterior
    prisma.serviceInvoice.findMany({
      where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      select: { totalAmount: true },
    }),
    // Ventas de repuestos del período
    prisma.partSale.findMany({
      where: { status: { not: "CANCELLED" }, ...servicioDateWhere },
      select: { totalAmount: true, status: true },
    }),
    // Ventas de repuestos del mes anterior
    prisma.partSale.findMany({
      where: { status: { not: "CANCELLED" }, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      select: { totalAmount: true },
    }),
    // Fichas activas de postventa
    prisma.serviceOrder.groupBy({
      by: ["status"],
      where: { status: { notIn: ["CANCELLED", "CLOSED"] } },
      _count: true,
    }),
    // Repuestos con stock bajo o sin stock
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM parts
      WHERE active = true AND (stock = 0 OR ("minStock" > 0 AND stock <= "minStock"))
    `.then((r) => Number(r[0].count)),
    // Cuenta corriente: total deudas pendientes
    prisma.$queryRaw<[{ total: string }]>`
      SELECT COALESCE(SUM(t.amount), 0) AS total
      FROM (
        SELECT si."totalAmount" AS amount
        FROM service_invoices si
        WHERE si.status::text = 'PENDING' AND si."paymentMethod" = 'cuenta_corriente'
        UNION ALL
        SELECT ps."totalAmount" AS amount
        FROM part_sales ps
        WHERE ps.status::text = 'PENDING' AND ps."paymentMethod" = 'cuenta_corriente'
      ) t
    `.then((r) => Number(r[0].total)),
    // Cuenta corriente: total pagos registrados
    prisma.$queryRaw<[{ total: string }]>`
      SELECT COALESCE(SUM(amount), 0) AS total FROM cuenta_corriente_pagos
    `.then((r) => Number(r[0].total)),
  ]);

  // ── Métricas ─────────────────────────────────────────────────────────────────
  const activeSalesCount = activeSales.filter((s) => s.status === "active").length;
  const cntThis = salesThisMonth.filter((s) => s.status !== "cancelled").length;
  const cntLast = salesLastMonth.length;
  const montoThis = salesThisMonth
    .filter((s) => s.status !== "cancelled")
    .reduce((s, v) => s + Number(v.salePrice ?? 0), 0);
  const montoLast = salesLastMonth.reduce((s, v) => s + Number(v.salePrice ?? 0), 0);
  const ticketThis = cntThis > 0 ? montoThis / cntThis : 0;
  const ticketLast = cntLast > 0 ? montoLast / cntLast : 0;

  // Deltas solo aplican cuando el período es "mes" (comparando contra el mes anterior)
  const showDeltas = periodo === "mes" || periodo === "todos";
  const deltaVentas = showDeltas ? delta(cntThis, cntLast) : null;
  const deltaMonto = showDeltas ? delta(montoThis, montoLast) : null;
  const deltaTicket = showDeltas ? delta(ticketThis, ticketLast) : null;

  // ── Embudo ───────────────────────────────────────────────────────────────────
  const salesWithStep = activeSales.map((s) => ({
    ...s,
    currentStep: s.status === "completed"
      ? 7
      : s.saleSteps.filter((st) => st.status === "completed").length,
  }));
  const funnelCounts = FUNNEL_STAGES.map(({ steps }) =>
    salesWithStep.filter((s) => steps.includes(s.currentStep)).length
  );
  const funnelMax = Math.max(...funnelCounts, 1);

  // ── Stock ─────────────────────────────────────────────────────────────────────
  const stock0kmDisp = allVehicles.filter((v) => !v.isUsado && !v.isPedido && v.status === "available").length;
  const stock0kmRes  = allVehicles.filter((v) => !v.isUsado && !v.isPedido && v.status === "reserved").length;
  const stock0kmVend = allVehicles.filter((v) => !v.isUsado && !v.isPedido && v.status === "sold").length;
  const stockUsados  = allVehicles.filter((v) => v.isUsado && v.status === "available").length;
  const stockPedidos = allVehicles.filter((v) => v.isPedido).length;

  // ── Ranking vendedores ────────────────────────────────────────────────────────
  const vendorMap = new Map<string, { name: string; count: number; monto: number }>();
  for (const s of vendorSales) {
    const prev = vendorMap.get(s.vendor.name) ?? { name: s.vendor.name, count: 0, monto: 0 };
    vendorMap.set(s.vendor.name, {
      name: s.vendor.name,
      count: prev.count + 1,
      monto: prev.monto + Number(s.salePrice ?? 0),
    });
  }
  const ranking = Array.from(vendorMap.values()).sort((a, b) => b.count - a.count);
  const rankingMax = Math.max(...ranking.map((r) => r.count), 1);

  // ── Servicios (postventa + repuestos) ────────────────────────────────────────
  const montoPostventa = serviceInvoicesPeriod
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + Number(i.totalAmount), 0);
  const montoPostventaLast = serviceInvoicesLastMonth
    .reduce((s, i) => s + Number(i.totalAmount), 0);

  const montoRepuestos = partSalesPeriod
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + Number(i.totalAmount), 0);
  const montoRepuestosLast = partSalesLastMonth
    .reduce((s, i) => s + Number(i.totalAmount), 0);

  const fichasActivasCount = fichasActivas.reduce((s, g) => s + g._count, 0);
  const fichasMap = Object.fromEntries(fichasActivas.map((g) => [g.status, g._count]));

  const deltaPostventa = showDeltas ? delta(montoPostventa, montoPostventaLast) : null;
  const deltaRepuestos = showDeltas ? delta(montoRepuestos, montoRepuestosLast) : null;

  // ── Cuenta corriente ──────────────────────────────────────────────────────────
  const saldoCuentaCorriente = cuentaCorrienteDeuda - cuentaCorrientePagos;

  // ── Estancadas ────────────────────────────────────────────────────────────────
  const staleWithStep = staleSales.map((s) => ({
    ...s,
    currentStep: s.saleSteps.filter((st) => st.status === "completed").length,
    daysStale: Math.floor((Date.now() - new Date(s.lastStepUpdatedAt ?? s.createdAt).getTime()) / 86400000),
  }));

  const periodoLabel =
    periodo === "mes"
      ? now.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
      : periodo === "rango" && desde && hasta
      ? `${desde} — ${hasta}`
      : "Todos los períodos";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{periodoLabel}</p>
        </div>
        <Suspense>
          <DashboardFiltros />
        </Suspense>
      </div>

      {/* ── Ventas de vehículos ── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ventas de vehículos</h2>
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="Ventas del período"
            value={cntThis.toString()}
            sub={`${cntLast} el mes pasado`}
            delta={deltaVentas}
          />
          <MetricCard
            label="Monto total"
            value={formatCurrency(montoThis)}
            sub={formatCurrency(montoLast) + " el mes pasado"}
            delta={deltaMonto}
          />
          <MetricCard
            label="Ticket promedio"
            value={ticketThis > 0 ? formatCurrency(ticketThis) : "—"}
            sub={ticketLast > 0 ? formatCurrency(ticketLast) + " el mes pasado" : ""}
            delta={deltaTicket}
          />
          <MetricCard
            label="Ventas activas"
            value={activeSalesCount.toString()}
            sub="en proceso"
            delta={null}
            neutral
          />
        </div>
      </div>

      {/* ── Servicios: Postventa + Repuestos + Cta. cte. ── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Servicios y repuestos</h2>
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="Postventa cobrado"
            value={formatCurrency(montoPostventa)}
            sub={formatCurrency(montoPostventaLast) + " el mes pasado"}
            delta={deltaPostventa}
          />
          <MetricCard
            label="Ventas repuestos"
            value={formatCurrency(montoRepuestos)}
            sub={formatCurrency(montoRepuestosLast) + " el mes pasado"}
            delta={deltaRepuestos}
          />
          {/* Cuenta corriente */}
          <a href="/cuenta-corriente" className="rounded-xl border p-5 space-y-1 hover:bg-muted/30 transition-colors block">
            <p className="text-xs text-muted-foreground">Cta. corriente pendiente</p>
            <p className={`text-2xl font-bold ${saldoCuentaCorriente > 0 ? "text-red-600" : ""}`}>
              {formatCurrency(saldoCuentaCorriente)}
            </p>
            <p className="text-xs text-muted-foreground">
              {saldoCuentaCorriente > 0 ? "a cobrar → ver clientes" : "sin saldo pendiente"}
            </p>
          </a>
          {/* Fichas postventa activas */}
          <div className="rounded-xl border p-5 space-y-3">
            <p className="text-xs text-muted-foreground">Fichas postventa activas</p>
            <p className="text-2xl font-bold">{fichasActivasCount}</p>
            <div className="space-y-1">
              {[
                { key: "PENDING",          label: "Sin turno",     color: "bg-muted" },
                { key: "APPOINTMENT_SET",  label: "Con turno",     color: "bg-blue-400" },
                { key: "IN_TRANSIT",       label: "En traslado",   color: "bg-amber-400" },
                { key: "AT_WORKSHOP",      label: "En taller",     color: "bg-purple-400" },
                { key: "COMPLETED",        label: "Trabajo listo", color: "bg-green-400" },
              ].filter((s) => fichasMap[s.key] > 0).map((s) => (
                <div key={s.key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${s.color}`} />
                    <span className="text-muted-foreground">{s.label}</span>
                  </div>
                  <span className="font-semibold">{fichasMap[s.key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Alerta stock bajo (si hay) ── */}
      {(repuestosBajoStock as number) > 0 && (
        <a
          href="/repuestos"
          className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-amber-600 text-lg">⚠</span>
            <div>
              <p className="text-sm font-medium text-amber-800">Stock bajo o sin stock en repuestos</p>
              <p className="text-xs text-amber-600">Revisá el inventario antes de recibir nuevas fichas</p>
            </div>
          </div>
          <span className="text-amber-700 font-bold tabular-nums">{repuestosBajoStock as number} artículos →</span>
        </a>
      )}

      {/* ── Embudo + Stock ── */}
      <div className="grid grid-cols-3 gap-6">
        {/* Embudo */}
        <div className="col-span-2 rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-sm">Embudo de ventas <span className="font-normal text-muted-foreground">(activas por paso)</span></h2>
          <div className="space-y-3">
            {FUNNEL_STAGES.map(({ label }, i) => {
              const count = funnelCounts[i];
              const isLast = i === FUNNEL_STAGES.length - 1;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-32 shrink-0 text-right">{label}</span>
                  <div className="flex-1 bg-muted rounded-full h-7 overflow-hidden">
                    <div
                      className={`h-full rounded-full flex items-center justify-end pr-2.5 transition-all ${isLast ? "bg-green-600" : "bg-foreground"}`}
                      style={{ width: `${Math.max(pct(count, funnelMax), count > 0 ? 8 : 0)}%` }}
                    >
                      {count > 0 && (
                        <span className="text-xs font-bold text-background">{count}</span>
                      )}
                    </div>
                  </div>
                  {count === 0 && <span className="text-xs text-muted-foreground w-4">0</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stock vehículos */}
        <div className="rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-sm">Stock vehículos</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">0 km</p>
              <div className="space-y-1.5">
                <StockRow label="Disponibles" value={stock0kmDisp} color="bg-green-500" />
                <StockRow label="Reservados"  value={stock0kmRes}  color="bg-amber-400" />
                <StockRow label="Vendidos"    value={stock0kmVend} color="bg-slate-300" />
              </div>
            </div>
            <div className="border-t pt-3 space-y-1.5">
              <StockRow label="Usados disponibles" value={stockUsados}  color="bg-blue-400" />
              <StockRow label="Por pedido"          value={stockPedidos} color="bg-violet-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Ranking + Alertas ── */}
      <div className="grid grid-cols-2 gap-6">
        {/* Ranking vendedores */}
        <div className="rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-sm">
            Ranking vendedores{" "}
            <span className="font-normal text-muted-foreground">({periodoLabel})</span>
          </h2>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin ventas en este período.</p>
          ) : (
            <div className="space-y-3">
              {ranking.map((v, i) => (
                <div key={v.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <span className="font-medium">{v.name}</span>
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {v.count} venta{v.count !== 1 ? "s" : ""} · {formatCurrency(v.monto)}
                    </span>
                  </div>
                  <div className="bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-foreground rounded-full"
                      style={{ width: `${pct(v.count, rankingMax)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ventas estancadas */}
        <div className="rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-sm">
            Ventas estancadas{" "}
            <span className="font-normal text-muted-foreground">(+5 días sin avanzar)</span>
          </h2>
          {staleWithStep.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <span className="text-lg">✓</span> Todas las ventas están al día.
            </div>
          ) : (
            <ul className="space-y-2">
              {staleWithStep.map((s) => (
                <li key={s.id} className="flex items-start justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">
                      {s.vehicle.brand} {s.vehicle.model} {s.vehicle.year}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.client?.name ?? "Sin cliente"} · Paso {s.currentStep + 1}: {STEP_NAMES[s.currentStep] ?? "—"}
                    </p>
                  </div>
                  <span className="text-amber-700 font-semibold text-xs shrink-0 ml-3">
                    {s.daysStale}d ⚠
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, delta, neutral,
}: {
  label: string;
  value: string;
  sub: string;
  delta: number | null;
  neutral?: boolean;
}) {
  const isPositive = delta !== null && delta > 0;
  const isNegative = delta !== null && delta < 0;

  return (
    <div className="rounded-xl border p-5 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      <div className="flex items-center gap-2">
        {!neutral && delta !== null && (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
            isPositive ? "bg-green-100 text-green-700" :
            isNegative ? "bg-red-100 text-red-700" :
            "bg-muted text-muted-foreground"
          }`}>
            {isPositive ? "+" : ""}{delta}%
          </span>
        )}
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function StockRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
