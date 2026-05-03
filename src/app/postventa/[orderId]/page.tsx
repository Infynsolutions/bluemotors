import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { PostventaAcciones } from "@/components/postventa-acciones";
import { STATUS_LABEL, STATUS_COLOR } from "@/app/postventa/page";
import { WORKSHOP_NAMES } from "@/lib/postventa-constants";

export const dynamic = "force-dynamic";

const STEPS = [
  { status: "PENDING", label: "Ficha creada" },
  { status: "APPOINTMENT_SET", label: "Turno agendado" },
  { status: "IN_TRANSIT", label: "En traslado" },
  { status: "AT_WORKSHOP", label: "En taller (MO)" },
  { status: "COMPLETED", label: "Trabajo listo" },
  { status: "CLOSED", label: "Cerrado" },
];

const STATUS_INDEX: Record<string, number> = {
  PENDING: 0, APPOINTMENT_SET: 1, IN_TRANSIT: 2, AT_WORKSHOP: 3, COMPLETED: 4, CLOSED: 5,
};

export default async function PostventaDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { orderId } = await params;

  const [order, parts] = await Promise.all([
    prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: {
        client: true,
        vehicle: true,
        appointment: true,
        transfer: { include: { remitItems: { include: { part: true } } } },
        workOrder: { include: { items: { include: { part: true } } } },
        pickup: true,
        invoice: true,
      },
    }),
    prisma.part.findMany({
      where: { active: true, stock: { gt: 0 } },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!order) notFound();

  const currentStep = STATUS_INDEX[order.status] ?? 0;
  const isAdminOrGerente = ["admin", "gerente"].includes(session.user.role);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/postventa" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Postventa
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-sm font-semibold">{order.vehicleDominio}</span>
          </div>
          <h1 className="text-xl font-semibold mt-1">{order.client?.name ?? order.clientName}</h1>
          <p className="text-sm text-muted-foreground">{order.vehicleDesc}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
          {order.status === "CLOSED" && (
            <Link href={`/postventa/${order.id}/imprimir`}
              className="h-8 px-3 rounded-lg border border-input text-xs font-medium hover:bg-muted transition-colors flex items-center">
              Imprimir ficha
            </Link>
          )}
        </div>
      </div>

      {/* Stepper */}
      {order.status !== "CANCELLED" && (
        <div className="flex items-center">
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
                  <span className={`text-xs mt-1 text-center leading-tight max-w-[70px] ${
                    active ? "font-semibold" : "text-muted-foreground"
                  }`}>{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-5 ${done ? "bg-foreground" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info básica */}
      <div className="rounded-xl border p-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Solicitante</p>
          <p className="font-medium">{order.clientName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Teléfono</p>
          <p>{order.clientPhone || "—"}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Motivo</p>
          <p>{order.motivo}</p>
        </div>
        {order.notes && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Observaciones</p>
            <p className="text-muted-foreground">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Turno */}
      {order.appointment && (
        <div className="rounded-xl border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Turno</p>
            {order.appointment.reminderSent ? (
              <span className="text-xs text-green-600 font-medium">✓ Recordatorio enviado</span>
            ) : (
              <span className="text-xs text-muted-foreground">Recordatorio pendiente</span>
            )}
          </div>
          <p className="text-sm">
            {order.appointment.scheduledDate.toLocaleDateString("es-AR", {
              weekday: "long", day: "2-digit", month: "long", year: "numeric",
            })}
            {" — "}
            {order.appointment.scheduledDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
          </p>
          {order.appointment.notes && (
            <p className="text-xs text-muted-foreground">{order.appointment.notes}</p>
          )}
        </div>
      )}

      {/* Traslado */}
      {order.transfer && (
        <div className="rounded-xl border p-4 space-y-3">
          <p className="text-sm font-medium">Traslado al taller</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Taller destino</p>
              <p className="font-medium">{WORKSHOP_NAMES[order.transfer.workshopNumber]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Responsable traslado</p>
              <p className="font-medium">{order.transfer.driverName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p>{order.transfer.transferDate.toLocaleDateString("es-AR")}</p>
            </div>
          </div>
          {order.transfer.notes && (
            <p className="text-xs text-muted-foreground">{order.transfer.notes}</p>
          )}
          {order.transfer.remitItems.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Remito de repuestos</p>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-muted">
                  {order.transfer.remitItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5 font-mono text-muted-foreground">{item.part.code}</td>
                      <td className="py-1.5 px-2">{item.part.name}</td>
                      <td className="py-1.5 text-right">{item.quantity} {item.part.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Orden de ingreso MO */}
      {order.workOrder && (
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Orden de ingreso — {order.workOrder.moNumber}</p>
            <p className="font-bold text-base">{formatCurrency(Number(order.workOrder.totalAmount))}</p>
          </div>
          <p className="text-sm text-muted-foreground">{order.workOrder.description}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1.5 text-xs font-medium text-muted-foreground">Descripción</th>
                <th className="text-right py-1.5 text-xs font-medium text-muted-foreground">Cant.</th>
                <th className="text-right py-1.5 text-xs font-medium text-muted-foreground">P. Unit.</th>
                <th className="text-right py-1.5 text-xs font-medium text-muted-foreground">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted">
              {order.workOrder.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(Number(item.unitPrice))}</td>
                  <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(Number(item.unitPrice) * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {order.workOrder.techNotes && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">Notas del taller</p>
              <p className="text-sm">{order.workOrder.techNotes}</p>
            </div>
          )}
          {order.workOrder.completedAt && (
            <p className="text-xs text-muted-foreground">
              Completado: {order.workOrder.completedAt.toLocaleDateString("es-AR")}
            </p>
          )}
        </div>
      )}

      {/* Retiro */}
      {order.pickup && (
        <div className="rounded-xl border p-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Retirado por</p>
            <p className="font-medium">{order.pickup.pickedUpBy}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fecha de retiro</p>
            <p>{order.pickup.pickupDate.toLocaleDateString("es-AR")}</p>
          </div>
          {order.pickup.notes && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Observaciones</p>
              <p>{order.pickup.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Factura de servicio */}
      {order.invoice && (
        <div className="rounded-xl border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Factura de servicio</p>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
              <p className="text-xs text-muted-foreground">Factura {order.invoice.invoiceType}</p>
              <p className="font-medium">{order.invoice.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p>{order.invoice.invoiceDate?.toLocaleDateString("es-AR")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-bold">{formatCurrency(Number(order.invoice.totalAmount))}</p>
            </div>
          </div>
          {order.invoice.paymentDate && (
            <p className="text-xs text-muted-foreground">
              Pagado el {order.invoice.paymentDate.toLocaleDateString("es-AR")} — {order.invoice.paymentMethod}
            </p>
          )}
        </div>
      )}

      {/* Acciones según estado */}
      {order.status !== "CANCELLED" && (
        <PostventaAcciones
          order={{
            id: order.id,
            status: order.status,
            vehicleDominio: order.vehicleDominio,
            appointment: order.appointment
              ? { reminderSent: order.appointment.reminderSent, scheduledDate: order.appointment.scheduledDate }
              : null,
            workOrder: order.workOrder
              ? { totalAmount: Number(order.workOrder.totalAmount) }
              : null,
            invoice: order.invoice
              ? { status: order.invoice.status, totalAmount: Number(order.invoice.totalAmount) }
              : null,
          }}
          parts={parts.map((p) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            unit: p.unit,
            salePrice: Number(p.salePrice),
            stock: p.stock,
          }))}
          isAdminOrGerente={isAdminOrGerente}
        />
      )}
    </div>
  );
}
