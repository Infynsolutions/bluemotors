"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearVentaRepuestos } from "@/app/actions/venta-repuestos";
import { formatMontoInput, parseMontoInput } from "@/lib/format";
import type { InvoiceType } from "@/generated/prisma/client";

type Part = { id: string; code: string; name: string; unit: string; salePrice: number; stock: number };
type Client = { id: string; name: string; phone: string | null };

type SaleItem = { partId: string; description: string; quantity: string; unitPrice: string };

interface Props {
  parts: Part[];
  clients: Client[];
}

export function NuevaVentaRepuestosDialog({ parts, clients }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleItem[]>([{ partId: "", description: "", quantity: "1", unitPrice: "" }]);
  const [invoiceType, setInvoiceType] = useState<InvoiceType | "">("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("efectivo");

  function handleClientChange(id: string) {
    setClientId(id);
    if (id) {
      const c = clients.find((c) => c.id === id);
      if (c) { setClientName(c.name); setClientPhone(c.phone ?? ""); }
    }
  }

  function addItem() {
    setItems((p) => [...p, { partId: "", description: "", quantity: "1", unitPrice: "" }]);
  }
  function removeItem(i: number) { setItems((p) => p.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof SaleItem, v: string) {
    setItems((p) => p.map((item, idx) => {
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

  const total = items.reduce((s, i) => s + (parseInt(i.quantity) || 0) * parseMontoInput(i.unitPrice), 0);
  const isA = invoiceType === "A";
  const net = isA && total > 0 ? total / 1.21 : 0;
  const vat = isA && total > 0 ? total - net : 0;
  const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

  function handleClose() {
    setOpen(false);
    setClientId(""); setClientName(""); setClientPhone(""); setNotes("");
    setItems([{ partId: "", description: "", quantity: "1", unitPrice: "" }]);
    setInvoiceType(""); setInvoiceNumber(""); setPaymentMethod("efectivo"); setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await crearVentaRepuestos({
          clientId: clientId || undefined,
          clientName,
          clientPhone: clientPhone || undefined,
          notes: notes || undefined,
          items: items.map((i) => ({
            partId: i.partId,
            description: i.description,
            quantity: parseInt(i.quantity) || 1,
            unitPrice: parseMontoInput(i.unitPrice),
          })),
          invoiceType: invoiceType || undefined,
          invoiceNumber: invoiceNumber || undefined,
          invoiceDate: invoiceDate || undefined,
          paymentMethod: paymentMethod || undefined,
        });
        handleClose();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear");
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity">
        + Nueva venta
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-background rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-base font-semibold">Nueva venta de repuestos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">El stock se descuenta automáticamente</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Cliente */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</p>
            <select value={clientId} onChange={(e) => handleClientChange(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
              <option value="">— Seleccionar cliente (opcional) —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nombre *</label>
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} required
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Teléfono</label>
                <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
            </div>
          </div>

          {/* Ítems */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Repuestos *</p>
              <button type="button" onClick={addItem}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
                + Agregar ítem
              </button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Repuesto *</label>
                  <select value={item.partId} onChange={(e) => updateItem(i, "partId", e.target.value)} required
                    className="w-full h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring">
                    <option value="">— Seleccionar —</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.stock === 0}>
                        {p.code} — {p.name} (stock: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Descripción</label>
                  <input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)}
                    className="w-full h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring" />
                </div>
                <div className="w-16 space-y-1">
                  <label className="text-xs text-muted-foreground">Cant.</label>
                  <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)}
                    className="w-full h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring text-center" />
                </div>
                <div className="w-28 space-y-1">
                  <label className="text-xs text-muted-foreground">P. Venta</label>
                  <input value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", formatMontoInput(e.target.value))}
                    inputMode="numeric"
                    className="w-full h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring" />
                </div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)}
                    className="text-muted-foreground hover:text-red-600 transition-colors text-lg leading-none h-8 px-1">×</button>
                )}
              </div>
            ))}
            {total > 0 && (
              <div className="flex justify-end pt-1">
                <p className="text-sm font-semibold">Total: {fmt(total)}</p>
              </div>
            )}
          </div>

          {/* Factura */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Factura (opcional)</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo</label>
                <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as InvoiceType | "")}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                  <option value="">Sin factura</option>
                  <option value="A">Factura A</option>
                  <option value="B">Factura B</option>
                  <option value="C">Factura C</option>
                </select>
              </div>
              {invoiceType && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Número</label>
                    <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Fecha</label>
                    <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
                  </div>
                </>
              )}
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
          </div>

          {/* Pago */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Forma de pago</p>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="cuenta_corriente">Cuenta corriente (queda pendiente)</option>
            </select>
          </div>

          {/* Observaciones */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Observaciones</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending || !clientName || items.some((i) => !i.partId || !i.description) || total === 0}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
              {isPending ? "Guardando..." : "Confirmar venta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
