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
import { cargaPatentamiento } from "@/features/ventas/actions";

interface CargaPatentamientoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  vehicleLabel: string;
}

export function CargaPatentamientoDialog({
  open,
  onOpenChange,
  saleId,
  vehicleLabel,
}: CargaPatentamientoDialogProps) {
  const [fechaPresentacion, setFechaPresentacion] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [seccional, setSeccional] = useState("");
  const [numeroExpediente, setNumeroExpediente] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setFechaPresentacion(new Date().toISOString().slice(0, 10));
    setSeccional("");
    setNumeroExpediente("");
    setObservaciones("");
    setError("");
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        await cargaPatentamiento({
          saleId,
          fechaPresentacion,
          seccional,
          numeroExpediente: numeroExpediente || undefined,
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
          <DialogTitle>Paso 5 — Patentamiento</DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">{vehicleLabel}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha de presentación *</Label>
              <Input
                type="date"
                value={fechaPresentacion}
                onChange={(e) => setFechaPresentacion(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Seccional del Registro *</Label>
              <Input
                value={seccional}
                onChange={(e) => setSeccional(e.target.value)}
                placeholder="Seccional 1 Tucumán"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Número de expediente</Label>
            <Input
              value={numeroExpediente}
              onChange={(e) => setNumeroExpediente(e.target.value)}
              placeholder="EX-2026-00001234"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Documentación completa, pendiente resolución..."
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Confirmar presentación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
