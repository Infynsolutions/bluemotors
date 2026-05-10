"use client";

import { useState, useTransition } from "react";
import { cancelarVenta } from "@/features/ventas/actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  vehicleLabel: string;
}

export function CancelarVentaDialog({ open, onOpenChange, saleId, vehicleLabel }: Props) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setMotivo("");
    setError(null);
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await cancelarVenta(saleId, motivo);
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cancelar");
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-background rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold">Cancelar venta</h2>
          <p className="text-sm text-muted-foreground mt-1">{vehicleLabel}</p>
        </div>

        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Esta acción no se puede deshacer. El vehículo volverá a estar disponible en el stock.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Motivo de cancelación (opcional)</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: cliente desistió, financiación rechazada..."
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors"
            >
              No cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Cancelando..." : "Confirmar cancelación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
