import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SalesBoard } from "@/features/ventas/components/sales-board";
import { VentasFiltros } from "@/features/ventas/components/ventas-filtros";

export const dynamic = "force-dynamic";

const STEP_NAMES = [
  "Venta confirmada",
  "Alta de cliente",
  "Facturación",
  "Cobro",
  "Patentamiento",
  "Patente otorgada",
  "Entrega",
];

const CARDS = [
  {
    key: "todos",
    label: "Total de ventas",
    color: "border-slate-200 hover:border-slate-400",
    activeColor: "bg-slate-900 text-white border-slate-900",
  },
  {
    key: "cobro",
    label: "Pendientes de cobro",
    color: "border-amber-200 hover:border-amber-400",
    activeColor: "bg-amber-500 text-white border-amber-500",
  },
  {
    key: "patentamiento",
    label: "En patentamiento",
    color: "border-blue-200 hover:border-blue-400",
    activeColor: "bg-blue-600 text-white border-blue-600",
  },
  {
    key: "entregadas",
    label: "Entregadas",
    color: "border-green-200 hover:border-green-400",
    activeColor: "bg-green-600 text-white border-green-600",
  },
  {
    key: "canceladas",
    label: "Canceladas",
    color: "border-red-200 hover:border-red-400",
    activeColor: "bg-red-600 text-white border-red-600",
  },
] as const;

type EstadoKey = typeof CARDS[number]["key"];

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; periodo?: string; desde?: string; hasta?: string }>;
}) {
  const session = await auth();
  const { estado = "todos", periodo = "todos", desde, hasta } = await searchParams;

  // ── Filtro de fecha ──────────────────────────────────────────────────────────
  let dateWhere: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (periodo === "mes") {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    dateWhere = { createdAt: { gte: start, lte: end } };
  } else if (periodo === "rango" && desde && hasta) {
    dateWhere = {
      createdAt: {
        gte: new Date(desde),
        lte: new Date(`${hasta}T23:59:59`),
      },
    };
  }

  // ── Filtro de rol ────────────────────────────────────────────────────────────
  const roleWhere =
    session!.user.role === "vendedor"
      ? { vendorId: session!.user.id }
      : {};

  // ── Query: todas (activas + completadas) para los contadores ─────────────────
  const allSales = await prisma.sale.findMany({
    where: { ...roleWhere, ...dateWhere },
    include: {
      vendor: { select: { name: true } },
      client: { select: { id: true, name: true } },
      vehicle: { select: { id: true, brand: true, model: true, year: true, isPedido: true } },
      saleSteps: { orderBy: { stepNumber: "asc" } },
      payments: { select: { amount: true } },
      _count: { select: { documents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const salesWithStep = allSales.map(({ payments, ...sale }) => ({
    ...sale,
    currentStep: sale.status === "completed"
      ? 7
      : sale.saleSteps.filter((s) => s.status === "completed").length,
    salePrice: sale.salePrice ? Number(sale.salePrice) : null,
    totalPagado: payments.reduce((s, p) => s + Number(p.amount), 0),
    cancelReason: sale.cancelReason ?? null,
    cancelledAt: sale.cancelledAt ?? null,
  }));

  // ── Contadores para las cards ────────────────────────────────────────────────
  const counts: Record<EstadoKey, number> = {
    todos: salesWithStep.filter((s) => s.status === "active").length,
    cobro: salesWithStep.filter((s) => s.status === "active" && s.currentStep <= 3).length,
    patentamiento: salesWithStep.filter(
      (s) => s.status === "active" && (s.currentStep === 5 || s.currentStep === 6)
    ).length,
    entregadas: salesWithStep.filter((s) => s.status === "completed").length,
    canceladas: salesWithStep.filter((s) => s.status === "cancelled").length,
  };

  // ── Filtro de estado para la tabla ───────────────────────────────────────────
  const displaySales = salesWithStep.filter((s) => {
    if (estado === "cobro") return s.status === "active" && s.currentStep <= 3;
    if (estado === "patentamiento")
      return s.status === "active" && (s.currentStep === 5 || s.currentStep === 6);
    if (estado === "entregadas") return s.status === "completed";
    if (estado === "canceladas") return s.status === "cancelled";
    return s.status === "active"; // "todos" → solo activas
  });

  const activeEstado = (CARDS.find((c) => c.key === estado) ? estado : "todos") as EstadoKey;

  // Build current search params string (without estado) for card links
  const basePeriodParams = new URLSearchParams();
  if (periodo !== "todos") basePeriodParams.set("periodo", periodo);
  if (periodo === "rango" && desde) basePeriodParams.set("desde", desde);
  if (periodo === "rango" && hasta) basePeriodParams.set("hasta", hasta);
  const periodStr = basePeriodParams.toString();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Proceso de ventas</h1>
          <p className="text-sm text-muted-foreground">
            {displaySales.length} venta{displaySales.length !== 1 ? "s" : ""}
            {activeEstado !== "todos" && ` · ${CARDS.find((c) => c.key === activeEstado)?.label}`}
          </p>
        </div>
        <Suspense>
          <VentasFiltros />
        </Suspense>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-5 gap-3">
        {CARDS.map((card) => {
          const isActive = activeEstado === card.key;
          const href = `/ventas?estado=${card.key}${periodStr ? `&${periodStr}` : ""}`;
          return (
            <Link
              key={card.key}
              href={href}
              className={`rounded-xl border-2 p-4 text-center transition-all ${
                isActive ? card.activeColor : `bg-background ${card.color}`
              }`}
            >
              <div className={`text-3xl font-bold ${isActive ? "" : ""}`}>
                {counts[card.key]}
              </div>
              <div className={`text-xs mt-1 leading-tight ${isActive ? "opacity-80" : "text-muted-foreground"}`}>
                {card.label}
              </div>
            </Link>
          );
        })}
      </div>

      <SalesBoard
        sales={displaySales}
        stepNames={STEP_NAMES}
        role={session!.user.role}
        userId={session!.user.id}
      />
    </div>
  );
}
