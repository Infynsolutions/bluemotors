"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearOrdenDeCompra } from "@/features/repuestos/actions/compras";
import { formatMontoInput, parseMontoInput } from "@/lib/format";

type Supplier = { id: string; name: string };
type Part = { id: string; code: string; name: string; unit: string; costPrice: unknown; category: { name: string } };

type LineItem = { partId: string; quantity: string; unitPrice: string };

interface Props {
  suppliers: Supplier[];
  parts: Part[];
}

export function NuevaOrdenCompraDialog({ suppliers, parts }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ partId: parts[0]?.id ?? "", quantity: "1", unitPrice: "" }]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setOpen(false);
    setSupplierId(suppliers[0]?.id ?? "");
    setNotes("");
    setItems([{ partId: parts[0]?.id ?? "", quantity: "1", unitPrice: "" }]);
    setError("");
  }

  function addItem() {
    setItems((prev) => [...prev, { partId: parts[0]?.id ?? "", quantity: "1", unitPrice: "" }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      // Auto-rellenar precio costo cuando cambia el artículo
      if (field === "partId") {
        const part = parts.find((p) => p.id === value);
        if (part) updated.unitPrice = formatMontoInput(String(Number(part.costPrice)));
      }
      return updated;
    }));
  }

  const total = items.reduce((s, i) => {
    const qty = parseInt(i.quantity) || 0;
    const price = parseMontoInput(i.unitPrice);
    return s + qty * price;
  }, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const orderId = await crearOrdenDeCompra({
          supplierId,
          notes,
          items: items.map((i) => ({
            partId: i.partId,
            quantity: parseInt(i.quantity) || 0,
            unitPrice: parseMontoInput(i.unitPrice),
          })),
        });
        handleClose();
        router.push(`/repuestos/compras/${orderId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity"
      >
        + Nueva orden
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-background rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold">Nueva orden de compra</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Proveedor *</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Observaciones</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Artículos *</p>
              <button type="button" onClick={addItem}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
                + Agregar artículo
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">Artículo</label>
                    <select value={item.partId} onChange={(e) => updateItem(idx, "partId", e.target.value)}
                      className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                      {parts.map((p) => (
                        <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-xs text-muted-foreground">Cantidad</label>
                    <input type="number" min="1" value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                      className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 text-center" />
                  </div>
                  <div className="w-32 space-y-1">
                    <label className="text-xs text-muted-foreground">P. Unit.</label>
                    <input value={item.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", formatMontoInput(e.target.value))}
                      inputMode="numeric"
                      className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)}
                      className="h-9 px-2 text-muted-foreground hover:text-red-600 transition-colors text-lg leading-none">
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {total > 0 && (
              <div className="flex justify-end">
                <p className="text-sm font-semibold">
                  Total: {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(total)}
                </p>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
              {isPending ? "Creando..." : "Crear orden"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
