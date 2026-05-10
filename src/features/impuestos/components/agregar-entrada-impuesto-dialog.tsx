"use client";

import { useState, useTransition } from "react";
import { agregarEntradaImpuesto } from "@/features/impuestos/actions";
import { formatMontoInput, parseMontoInput } from "@/lib/format";
import type { TaxType, TaxEntryKind } from "@/generated/prisma/client";
import type { CompanyOption } from "@/app/impuestos/page";

const TAX_LABELS: Record<TaxType, string> = {
  IVA: "IVA",
  IIBB: "IIBB",
  TEM: "TEM",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTaxType: TaxType;
  companyId: string;
  companies: CompanyOption[];
}

export function AgregarEntradaImpuestoDialog({ open, onOpenChange, defaultTaxType, companyId, companies }: Props) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId);
  const [taxType, setTaxType] = useState<TaxType>(defaultTaxType);
  const [kind, setKind] = useState<TaxEntryKind>("debito");
  const [concept, setConcept] = useState("");
  const [monto, setMonto] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setConcept("");
    setMonto("");
    setDate(new Date().toISOString().slice(0, 10));
    setKind("debito");
    setTaxType(defaultTaxType);
    setSelectedCompanyId(companyId);
    setError(null);
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = parseMontoInput(monto);
    startTransition(async () => {
      try {
        await agregarEntradaImpuesto({ companyId: selectedCompanyId, taxType, kind, concept, amount, date });
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-background rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold">Nueva entrada manual</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Factura recibida, pago de impuesto u otro movimiento
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Empresa */}
          {companies.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Empresa</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Impuesto</label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value as TaxType)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                {(Object.keys(TAX_LABELS) as TaxType[]).map((t) => (
                  <option key={t} value={t}>{TAX_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as TaxEntryKind)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option value="debito">Débito (genera obligación)</option>
                <option value="credito">Crédito (reduce obligación)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Concepto *</label>
            <input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej: Factura recibida — Proveedor S.A., Pago VEP IIBB mayo..."
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Monto ($) *</label>
              <input
                value={monto}
                onChange={(e) => setMonto(formatMontoInput(e.target.value))}
                placeholder="0"
                inputMode="numeric"
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
            >
              {isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
