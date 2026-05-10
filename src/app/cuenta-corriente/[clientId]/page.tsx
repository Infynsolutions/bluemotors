import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { RegistrarAbonoDialog } from "@/features/cuenta-corriente/components/registrar-abono-dialog";
import { SaldarFacturaBtn, SaldarVentaBtn } from "@/features/cuenta-corriente/components/saldar-deuda-btn";

export const dynamic = "force-dynamic";

const PAYMENT_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  debito: "Débito",
  credito: "Crédito",
  cheque: "Cheque",
};

export default async function CuentaCorrienteClientePage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { clientId } = await params;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) notFound();

  const [serviceInvoices, partSales, pagos] = await Promise.all([
    prisma.serviceInvoice.findMany({
      where: {
        paymentMethod: "cuenta_corriente",
        status: "PENDING",
        serviceOrder: { clientId },
      },
      include: {
        serviceOrder: {
          select: { id: true, vehicleDominio: true, motivo: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.partSale.findMany({
      where: { paymentMethod: "cuenta_corriente", status: "PENDING", clientId },
      include: { items: { include: { part: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.cuentaCorrientePago.findMany({
      where: { clientId },
      orderBy: { date: "asc" },
    }),
  ]);

  const totalDeuda =
    serviceInvoices.reduce((s, i) => s + Number(i.totalAmount), 0) +
    partSales.reduce((s, p) => s + Number(p.totalAmount), 0);

  const totalPagos = pagos.reduce((s, p) => s + Number(p.amount), 0);
  const saldo = totalDeuda - totalPagos;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Link href="/cuenta-corriente" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Cuenta corriente
          </Link>
        </div>
        <h1 className="text-xl font-semibold mt-1">{client.name}</h1>
        {client.phone && <p className="text-sm text-muted-foreground">{client.phone}</p>}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Deuda total</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{formatCurrency(totalDeuda)}</p>
          <p className="text-xs text-muted-foreground">{serviceInvoices.length + partSales.length} comprobantes</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Pagos realizados</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totalPagos)}</p>
          <p className="text-xs text-muted-foreground">{pagos.length} abonos</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
          <p className={`text-2xl font-bold mt-1 ${saldo > 0 ? "text-red-600" : "text-green-600"}`}>
            {formatCurrency(saldo)}
          </p>
          <p className="text-xs text-muted-foreground">{saldo <= 0 ? "Al día" : "A cobrar"}</p>
        </div>
      </div>

      {/* Acción */}
      <div className="flex justify-end">
        <RegistrarAbonoDialog clientId={clientId} clientName={client.name} />
      </div>

      {/* Deudas postventa */}
      {serviceInvoices.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Facturas de servicio pendientes</h2>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vehículo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Motivo</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Importe</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {serviceInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {inv.createdAt.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{inv.serviceOrder.vehicleDominio}</td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[160px]">{inv.serviceOrder.motivo}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(Number(inv.totalAmount))}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/postventa/${inv.serviceOrderId}`}
                          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
                          Ver
                        </Link>
                        <SaldarFacturaBtn invoiceId={inv.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deudas repuestos */}
      {partSales.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Ventas de repuestos pendientes</h2>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Número</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Artículos</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Importe</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {partSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {sale.createdAt.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{sale.saleNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {sale.items.map((i) => `${i.part.name} ×${i.quantity}`).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(Number(sale.totalAmount))}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/repuestos/ventas`}
                          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
                          Ver
                        </Link>
                        <SaldarVentaBtn saleId={sale.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagos registrados */}
      {pagos.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Abonos registrados</h2>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Método</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notas</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pagos.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {p.date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {PAYMENT_LABEL[p.paymentMethod] ?? p.paymentMethod}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.notes ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-green-600">
                      +{formatCurrency(Number(p.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                    Total abonado
                  </td>
                  <td className="px-4 py-2 text-right font-bold tabular-nums text-green-600">
                    +{formatCurrency(totalPagos)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {serviceInvoices.length === 0 && partSales.length === 0 && pagos.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm rounded-lg border">
          No hay movimientos registrados.
        </div>
      )}
    </div>
  );
}
