import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { NuevaVentaRepuestosDialog } from "@/components/nueva-venta-repuestos-dialog";
import { cancelarVenta } from "@/app/actions/venta-repuestos";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function VentasRepuestosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { estado } = await searchParams;
  const isAdmin = ["admin", "gerente"].includes(session.user.role);

  const [sales, parts, clients] = await Promise.all([
    prisma.partSale.findMany({
      where: estado ? { status: estado as never } : { status: { not: "CANCELLED" } },
      include: {
        items: { include: { part: { select: { code: true, name: true, unit: true } } } },
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.part.findMany({
      where: { active: true, stock: { gt: 0 } },
      select: { id: true, code: true, name: true, unit: true, salePrice: true, stock: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedParts = parts.map((p) => ({ ...p, salePrice: Number(p.salePrice) }));

  const counts = await prisma.partSale.groupBy({ by: ["status"], _count: true });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Ventas de repuestos</h1>
          <p className="text-sm text-muted-foreground">
            {(countMap["PENDING"] ?? 0) + (countMap["PAID"] ?? 0)} ventas activas
          </p>
        </div>
        <Suspense>
          <NuevaVentaRepuestosDialog parts={serializedParts} clients={clients} />
        </Suspense>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: undefined, label: "Todas (activas)" },
          { key: "PENDING", label: `Pendientes (${countMap["PENDING"] ?? 0})` },
          { key: "PAID", label: `Pagadas (${countMap["PAID"] ?? 0})` },
          { key: "CANCELLED", label: `Canceladas (${countMap["CANCELLED"] ?? 0})` },
        ].map(({ key, label }) => {
          const active = estado === key || (!estado && !key);
          return (
            <a key={label} href={key ? `/repuestos/ventas?estado=${key}` : "/repuestos/ventas"}
              className={`h-8 px-3 rounded-lg text-sm font-medium border transition-colors ${
                active ? "bg-foreground text-background border-foreground" : "border-input text-muted-foreground hover:bg-muted"
              }`}>
              {label}
            </a>
          );
        })}
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm rounded-lg border">
          No hay ventas{estado ? " en este estado" : ""}.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">N°</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ítems</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Factura</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pago</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                {isAdmin && <th className="px-4 py-3 w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{s.saleNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {s.createdAt.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 font-medium">{s.client?.name ?? s.clientName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {s.items.map((i) => `${i.quantity} × ${i.part.name}`).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {s.invoiceNumber ? `${s.invoiceType} ${s.invoiceNumber}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatCurrency(Number(s.totalAmount))}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                    {s.paymentMethod?.replace("_", " ") ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[s.status]}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {s.status !== "CANCELLED" && (
                        <form action={async () => { "use server"; await cancelarVenta(s.id); }}>
                          <button type="submit"
                            className="text-xs text-muted-foreground hover:text-red-600 transition-colors">
                            Cancelar
                          </button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
