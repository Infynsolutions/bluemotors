"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  marcarOrdenEnviada,
  cargarFacturaProveedor,
  cargarRecepcion,
  registrarPagoCompra,
} from "@/features/repuestos/actions/compras";
import { formatMontoInput, parseMontoInput } from "@/lib/format";

type OrderItem = {
  id: string;
  partId: string;
  quantity: number;
  part: { name: string; code: string; unit: string };
};

type Order = {
  id: string;
  status: string;
  orderNumber: string;
  items: OrderItem[];
  invoice: { totalAmount: unknown } | null;
};

interface Props {
  order: Order;
}

export function OrdenCompraAcciones({ order }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // ── Estados por dialog ────────────────────────────────────────────────────
  const [facturaOpen, setFacturaOpen] = useState(false);
  const [facturaNum, setFacturaNum] = useState("");
  const [facturaDate, setFacturaDate] = useState(new Date().toISOString().slice(0, 10));
  const [facturaType, setFacturaType] = useState<"A" | "B" | "C">("A");
  const [facturaTotal, setFacturaTotal] = useState("");

  const [recepcionOpen, setRecepcionOpen] = useState(false);
  const [recepcionDate, setRecepcionDate] = useState(new Date().toISOString().slice(0, 10));
  const [recepcionNotes, setRecepcionNotes] = useState("");
  const [recepcionItems, setRecepcionItems] = useState<Record<string, string>>({});

  const [pagoOpen, setPagoOpen] = useState(false);
  const [pagoAmount, setPagoAmount] = useState(
    order.invoice ? String(Number(order.invoice.totalAmount)) : ""
  );
  const [pagoDate, setPagoDate] = useState(new Date().toISOString().slice(0, 10));
  const [pagoMethod, setPagoMethod] = useState("transferencia");
  const [pagoRef, setPagoRef] = useState("");

  function run(fn: () => Promise<void>) {
    setError("");
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  // ── Acción: Marcar enviada ─────────────────────────────────────────────────
  if (order.status === "DRAFT") {
    return (
      <div className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-sm text-muted-foreground">
          Imprimí o enviá esta orden al proveedor, luego marcala como enviada.
        </p>
        <button
          onClick={() => run(() => marcarOrdenEnviada(order.id))}
          disabled={isPending}
          className="h-9 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {isPending ? "Procesando..." : "Marcar como enviada al proveedor"}
        </button>
      </div>
    );
  }

  // ── Acción: Cargar factura del proveedor ───────────────────────────────────
  if (order.status === "SENT") {
    return (
      <div className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {facturaOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => cargarFacturaProveedor({
                purchaseOrderId: order.id,
                invoiceNumber: facturaNum,
                invoiceDate: facturaDate,
                invoiceType: facturaType,
                totalAmount: parseMontoInput(facturaTotal),
              }));
            }}
            className="rounded-xl border p-4 space-y-4"
          >
            <p className="text-sm font-medium">Factura del proveedor</p>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo</label>
                <select value={facturaType} onChange={(e) => setFacturaType(e.target.value as "A" | "B" | "C")}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                  <option value="A">Factura A</option>
                  <option value="B">Factura B</option>
                  <option value="C">Factura C</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Número *</label>
                <input value={facturaNum} onChange={(e) => setFacturaNum(e.target.value)} required
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha *</label>
                <input type="date" value={facturaDate} onChange={(e) => setFacturaDate(e.target.value)} required
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Total con IVA *</label>
                <input value={facturaTotal} onChange={(e) => setFacturaTotal(formatMontoInput(e.target.value))}
                  inputMode="numeric" required
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
            </div>
            {facturaType === "A" && parseMontoInput(facturaTotal) > 0 && (() => {
              const total = parseMontoInput(facturaTotal);
              const net = total / 1.21;
              const vat = total - net;
              const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
              return (
                <div className="rounded-lg border bg-blue-50/40 border-blue-100 p-3 text-sm space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Neto gravado</span><span className="tabular-nums">{fmt(net)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>IVA 21%</span><span className="tabular-nums text-blue-700 font-medium">{fmt(vat)}</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">→ Se registrará como crédito fiscal IVA en GSI</p>
                </div>
              );
            })()}
            <div className="flex gap-3">
              <button type="submit" disabled={isPending}
                className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
                {isPending ? "Guardando..." : "Confirmar factura"}
              </button>
              <button type="button" onClick={() => setFacturaOpen(false)}
                className="h-9 px-4 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setFacturaOpen(true)}
            className="h-9 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity">
            Cargar factura del proveedor
          </button>
        )}
      </div>
    );
  }

  // ── Acción: Cargar recepción ───────────────────────────────────────────────
  if (order.status === "INVOICED") {
    return (
      <div className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {recepcionOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => cargarRecepcion({
                purchaseOrderId: order.id,
                receiptDate: recepcionDate,
                notes: recepcionNotes,
                items: order.items.map((item) => ({
                  partId: item.partId,
                  orderedQty: item.quantity,
                  receivedQty: parseInt(recepcionItems[item.partId] ?? "0") || 0,
                })),
              }));
            }}
            className="rounded-xl border p-4 space-y-4"
          >
            <p className="text-sm font-medium">Recepción de mercadería</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha de recepción *</label>
                <input type="date" value={recepcionDate} onChange={(e) => setRecepcionDate(e.target.value)} required
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cantidad recibida por artículo
              </p>
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.part.name}</p>
                    <p className="text-xs text-muted-foreground">Pedido: {item.quantity} {item.part.unit}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs text-muted-foreground">Recibido:</label>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={recepcionItems[item.partId] ?? item.quantity}
                      onChange={(e) => setRecepcionItems((prev) => ({ ...prev, [item.partId]: e.target.value }))}
                      className="w-20 h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring text-center"
                    />
                    <span className="text-xs text-muted-foreground">{item.part.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Observaciones</label>
              <input value={recepcionNotes} onChange={(e) => setRecepcionNotes(e.target.value)}
                placeholder="Ej: faltó artículo X, mercadería en buen estado..."
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={isPending}
                className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
                {isPending ? "Guardando..." : "Confirmar recepción"}
              </button>
              <button type="button" onClick={() => setRecepcionOpen(false)}
                className="h-9 px-4 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setRecepcionOpen(true)}
            className="h-9 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity">
            Cargar recepción de mercadería
          </button>
        )}
      </div>
    );
  }

  // ── Acción: Registrar pago ────────────────────────────────────────────────
  if (order.status === "RECEIVED") {
    return (
      <div className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {pagoOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => registrarPagoCompra({
                purchaseOrderId: order.id,
                amount: parseMontoInput(pagoAmount),
                paymentDate: pagoDate,
                method: pagoMethod,
                reference: pagoRef,
              }));
            }}
            className="rounded-xl border p-4 space-y-4"
          >
            <p className="text-sm font-medium">Registrar pago</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Monto *</label>
                <input value={pagoAmount} onChange={(e) => setPagoAmount(formatMontoInput(e.target.value))}
                  inputMode="numeric" required
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha *</label>
                <input type="date" value={pagoDate} onChange={(e) => setPagoDate(e.target.value)} required
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Método *</label>
                <select value={pagoMethod} onChange={(e) => setPagoMethod(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Referencia</label>
                <input value={pagoRef} onChange={(e) => setPagoRef(e.target.value)}
                  placeholder="N° transferencia, cheque..."
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isPending}
                className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
                {isPending ? "Guardando..." : "Confirmar pago"}
              </button>
              <button type="button" onClick={() => setPagoOpen(false)}
                className="h-9 px-4 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setPagoOpen(true)}
            className="h-9 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity">
            Registrar pago
          </button>
        )}
      </div>
    );
  }

  // ── Estado final: Pagada ───────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-green-200 bg-green-50/40 p-4">
      <p className="text-sm font-medium text-green-700">Orden completada y pagada</p>
    </div>
  );
}
