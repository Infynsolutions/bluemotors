import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NuevaFichaPostventaDialog } from "@/features/postventa/components/nueva-ficha-postventa-dialog";
import { PostventaFiltros } from "@/features/postventa/components/postventa-filtros";

export const dynamic = "force-dynamic";

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Sin turno",
  APPOINTMENT_SET: "Turno agendado",
  IN_TRANSIT: "En traslado",
  AT_WORKSHOP: "En taller",
  COMPLETED: "Trabajo listo",
  CLOSED: "Cerrado",
  CANCELLED: "Cancelado",
};

export const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  APPOINTMENT_SET: "bg-blue-100 text-blue-700",
  IN_TRANSIT: "bg-amber-100 text-amber-700",
  AT_WORKSHOP: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-green-100 text-green-700",
  CLOSED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function PostventaPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; desde?: string; hasta?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { estado, q, desde, hasta } = await searchParams;

  const desdeDate = desde ? new Date(desde) : undefined;
  const hastaDate = hasta ? new Date(`${hasta}T23:59:59`) : undefined;

  const [orders, clients, vehicles] = await Promise.all([
    prisma.serviceOrder.findMany({
      where: {
        ...(estado ? { status: estado as never } : { status: { not: "CANCELLED" } }),
        ...(q ? {
          OR: [
            { clientName: { contains: q, mode: "insensitive" } },
            { vehicleDominio: { contains: q, mode: "insensitive" } },
          ],
        } : {}),
        ...(desdeDate || hastaDate ? {
          createdAt: {
            ...(desdeDate ? { gte: desdeDate } : {}),
            ...(hastaDate ? { lte: hastaDate } : {}),
          },
        } : {}),
      },
      include: {
        client: { select: { name: true } },
        appointment: true,
        workOrder: { select: { moNumber: true, totalAmount: true } },
        invoice: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({ select: { id: true, name: true, phone: true, email: true }, orderBy: { name: "asc" } }),
    prisma.vehicle.findMany({
      where: { dominio: { not: null } },
      select: { id: true, brand: true, model: true, year: true, dominio: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const counts = await prisma.serviceOrder.groupBy({
    by: ["status"],
    where: { status: { not: "CANCELLED" } },
    _count: true,
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  const ACTIVE_STATES = ["PENDING", "APPOINTMENT_SET", "IN_TRANSIT", "AT_WORKSHOP", "COMPLETED"];
  const activeCount = ACTIVE_STATES.reduce((s, k) => s + (countMap[k] ?? 0), 0);

  // Build href for status cards preserving q/desde/hasta
  function estadoHref(key: string) {
    const p = new URLSearchParams();
    if (estado === key) {
      // toggle off — remove estado, keep other filters
    } else {
      p.set("estado", key);
    }
    if (q) p.set("q", q);
    if (desde) p.set("desde", desde);
    if (hasta) p.set("hasta", hasta);
    const qs = p.toString();
    return qs ? `/postventa?${qs}` : "/postventa";
  }

  const hasFilters = !!(q || desde || hasta);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Postventa</h1>
          <p className="text-sm text-muted-foreground">{activeCount} fichas activas</p>
        </div>
        <Suspense>
          <NuevaFichaPostventaDialog clients={clients} vehicles={vehicles} />
        </Suspense>
      </div>

      {/* Resumen de estados */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          { key: "APPOINTMENT_SET", label: "Con turno" },
          { key: "IN_TRANSIT", label: "En traslado" },
          { key: "AT_WORKSHOP", label: "En taller" },
          { key: "COMPLETED", label: "Listos" },
          { key: "CLOSED", label: "Cerrados" },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={estadoHref(key)}
            className={`rounded-xl border p-4 text-center transition-colors hover:bg-muted/50 ${
              estado === key ? "bg-foreground text-background border-foreground" : ""
            }`}
          >
            <p className={`text-2xl font-bold ${estado === key ? "text-background" : ""}`}>
              {countMap[key] ?? 0}
            </p>
            <p className={`text-xs mt-0.5 ${estado === key ? "text-background/70" : "text-muted-foreground"}`}>
              {label}
            </p>
          </Link>
        ))}
      </div>

      {/* Filtros */}
      <Suspense>
        <PostventaFiltros />
      </Suspense>

      {/* Tabla */}
      {orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm rounded-lg border">
          No hay fichas{estado ? " en este estado" : hasFilters ? " con esos filtros" : ""}.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patente</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vehículo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Motivo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Turno</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">MO</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{o.client?.name ?? o.clientName}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{o.vehicleDominio}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{o.vehicleDesc}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-muted-foreground">{o.motivo}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                    {o.appointment
                      ? o.appointment.scheduledDate.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {o.workOrder?.moNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                    {o.invoice?.status === "PENDING" && (
                      <span className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-amber-100 text-amber-700">
                        $ pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/postventa/${o.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
