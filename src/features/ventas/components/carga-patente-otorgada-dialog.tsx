"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cargaPatenteOtorgada } from "@/features/ventas/actions";

interface CargaPatenteOtorgadaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  vehicleLabel: string;
}

export function CargaPatenteOtorgadaDialog({
  open,
  onOpenChange,
  saleId,
  vehicleLabel,
}: CargaPatenteOtorgadaDialogProps) {
  const [fechaOtorgamiento, setFechaOtorgamiento] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [numeroDominio, setNumeroDominio] = useState("");
  const [preEntregaRealizada, setPreEntregaRealizada] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setFechaOtorgamiento(new Date().toISOString().slice(0, 10));
    setNumeroDominio("");
    setPreEntregaRealizada(false);
    setObservaciones("");
    setError("");
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        await cargaPatenteOtorgada({
          saleId,
          fechaOtorgamiento,
          numeroDominio,
          preEntregaRealizada,
          observaciones: observaciones || undefined,
        });
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paso 6 — Patente otorgada</DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">{vehicleLabel}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha de otorgamiento *</Label>
              <Input
                type="date"
                value={fechaOtorgamiento}
                onChange={(e) => setFechaOtorgamiento(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Número de dominio *</Label>
              <Input
                value={numeroDominio}
                onChange={(e) => setNumeroDominio(e.target.value.toUpperCase())}
                placeholder="AB 123 CD"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Sin observaciones..."
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 resize-none"
            />
          </div>

          <label className="flex items-center gap-3 py-2 px-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors">
            <input
              type="checkbox"
              checked={preEntregaRealizada}
              onChange={(e) => setPreEntregaRealizada(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-foreground"
            />
            <div>
              <p className="text-sm font-medium">Pre-entrega realizada</p>
              <p className="text-xs text-muted-foreground">El vehículo está listo para entregar</p>
            </div>
            {preEntregaRealizada && (
              <span className="ml-auto text-xs text-green-700 font-medium">✓ Listo</span>
            )}
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Confirmar patente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
