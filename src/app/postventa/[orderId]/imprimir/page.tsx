import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function ImprimirPostventaPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { orderId } = await params;

  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    include: {
      client: true,
      appointment: true,
      workOrder: { include: { items: true } },
      invoice: true,
    },
  });

  if (!order) notFound();

  return (
    <div className="min-h-screen bg-white p-8 print:p-0">
      <style>{`
        @media print {
          body { font-size: 12px; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      {/* Print button */}
      <div className="no-print flex justify-between items-center mb-6">
        <a href={`/postventa/${order.id}`} className="text-sm text-gray-500 hover:text-gray-800">
          ← Volver al detalle
        </a>
        <PrintButton />
      </div>

      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Blue Motors / GSI</h1>
            <p className="text-sm text-gray-600">Orden de servicio</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Fecha</p>
            <p className="font-semibold">
              {order.createdAt.toLocaleDateString("es-AR", {
                day: "2-digit", month: "2-digit", year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Cliente y vehículo */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Solicitante</p>
          <p className="font-semibold text-lg">{order.client?.name ?? order.clientName}</p>
          {order.clientPhone && <p className="text-sm text-gray-600">Tel: {order.clientPhone}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Vehículo</p>
          <p className="font-semibold font-mono text-lg">{order.vehicleDominio}</p>
          <p className="text-sm text-gray-600">{order.vehicleDesc}</p>
        </div>
      </div>

      {/* Motivo */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Descripción del servicio</p>
        <p className="text-sm">{order.motivo}</p>
      </div>

      {/* Turno */}
      {order.appointment && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Turno</p>
          <p className="text-sm">
            {order.appointment.scheduledDate.toLocaleDateString("es-AR", {
              weekday: "long", day: "2-digit", month: "long", year: "numeric",
            })}
            {" — "}
            {order.appointment.scheduledDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      )}

      {/* Orden de trabajo */}
      {order.workOrder && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Detalle del trabajo — {order.workOrder.moNumber}
            </p>
            <p className="font-bold">{formatCurrency(Number(order.workOrder.totalAmount))}</p>
          </div>
          <table className="w-full text-sm border border-gray-200 rounded">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-1.5 font-medium text-gray-600">Descripción</th>
                <th className="text-right px-3 py-1.5 font-medium text-gray-600">Cant.</th>
                <th className="text-right px-3 py-1.5 font-medium text-gray-600">P. Unit.</th>
                <th className="text-right px-3 py-1.5 font-medium text-gray-600">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.workOrder.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-1.5">{item.description}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(Number(item.unitPrice))}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                    {formatCurrency(Number(item.unitPrice) * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right font-semibold text-sm">Total</td>
                <td className="px-3 py-2 text-right font-bold">{formatCurrency(Number(order.workOrder.totalAmount))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Factura */}
      {order.invoice && (
        <div className="mb-6 p-4 border-2 border-gray-300 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Factura de servicio</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              order.invoice.status === "PAID"
                ? "bg-green-100 text-green-700"
                : order.invoice.paymentMethod === "cuenta_corriente"
                ? "bg-blue-100 text-blue-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {order.invoice.status === "PAID"
                ? "Pagado"
                : order.invoice.paymentMethod === "cuenta_corriente"
                ? "Cuenta corriente"
                : "Pendiente de cobro"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Factura {order.invoice.invoiceType}</p>
              <p className="font-medium">{order.invoice.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Fecha</p>
              <p>{order.invoice.invoiceDate?.toLocaleDateString("es-AR")}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="font-bold text-lg">{formatCurrency(Number(order.invoice.totalAmount))}</p>
            </div>
          </div>
          {order.invoice.paymentDate && (
            <p className="text-xs text-gray-500 mt-2">
              Pagado el {order.invoice.paymentDate.toLocaleDateString("es-AR")} — {order.invoice.paymentMethod}
            </p>
          )}
        </div>
      )}

      {/* Firma */}
      <div className="mt-24 grid grid-cols-2 gap-24">
        <div>
          <div className="h-20 border-b border-gray-400" />
          <p className="text-xs text-gray-500 text-center mt-2">Firma y aclaración del cliente</p>
        </div>
        <div>
          <div className="h-20 border-b border-gray-400" />
          <p className="text-xs text-gray-500 text-center mt-2">Firma y aclaración del responsable</p>
        </div>
      </div>
    </div>
  );
}
