"use client";

import { useState, useTransition } from "react";
import { ajustarStock } from "@/features/repuestos/actions/repuestos";

interface Props {
  partId: string;
  partName: string;
  currentStock: number;
}

export function AjustarStockDialog({ partId, partName, currentStock }: Props) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setOpen(false);
    setQuantity(""); setNotes(""); setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty === 0) { setError("Ingresá una cantidad distinta de cero"); return; }
    startTransition(async () => {
      try {
        await ajustarStock({ partId, quantity: qty, notes });
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        title="Ajustar stock"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1">
        ± Ajustar
      </button>
    );
  }

  const preview = (parseInt(quantity) || 0) + currentStock;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-background rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Ajuste de stock</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{partName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm flex justify-between">
            <span className="text-muted-foreground">Stock actual</span>
            <span className="font-semibold">{currentStock}</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cantidad (+ ingreso / - egreso) *</label>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              placeholder="Ej: 5 ó -3"
              required
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            {quantity && !isNaN(parseInt(quantity)) && (
              <p className="text-xs text-muted-foreground">
                Nuevo stock: <span className={`font-semibold ${preview < 0 ? "text-red-600" : ""}`}>{preview}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Motivo</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: corrección de inventario"
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
              {isPending ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
