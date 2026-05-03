"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { asignarVehiculoAPedido, getVehiclesDisponibles } from "@/app/actions/ventas";
import { formatCurrency } from "@/lib/format";

type Vehiculo = { id: string; brand: string; model: string; year: number; price: number };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saleId: string;
  pedidoLabel: string; // "DFSK C31 2026"
}

export function AsignarVehiculoDialog({ open, onOpenChange, saleId, pedidoLabel }: Props) {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    getVehiclesDisponibles().then(setVehiculos);
    setSelected("");
    setError("");
  }, [open]);

  function handleClose() {
    setSelected("");
    setError("");
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) { setError("Seleccioná un vehículo"); return; }
    setError("");

    startTransition(async () => {
      try {
        await asignarVehiculoAPedido(saleId, selected);
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al asignar");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar vehículo de stock</DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Pedido: <span className="font-medium text-foreground">{pedidoLabel}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <p className="text-sm text-muted-foreground">
            Seleccioná el vehículo disponible en stock que se asignará a esta venta. El pedido original se eliminará.
          </p>

          {vehiculos.length === 0 ? (
            <p className="text-sm text-amber-600">No hay vehículos disponibles en stock.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {vehiculos.map((v) => (
                <label
                  key={v.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    selected === v.id
                      ? "border-foreground bg-muted"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="vehiculo"
                      value={v.id}
                      checked={selected === v.id}
                      onChange={() => setSelected(v.id)}
                      className="accent-foreground"
                    />
                    <span className="text-sm font-medium">
                      {v.brand} {v.model}{" "}
                      <span className="font-normal text-muted-foreground">{v.year}</span>
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatCurrency(v.price)}</span>
                </label>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || vehiculos.length === 0}>
              {isPending ? "Asignando..." : "Confirmar asignación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
