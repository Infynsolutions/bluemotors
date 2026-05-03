"use client";

import { useState, useTransition, useEffect } from "react";
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
import { cargaFactura, getSaleParaFactura } from "@/app/actions/ventas";
import { formatCurrency } from "@/lib/format";

type SaleData = Awaited<ReturnType<typeof getSaleParaFactura>>;

interface CargaFacturaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
}

export function CargaFacturaDialog({
  open,
  onOpenChange,
  saleId,
}: CargaFacturaDialogProps) {
  const [saleData, setSaleData] = useState<SaleData | null>(null);
  const [loadError, setLoadError] = useState("");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [invoiceType, setInvoiceType] = useState<"A" | "B" | "C">("A");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    getSaleParaFactura(saleId)
      .then(setSaleData)
      .catch((e) => setLoadError(e.message));
  }, [open, saleId]);

  function handleClose() {
    setInvoiceNumber("");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setInvoiceType("A");
    setError("");
    setSaleData(null);
    setLoadError("");
    onOpenChange(false);
  }

  const total = saleData?.salePrice ?? 0;
  const netAmount = total / 1.21;
  const vatAmount = total - netAmount;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        await cargaFactura({ saleId, invoiceNumber, invoiceDate, invoiceType });
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar.");
      }
    });
  }

  const { client, vehicle } = saleData ?? {};
  const domicilio = [client?.address, client?.city, client?.province]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Paso 4 — Carga de factura</DialogTitle>
          {vehicle && (
            <p className="text-sm text-muted-foreground pt-1">
              {vehicle.brand} {vehicle.model} {vehicle.year}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
          {loadError && <p className="text-sm text-destructive">{loadError}</p>}

          {/* ── Datos cliente (read-only) ── */}
          {client && (
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Datos del cliente
              </p>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Nombre / Razón social:</span>{" "}
                  <span className="font-medium">{client.name}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    {client.clientType === "FISICA" ? "DNI:" : "CUIT:"}
                  </span>{" "}
                  {client.clientType === "FISICA" ? client.dni ?? "—" : client.cuit ?? "—"}
                </p>
                {client.cuit && client.clientType === "FISICA" && (
                  <p>
                    <span className="text-muted-foreground">CUIT/CUIL:</span> {client.cuit}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Domicilio:</span>{" "}
                  {domicilio || "—"}
                </p>
                {client.ivaCondition && (
                  <p>
                    <span className="text-muted-foreground">Cond. IVA:</span>{" "}
                    {client.ivaCondition}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ── Datos vehículo (read-only) ── */}
          {vehicle && (
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Vehículo
              </p>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Descripción:</span>{" "}
                  <span className="font-medium">
                    {vehicle.brand} {vehicle.model} {vehicle.year}
                  </span>
                </p>
                {vehicle.vin && (
                  <p>
                    <span className="text-muted-foreground">VIN / Patente:</span>{" "}
                    {vehicle.vin}
                  </p>
                )}
                {vehicle.color && (
                  <p>
                    <span className="text-muted-foreground">Color:</span>{" "}
                    {vehicle.color}
                  </p>
                )}
                {total > 0 && (
                  <p>
                    <span className="text-muted-foreground">Total:</span>{" "}
                    <span className="font-semibold">{formatCurrency(total)}</span>
                  </p>
                )}
              </div>
            </section>
          )}

          <div className="border-t" />

          {/* ── Datos factura ── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Datos de la factura
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as "A" | "B" | "C")}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  <option value="A">Factura A</option>
                  <option value="B">Factura B</option>
                  <option value="C">Factura C</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Número *</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="0001-00001234"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>

            {/* Desglose neto + IVA para Factura A */}
            {invoiceType === "A" && total > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Neto gravado</span>
                  <span className="font-medium tabular-nums">{formatCurrency(netAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA 21%</span>
                  <span className="font-medium tabular-nums">{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold tabular-nums">{formatCurrency(total)}</span>
                </div>
              </div>
            )}
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !saleData}>
              {isPending ? "Guardando..." : "Confirmar factura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
