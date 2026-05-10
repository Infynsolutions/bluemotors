"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  agendarTurno,
  marcarRecordatorioEnviado,
  registrarTraslado,
  cargarOrdenIngreso,
  completarTrabajo,
  registrarRetiro,
  generarFacturaServicio,
  registrarPagoServicio,
} from "@/features/postventa/actions";
import { WORKSHOP_NAMES } from "@/features/postventa/constants";
import { formatMontoInput, parseMontoInput } from "@/lib/format";
import type { InvoiceType } from "@/generated/prisma/client";

type Part = { id: string; code: string; name: string; unit: string; salePrice: number; stock: number };
type Order = {
  id: string;
  status: string;
  vehicleDominio: string;
  appointment: { reminderSent: boolean; scheduledDate: Date } | null;
  workOrder: { totalAmount: number } | null;
  invoice: { status: string; totalAmount: number } | null;
};

interface Props {
  order: Order;
  parts: Part[];
  isAdminOrGerente: boolean;
}

type MoItem = { partId: string; description: string; quantity: string; unitPrice: string };

export function PostventaAcciones({ order, parts, isAdminOrGerente }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // PENDING
  const [turnoDate, setTurnoDate] = useState("");
  const [turnoNotes, setTurnoNotes] = useState("");

  // APPOINTMENT_SET
  const [workshopNumber, setWorkshopNumber] = useState(1);
  const [driverName, setDriverName] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [transferNotes, setTransferNotes] = useState("");
  const [remitParts, setRemitParts] = useState<{ partId: string; quantity: string }[]>([]);

  // IN_TRANSIT
  const [moDesc, setMoDesc] = useState("");
  const [moItems, setMoItems] = useState<MoItem[]>([{ partId: "", description: "", quantity: "1", unitPrice: "" }]);

  // AT_WORKSHOP
  const [techNotes, setTechNotes] = useState("");

  // COMPLETED
  const [pickedUpBy, setPickedUpBy] = useState("");
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().slice(0, 10));
  const [pickupNotes, setPickupNotes] = useState("");

  // CLOSED
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("A");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceAmount, setInvoiceAmount] = useState(
    order.workOrder ? String(order.workOrder.totalAmount) : ""
  );
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("transferencia");

  function run(fn: () => Promise<void>) {
    setError("");
    startTransition(async () => {
      try { await fn(); router.refresh(); }
      catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    });
  }

  function addRemitPart() {
    setRemitParts((p) => [...p, { partId: parts[0]?.id ?? "", quantity: "1" }]);
  }
  function removeRemitPart(i: number) { setRemitParts((p) => p.filter((_, idx) => idx !== i)); }
  function updateRemitPart(i: number, field: "partId" | "quantity", v: string) {
    setRemitParts((p) => p.map((item, idx) => idx === i ? { ...item, [field]: v } : item));
  }

  function addMoItem() { setMoItems((p) => [...p, { partId: "", description: "", quantity: "1", unitPrice: "" }]); }
  function removeMoItem(i: number) { setMoItems((p) => p.filter((_, idx) => idx !== i)); }
  function updateMoItem(i: number, field: keyof MoItem, v: string) {
    setMoItems((p) => p.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [field]: v };
      if (field === "partId" && v) {
        const part = parts.find((p) => p.id === v);
        if (part) {
          updated.description = part.name;
          updated.unitPrice = formatMontoInput(String(part.salePrice));
        }
      }
      return updated;
    }));
  }

  const moTotal = moItems.reduce((s, i) => s + (parseInt(i.quantity) || 0) * parseMontoInput(i.unitPrice), 0);
  const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

  // ── PENDING: Agendar turno ────────────────────────────────────────────────
  if (order.status === "PENDING") {
    return (
      <div className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-sm font-medium">Agendar turno</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Fecha y hora *</label>
            <input type="datetime-local" value={turnoDate} onChange={(e) => setTurnoDate(e.target.value)} required
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notas</label>
            <input value={turnoNotes} onChange={(e) => setTurnoNotes(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
          </div>
        </div>
        <button onClick={() => run(() => agendarTurno({ serviceOrderId: order.id, scheduledDate: turnoDate, notes: turnoNotes }))}
          disabled={isPending || !turnoDate}
          className="h-9 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
          {isPending ? "Guardando..." : "Confirmar turno"}
        </button>
      </div>
    );
  }

  // ── APPOINTMENT_SET: Recordatorio + traslado ──────────────────────────────
  if (order.status === "APPOINTMENT_SET") {
    return (
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!order.appointment?.reminderSent && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/40">
            <p className="text-sm flex-1">
              Turno: <span className="font-medium">
                {order.appointment?.scheduledDate.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </span> — recordatorio pendiente
            </p>
            <button onClick={() => run(() => marcarRecordatorioEnviado(order.id))}
              disabled={isPending}
              className="h-8 px-3 rounded-lg border border-amber-300 text-xs font-medium hover:bg-amber-100 transition-colors">
              Marcar enviado
            </button>
          </div>
        )}

        <div className="space-y-3 rounded-xl border p-4">
          <p className="text-sm font-medium">Registrar traslado al taller</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Taller *</label>
              <select value={workshopNumber} onChange={(e) => setWorkshopNumber(Number(e.target.value))}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                {Object.entries(WORKSHOP_NAMES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Responsable traslado *</label>
              <input value={driverName} onChange={(e) => setDriverName(e.target.value)}
                placeholder="Nombre de quien lleva el auto"
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha *</label>
              <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notas / checklist para el taller</label>
            <textarea value={transferNotes} onChange={(e) => setTransferNotes(e.target.value)} rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 resize-none" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Repuestos que se envían al taller</label>
              <button type="button" onClick={addRemitPart} disabled={parts.length === 0}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-40">
                + Agregar repuesto
              </button>
            </div>
            {remitParts.map((rp, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={rp.partId} onChange={(e) => updateRemitPart(i, "partId", e.target.value)}
                  className="flex-1 h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring">
                  {parts.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name} (stock: {p.stock})</option>)}
                </select>
                <input type="number" min="1" value={rp.quantity} onChange={(e) => updateRemitPart(i, "quantity", e.target.value)}
                  className="w-16 h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring text-center" />
                <button onClick={() => removeRemitPart(i)} className="text-muted-foreground hover:text-red-600 transition-colors text-lg leading-none px-1">×</button>
              </div>
            ))}
          </div>

          <button
            onClick={() => run(() => registrarTraslado({
              serviceOrderId: order.id,
              workshopNumber,
              driverName,
              transferDate,
              notes: transferNotes,
              parts: remitParts.map((p) => ({ partId: p.partId, quantity: parseInt(p.quantity) || 0 })),
            }))}
            disabled={isPending || !driverName}
            className="h-9 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
            {isPending ? "Guardando..." : "Confirmar traslado"}
          </button>
        </div>
      </div>
    );
  }

  // ── IN_TRANSIT: Cargar MO ─────────────────────────────────────────────────
  if (order.status === "IN_TRANSIT") {
    return (
      <div className="space-y-4 rounded-xl border p-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-sm font-medium">Cargar orden de ingreso (MO)</p>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Descripción del trabajo a realizar *</label>
          <textarea value={moDesc} onChange={(e) => setMoDesc(e.target.value)} rows={2} required
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 resize-none" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Ítems (repuestos + mano de obra) *</label>
            <button type="button" onClick={addMoItem}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
              + Agregar ítem
            </button>
          </div>
          {moItems.map((item, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">Repuesto (opcional)</label>
                <select value={item.partId} onChange={(e) => updateMoItem(i, "partId", e.target.value)}
                  className="w-full h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring">
                  <option value="">— Sin artículo (mano de obra) —</option>
                  {parts.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">Descripción *</label>
                <input value={item.description} onChange={(e) => updateMoItem(i, "description", e.target.value)} required
                  className="w-full h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring" />
              </div>
              <div className="w-16 space-y-1">
                <label className="text-xs text-muted-foreground">Cant.</label>
                <input type="number" min="1" value={item.quantity} onChange={(e) => updateMoItem(i, "quantity", e.target.value)}
                  className="w-full h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring text-center" />
              </div>
              <div className="w-28 space-y-1">
                <label className="text-xs text-muted-foreground">P. Venta</label>
                <input value={item.unitPrice} onChange={(e) => updateMoItem(i, "unitPrice", formatMontoInput(e.target.value))}
                  inputMode="numeric"
                  className="w-full h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring" />
              </div>
              {moItems.length > 1 && (
                <button onClick={() => removeMoItem(i)} className="text-muted-foreground hover:text-red-600 transition-colors text-lg leading-none h-8 px-1">×</button>
              )}
            </div>
          ))}
          {moTotal > 0 && (
            <div className="flex justify-end">
              <p className="text-sm font-semibold">Total: {fmt(moTotal)}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => run(() => cargarOrdenIngreso({
            serviceOrderId: order.id,
            description: moDesc,
            items: moItems.map((i) => ({
              partId: i.partId || undefined,
              description: i.description,
              quantity: parseInt(i.quantity) || 1,
              unitPrice: parseMontoInput(i.unitPrice),
            })),
          }))}
          disabled={isPending || !moDesc || moItems.some((i) => !i.description)}
          className="h-9 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
          {isPending ? "Guardando..." : "Confirmar MO"}
        </button>
      </div>
    );
  }

  // ── AT_WORKSHOP: Completar trabajo ────────────────────────────────────────
  if (order.status === "AT_WORKSHOP") {
    return (
      <div className="space-y-3 rounded-xl border p-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-sm font-medium">Completar trabajo del taller</p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notas del taller (qué se hizo, qué se cambió)</label>
          <textarea value={techNotes} onChange={(e) => setTechNotes(e.target.value)} rows={3}
            placeholder="Ej: Se cambió filtro de aceite y aceite 10W40, se revisó frenos..."
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 resize-none" />
        </div>
        <button
          onClick={() => run(() => completarTrabajo({ serviceOrderId: order.id, techNotes }))}
          disabled={isPending}
          className="h-9 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
          {isPending ? "Guardando..." : "Marcar trabajo completado"}
        </button>
      </div>
    );
  }

  // ── COMPLETED: Registrar retiro ───────────────────────────────────────────
  if (order.status === "COMPLETED") {
    return (
      <div className="space-y-3 rounded-xl border p-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-sm font-medium">Registrar retiro del vehículo</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Retirado por *</label>
            <input value={pickedUpBy} onChange={(e) => setPickedUpBy(e.target.value)} required
              placeholder="Nombre de quien retira"
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Fecha de retiro</label>
            <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium">Observaciones</label>
            <input value={pickupNotes} onChange={(e) => setPickupNotes(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
          </div>
        </div>
        <button
          onClick={() => run(() => registrarRetiro({ serviceOrderId: order.id, pickedUpBy, pickupDate, notes: pickupNotes }))}
          disabled={isPending || !pickedUpBy}
          className="h-9 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
          {isPending ? "Guardando..." : "Confirmar retiro y cerrar ficha"}
        </button>
      </div>
    );
  }

  // ── CLOSED: Factura + pago ────────────────────────────────────────────────
  if (order.status === "CLOSED") {
    if (!order.invoice && isAdminOrGerente) {
      const total = parseMontoInput(invoiceAmount);
      const isA = invoiceType === "A";
      const net = isA && total > 0 ? total / 1.21 : 0;
      const vat = isA && total > 0 ? total - net : 0;

      return (
        <div className="space-y-4 rounded-xl border p-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-sm font-medium">Generar factura de servicio (GSI)</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo</label>
              <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                <option value="A">Factura A</option>
                <option value="B">Factura B</option>
                <option value="C">Factura C</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Número *</label>
              <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha *</label>
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Total *</label>
              <input value={invoiceAmount} onChange={(e) => setInvoiceAmount(formatMontoInput(e.target.value))}
                inputMode="numeric" required
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
          </div>
          {isA && total > 0 && (
            <div className="rounded-lg border bg-blue-50/40 border-blue-100 p-3 text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Neto gravado</span><span className="tabular-nums">{fmt(net)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA 21%</span>
                <span className="tabular-nums text-blue-700 font-medium">{fmt(vat)}</span>
              </div>
              <p className="text-xs text-blue-600">→ Se registrará como débito IVA en GSI</p>
            </div>
          )}
          <button
            onClick={() => run(() => generarFacturaServicio({
              serviceOrderId: order.id,
              invoiceType,
              invoiceNumber,
              invoiceDate,
              totalAmount: total,
            }))}
            disabled={isPending || !invoiceNumber || total <= 0}
            className="h-9 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
            {isPending ? "Guardando..." : "Generar factura"}
          </button>
        </div>
      );
    }

    if (order.invoice?.status === "PENDING") {
      const esCuentaCorriente = paymentMethod === "cuenta_corriente";
      return (
        <div className="space-y-3 rounded-xl border p-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-sm font-medium">Registrar cobro</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha de pago</label>
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
                disabled={esCuentaCorriente}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-40" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Método</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="cheque">Cheque</option>
                <option value="cuenta_corriente">Cuenta corriente</option>
              </select>
            </div>
          </div>
          {esCuentaCorriente && (
            <p className="text-xs text-amber-600">La deuda quedará pendiente en cuenta corriente del cliente.</p>
          )}
          <button
            onClick={() => run(() => registrarPagoServicio({ serviceOrderId: order.id, paymentDate, paymentMethod }))}
            disabled={isPending}
            className="h-9 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
            {isPending ? "Guardando..." : esCuentaCorriente ? "Registrar en cuenta corriente" : "Confirmar cobro"}
          </button>
        </div>
      );
    }

    if (order.invoice?.status === "PAID") {
      return (
        <div className="rounded-xl border border-green-200 bg-green-50/40 p-4">
          <p className="text-sm font-medium text-green-700">Ficha completada y cobrada</p>
        </div>
      );
    }

    return null;
  }

  return null;
}
