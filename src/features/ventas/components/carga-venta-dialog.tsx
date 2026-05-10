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
import { cargaVenta } from "@/features/ventas/actions";
import { formatCurrency, formatMontoInput, parseMontoInput } from "@/lib/format";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoPago = "cash" | "transfer" | "check" | "used_vehicle" | "retencion";

interface PaymentLine {
  id: string;
  tipo: TipoPago;
  monto: string;
  // cheque
  banco: string;
  vencimiento: string;
  // auto usado
  brand: string;
  model: string;
  year: string;
  vin: string;
  color: string;
  mileage: string;
  location: string;
  // retención
  retentionType: string;
  certNumber: string;
  retentionDate: string;
}

const DOC_TYPES = [
  { key: "dni_front", label: "DNI (frente)" },
  { key: "dni_back", label: "DNI (dorso)" },
  { key: "cuit", label: "CUIT" },
  { key: "form_08", label: "Formulario 08" },
  { key: "payment_proof", label: "Comprobante de pago" },
  { key: "contract", label: "Contrato de venta" },
] as const;

type DocTypeKey = typeof DOC_TYPES[number]["key"];

const PAGO_LABELS: Record<TipoPago, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  check: "Cheque",
  used_vehicle: "Auto usado",
  retencion: "Retención",
};

const RETENTION_TYPES = [
  "IVA",
  "Ganancias",
  "Ingresos Brutos",
  "Municipal",
  "Otro",
];

function emptyLine(): PaymentLine {
  return {
    id: Math.random().toString(36).slice(2),
    tipo: "cash",
    monto: "",
    banco: "",
    vencimiento: "",
    brand: "",
    model: "",
    year: new Date().getFullYear().toString(),
    vin: "",
    color: "",
    mileage: "",
    location: "",
    retentionType: "IVA",
    certNumber: "",
    retentionDate: new Date().toISOString().slice(0, 10),
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CargaVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  vehicleLabel: string;
  salePrice: number | null;
  existingTotal?: number;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function CargaVentaDialog({
  open,
  onOpenChange,
  saleId,
  vehicleLabel,
  salePrice,
  existingTotal = 0,
}: CargaVentaDialogProps) {
  const [lines, setLines] = useState<PaymentLine[]>([emptyLine()]);
  const [receivedDocs, setReceivedDocs] = useState<Set<DocTypeKey>>(new Set());
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setLines([emptyLine()]);
    setReceivedDocs(new Set());
    setError("");
    onOpenChange(false);
  }

  function updateLine(id: string, patch: Partial<PaymentLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function toggleDoc(key: DocTypeKey) {
    setReceivedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ── Balance ───────────────────────────────────────────────────────────────

  const totalNuevo = lines.reduce((sum, l) => sum + parseMontoInput(l.monto), 0);
  const totalPagado = existingTotal + totalNuevo;

  const remaining = salePrice !== null ? salePrice - totalPagado : null;

  // ── Submit ────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    for (const l of lines) {
      const monto = parseMontoInput(l.monto);
      if (monto <= 0) {
        setError("Todos los montos deben ser mayores a cero.");
        return;
      }
      if (l.tipo === "check" && (!l.banco.trim() || !l.vencimiento)) {
        setError("Completá banco y fecha de vencimiento en el cheque.");
        return;
      }
      if (l.tipo === "used_vehicle") {
        if (!l.brand.trim() || !l.model.trim()) {
          setError("Completá marca y modelo del auto usado.");
          return;
        }
        if (!l.location.trim()) {
          setError("Indicá la ubicación donde se guarda el auto usado.");
          return;
        }
      }
      if (l.tipo === "retencion" && !l.retentionDate) {
        setError("Indicá la fecha de la retención.");
        return;
      }
    }

    setError("");

    startTransition(async () => {
      try {
        const pagos = lines.map((l) => {
          const monto = parseMontoInput(l.monto);
          if (l.tipo === "check") {
            return { tipo: "check" as const, monto, banco: l.banco, vencimiento: l.vencimiento };
          }
          if (l.tipo === "used_vehicle") {
            return {
              tipo: "used_vehicle" as const,
              monto,
              brand: l.brand,
              model: l.model,
              year: parseInt(l.year),
              vin: l.vin || undefined,
              color: l.color || undefined,
              mileage: l.mileage ? parseInt(l.mileage) : undefined,
              location: l.location,
            };
          }
          if (l.tipo === "retencion") {
            return {
              tipo: "retencion" as const,
              monto,
              retentionType: l.retentionType,
              certNumber: l.certNumber || undefined,
              retentionDate: l.retentionDate,
            };
          }
          return { tipo: l.tipo as "cash" | "transfer", monto };
        });

        await cargaVenta({
          saleId,
          pagos,
          documentosRecibidos: Array.from(receivedDocs),
        });
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrar.");
      }
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Paso 3 — Carga de venta</DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">{vehicleLabel}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto pr-1 pt-1">

          {existingTotal > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm">
              <p className="font-medium text-amber-800">Pago parcial registrado</p>
              <p className="text-amber-700 text-xs mt-0.5">
                Ya cobrado: {formatCurrency(existingTotal)}{salePrice ? ` de ${formatCurrency(salePrice)}` : ""}
              </p>
            </div>
          )}

          {/* ── FORMAS DE PAGO ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Formas de pago
              </p>
              {salePrice !== null && (
                <p className="text-sm text-muted-foreground">
                  Total de venta:{" "}
                  <span className="font-semibold text-foreground">{formatCurrency(salePrice)}</span>
                </p>
              )}
            </div>

            {lines.map((line) => (
              <div key={line.id} className="rounded-lg border p-3 space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="space-y-1.5 w-40 shrink-0">
                    <Label>Tipo</Label>
                    <select
                      value={line.tipo}
                      onChange={(e) => updateLine(line.id, { tipo: e.target.value as TipoPago })}
                      className="w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    >
                      {(Object.keys(PAGO_LABELS) as TipoPago[]).map((t) => (
                        <option key={t} value={t}>{PAGO_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <Label>{line.tipo === "used_vehicle" ? "Tasación ($)" : "Monto ($)"}</Label>
                    <Input
                      value={line.monto}
                      onChange={(e) => updateLine(line.id, { monto: formatMontoInput(e.target.value) })}
                      placeholder="500.000"
                      inputMode="numeric"
                    />
                  </div>

                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="mt-7 text-muted-foreground hover:text-destructive transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>

                {line.tipo === "check" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Banco</Label>
                      <Input
                        value={line.banco}
                        onChange={(e) => updateLine(line.id, { banco: e.target.value })}
                        placeholder="Banco Nación"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fecha de vencimiento</Label>
                      <Input
                        type="date"
                        value={line.vencimiento}
                        onChange={(e) => updateLine(line.id, { vencimiento: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {line.tipo === "retencion" && (
                  <div className="grid grid-cols-3 gap-3 pt-1 border-t">
                    <div className="space-y-1.5">
                      <Label>Tipo de retención</Label>
                      <select
                        value={line.retentionType}
                        onChange={(e) => updateLine(line.id, { retentionType: e.target.value })}
                        className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                      >
                        {RETENTION_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nro. certificado</Label>
                      <Input
                        value={line.certNumber}
                        onChange={(e) => updateLine(line.id, { certNumber: e.target.value })}
                        placeholder="00001234"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fecha *</Label>
                      <Input
                        type="date"
                        value={line.retentionDate}
                        onChange={(e) => updateLine(line.id, { retentionDate: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {line.tipo === "used_vehicle" && (
                  <div className="space-y-3 pt-1 border-t">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label>Marca *</Label>
                        <Input value={line.brand} onChange={(e) => updateLine(line.id, { brand: e.target.value })} placeholder="Toyota" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Modelo *</Label>
                        <Input value={line.model} onChange={(e) => updateLine(line.id, { model: e.target.value })} placeholder="Corolla" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Año</Label>
                        <Input type="number" value={line.year} onChange={(e) => updateLine(line.id, { year: e.target.value })} min={1990} max={new Date().getFullYear()} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label>VIN / Patente</Label>
                        <Input value={line.vin} onChange={(e) => updateLine(line.id, { vin: e.target.value })} placeholder="AB123CD" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Color</Label>
                        <Input value={line.color} onChange={(e) => updateLine(line.id, { color: e.target.value })} placeholder="Blanco" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Kilometraje</Label>
                        <Input type="number" value={line.mileage} onChange={(e) => updateLine(line.id, { mileage: e.target.value })} placeholder="80000" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Ubicación (cochera) *</Label>
                      <Input value={line.location} onChange={(e) => updateLine(line.id, { location: e.target.value })} placeholder="Cochera 2 — San Miguel" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Totales y balance */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
                className="text-sm text-primary hover:underline"
              >
                + Agregar forma de pago
              </button>

              {salePrice !== null && totalPagado > 0 && (
                <div className="text-sm text-right space-y-0.5">
                  <p className="text-muted-foreground">
                    Cargado: <span className="font-medium text-foreground">{formatCurrency(totalPagado)}</span>
                  </p>
                  {remaining !== null && remaining !== 0 && (
                    <p className={remaining > 0 ? "text-amber-600 font-medium" : "text-destructive font-medium"}>
                      {remaining > 0 ? `Restante: ${formatCurrency(remaining)}` : `Excede en: ${formatCurrency(Math.abs(remaining))}`}
                    </p>
                  )}
                  {remaining === 0 && (
                    <p className="text-green-700 font-medium">✓ Pago completo</p>
                  )}
                </div>
              )}
            </div>
          </section>

          <div className="border-t" />

          {/* ── DOCUMENTOS ── */}
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Documentos recibidos{" "}
              <span className="font-normal normal-case">(marcá los que ya tenés en mano)</span>
            </p>

            {DOC_TYPES.map((doc) => {
              const checked = receivedDocs.has(doc.key);
              return (
                <label
                  key={doc.key}
                  className="flex items-center gap-3 py-1.5 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDoc(doc.key)}
                    className="h-4 w-4 rounded border-input accent-foreground"
                  />
                  <span className={`text-sm ${checked ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {doc.label}
                  </span>
                  {checked && (
                    <span className="text-xs text-green-700 ml-auto">✓ Recibido</span>
                  )}
                </label>
              );
            })}
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Confirmar carga"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
