import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { NuevaOrdenCompraDialog } from "@/components/nueva-orden-compra-dialog";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  INVOICED: "Facturada",
  RECEIVED: "Recibida",
  PAID: "Pagada",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-100 text-blue-700",
  INVOICED: "bg-amber-100 text-amber-700",
  RECEIVED: "bg-purple-100 text-purple-700",
  PAID: "bg-green-100 text-green-700",
};

export default async function ComprasPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!["admin", "gerente"].includes(session.user.role)) redirect("/repuestos");

  const [orders, suppliers, parts] = await Promise.all([
    prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: true,
        invoice: true,
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.part.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Órdenes de compra</h1>
          <p className="text-sm text-muted-foreground">{orders.length} órdenes</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/repuestos" className="h-9 px-4 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors flex items-center">
            ← Repuestos
          </Link>
          <NuevaOrdenCompraDialog suppliers={suppliers} parts={parts} />
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm rounded-lg border">
          No hay órdenes de compra.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">N° Orden</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Proveedor</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Items</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => {
                const total = o.items.reduce(
                  (s, i) => s + Number(i.unitPrice) * i.quantity,
                  0
                );
                return (
                  <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{o.orderNumber}</td>
                    <td className="px-4 py-3">{o.supplier.name}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {o.createdAt.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{o.items.length}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatCurrency(total)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[o.status]}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/repuestos/compras/${o.id}`}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
