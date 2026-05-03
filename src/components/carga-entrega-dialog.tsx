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
import { cargaEntrega } from "@/app/actions/ventas";

interface CargaEntregaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  vehicleLabel: string;
  clientName: string;
}

export function CargaEntregaDialog({
  open,
  onOpenChange,
  saleId,
  vehicleLabel,
  clientName,
}: CargaEntregaDialogProps) {
  const [fechaEntrega, setFechaEntrega] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [receptorNombre, setReceptorNombre] = useState(clientName);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setFechaEntrega(new Date().toISOString().slice(0, 10));
    setReceptorNombre(clientName);
    setObservaciones("");
    setError("");
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        await cargaEntrega({ saleId, fechaEntrega, receptorNombre, observaciones: observaciones || undefined });
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
          <DialogTitle>Paso 7 — Entrega</DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">{vehicleLabel}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha de entrega *</Label>
              <Input
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Recibe *</Label>
              <Input
                value={receptorNombre}
                onChange={(e) => setReceptorNombre(e.target.value)}
                placeholder="Nombre completo"
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Confirmar entrega"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
