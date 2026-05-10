import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { OrdenCompraAcciones } from "@/features/repuestos/components/orden-compra-acciones";

export const dynamic = "force-dynamic";

const STEPS = [
  { status: "DRAFT", label: "Borrador" },
  { status: "SENT", label: "Enviada" },
  { status: "INVOICED", label: "Factura cargada" },
  { status: "RECEIVED", label: "Recibida" },
  { status: "PAID", label: "Pagada" },
];

const STATUS_INDEX: Record<string, number> = {
  DRAFT: 0, SENT: 1, INVOICED: 2, RECEIVED: 3, PAID: 4,
};

export default async function OrdenCompraPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!["admin", "gerente"].includes(session.user.role)) redirect("/repuestos");

  const { orderId } = await params;

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    include: {
      supplier: true,
      items: { include: { part: { include: { category: true } } } },
      invoice: true,
      receipt: { include: { items: { include: { part: true } } } },
      payment: true,
    },
  });

  if (!order) notFound();

  const total = order.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
  const currentStep = STATUS_INDEX[order.status];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/repuestos/compras" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Órdenes
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-xl font-semibold">{order.orderNumber}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {order.supplier.name} · {order.createdAt.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={step.status} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                  done ? "bg-foreground border-foreground text-background" :
                  active ? "border-foreground text-foreground" :
                  "border-muted text-muted-foreground"
                }`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`text-xs mt-1 text-center whitespace-nowrap ${
                  active ? "font-semibold" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 ${done ? "bg-foreground" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Items */}
      <div className="rounded-xl border overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b">
          <p className="text-sm font-medium">Artículos</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/20">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Código</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Artículo</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Pedido</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">P. Unit.</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Subtotal</th>
              {order.receipt && (
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Recibido</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {order.items.map((item) => {
              const receiptItem = order.receipt?.items.find((r) => r.partId === item.partId);
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.part.code}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.part.name}</p>
                    <p className="text-xs text-muted-foreground">{item.part.category.name}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{item.quantity} {item.part.unit}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Number(item.unitPrice))}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatCurrency(Number(item.unitPrice) * item.quantity)}
                  </td>
                  {order.receipt && (
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={`font-medium ${
                        receiptItem && receiptItem.receivedQty < receiptItem.orderedQty
                          ? "text-amber-600" : ""
                      }`}>
                        {receiptItem?.receivedQty ?? 0} {item.part.unit}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t bg-muted/20">
            <tr>
              <td colSpan={order.receipt ? 4 : 3} className="px-4 py-3 text-right text-sm text-muted-foreground">
                Total
              </td>
              <td className="px-4 py-3 text-right font-bold tabular-nums">
                {formatCurrency(total)}
              </td>
              {order.receipt && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Datos de factura si existe */}
      {order.invoice && (
        <div className="rounded-xl border p-4 space-y-3">
          <p className="text-sm font-medium">Factura del proveedor</p>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="font-medium">Factura {order.invoice.invoiceType}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Número</p>
              <p className="font-medium">{order.invoice.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p>{order.invoice.invoiceDate.toLocaleDateString("es-AR")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold">{formatCurrency(Number(order.invoice.totalAmount))}</p>
            </div>
          </div>
          {order.invoice.invoiceType === "A" && order.invoice.vatAmount && (
            <div className="rounded-lg bg-blue-50/40 border border-blue-100 p-3 text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Neto gravado</span>
                <span className="tabular-nums">{formatCurrency(Number(order.invoice.netAmount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA 21% (crédito fiscal GSI)</span>
                <span className="tabular-nums text-blue-700 font-semibold">{formatCurrency(Number(order.invoice.vatAmount))}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Datos de pago si existe */}
      {order.payment && (
        <div className="rounded-xl border p-4 space-y-2">
          <p className="text-sm font-medium">Pago registrado</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Monto</p>
              <p className="font-semibold text-green-700">{formatCurrency(Number(order.payment.amount))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p>{order.payment.paymentDate.toLocaleDateString("es-AR")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Método</p>
              <p className="capitalize">{order.payment.method}</p>
            </div>
          </div>
          {order.payment.reference && (
            <p className="text-xs text-muted-foreground">Ref: {order.payment.reference}</p>
          )}
        </div>
      )}

      {/* Acciones según estado */}
      <OrdenCompraAcciones order={order} />
    </div>
  );
}
