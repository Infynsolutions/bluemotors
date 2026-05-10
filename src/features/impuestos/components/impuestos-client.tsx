"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { eliminarEntradaImpuesto } from "@/features/impuestos/actions";
import { AgregarEntradaImpuestoDialog } from "@/features/impuestos/components/agregar-entrada-impuesto-dialog";
import type { TaxType } from "@/generated/prisma/client";
import type { TaxSummary, LedgerEntry, CompanyOption } from "@/app/impuestos/page";

interface SummaryWithCarry extends TaxSummary {
  entriesInPeriod: LedgerEntry[];
  saldoAnterior: number;
}

interface Props {
  summaries: SummaryWithCarry[];
  activeTab: TaxType;
  periodo: string;
  desde: string;
  hasta: string;
  companies: CompanyOption[];
  activeCompanyId: string;
}

const TAX_LABELS: Record<TaxType, string> = { IVA: "IVA", IIBB: "Ingresos Brutos", TEM: "TEM" };

const ORIGIN_LABEL: Record<LedgerEntry["origin"], string> = {
  auto_factura: "Factura emitida",
  auto_retencion: "Retención",
  manual: "Manual",
};

export function ImpuestosClient({ summaries, activeTab, periodo, desde, hasta, companies, activeCompanyId }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();

  const [localPeriodo, setLocalPeriodo] = useState(periodo);
  const [localDesde, setLocalDesde] = useState(desde);
  const [localHasta, setLocalHasta] = useState(hasta);

  function navigate(next: URLSearchParams) {
    startTransition(() => router.push(`/impuestos?${next.toString()}`));
  }

  function setEmpresa(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("empresa", id);
    navigate(next);
  }

  function setTab(tab: TaxType) {
    const next = new URLSearchParams(params.toString());
    next.set("tab", tab);
    navigate(next);
  }

  function setPeriodo(value: string) {
    setLocalPeriodo(value);
    if (value === "rango") return;
    const next = new URLSearchParams(params.toString());
    next.set("periodo", value);
    next.delete("desde");
    next.delete("hasta");
    navigate(next);
  }

  function applyRango(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    next.set("periodo", "rango");
    if (localDesde) next.set("desde", localDesde);
    if (localHasta) next.set("hasta", localHasta);
    navigate(next);
  }

  async function handleDelete(id: string) {
    setDeleteId(null);
    startDeleting(async () => {
      await eliminarEntradaImpuesto(id);
    });
  }

  const current = summaries.find((s) => s.taxType === activeTab)!;
  const { entriesInPeriod, saldoAnterior } = current;

  const rows: (LedgerEntry & { saldoAcumulado: number })[] = [];
  let running = saldoAnterior;
  for (const e of entriesInPeriod) {
    running += e.debito - e.credito;
    rows.push({ ...e, saldoAcumulado: running });
  }

  const saldoPeriodo = entriesInPeriod.reduce((s, e) => s + e.debito - e.credito, 0);
  void saldoPeriodo;

  return (
    <div className="space-y-5">
      {/* ── Selector de empresa ── */}
      {companies.length > 1 && (
        <div className="flex rounded-lg border border-input overflow-hidden text-sm w-fit">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => setEmpresa(c.id)}
              disabled={isPending}
              className={`px-4 py-2 transition-colors ${
                activeCompanyId === c.id
                  ? "bg-foreground text-background"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Controles ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Tabs por impuesto */}
        <div className="flex rounded-lg border border-input overflow-hidden text-sm">
          {summaries.map((s) => (
            <button
              key={s.taxType}
              onClick={() => setTab(s.taxType)}
              disabled={isPending}
              className={`px-4 py-2 transition-colors ${
                activeTab === s.taxType
                  ? "bg-foreground text-background"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {TAX_LABELS[s.taxType]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Período */}
          <div className="flex rounded-lg border border-input overflow-hidden text-sm">
            {[
              { value: "todos", label: "Todos" },
              { value: "mes", label: "Este mes" },
              { value: "rango", label: "Rango" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPeriodo(value)}
                disabled={isPending}
                className={`px-3 py-1.5 transition-colors ${
                  localPeriodo === value
                    ? "bg-foreground text-background"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {localPeriodo === "rango" && (
            <form onSubmit={applyRango} className="flex items-center gap-2">
              <input
                type="date"
                value={localDesde}
                onChange={(e) => setLocalDesde(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring"
              />
              <span className="text-muted-foreground text-xs">—</span>
              <input
                type="date"
                value={localHasta}
                onChange={(e) => setLocalHasta(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring"
              />
              <button
                type="submit"
                disabled={!localDesde || !localHasta}
                className="h-8 px-3 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-40"
              >
                Aplicar
              </button>
            </form>
          )}

          <button
            onClick={() => setDialogOpen(true)}
            className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity"
          >
            + Entrada manual
          </button>
        </div>
      </div>

      {/* ── Resumen del período ── */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border p-4 space-y-0.5">
          <p className="text-xs text-muted-foreground">Saldo inicial período</p>
          <p className={`text-lg font-bold ${saldoAnterior > 0 ? "text-red-700" : saldoAnterior < 0 ? "text-green-700" : ""}`}>
            {saldoAnterior === 0 ? formatCurrency(0) : (saldoAnterior > 0 ? "A pagar " : "A favor ") + formatCurrency(Math.abs(saldoAnterior))}
          </p>
        </div>
        <div className="rounded-xl border p-4 space-y-0.5">
          <p className="text-xs text-muted-foreground">Débitos del período</p>
          <p className="text-lg font-bold">
            {formatCurrency(entriesInPeriod.reduce((s, e) => s + e.debito, 0))}
          </p>
        </div>
        <div className="rounded-xl border p-4 space-y-0.5">
          <p className="text-xs text-muted-foreground">Créditos del período</p>
          <p className="text-lg font-bold text-green-700">
            {formatCurrency(entriesInPeriod.reduce((s, e) => s + e.credito, 0))}
          </p>
        </div>
        <div className={`rounded-xl border p-4 space-y-0.5 ${
          current.saldoHistorico > 0 ? "bg-red-50 border-red-200" :
          current.saldoHistorico < 0 ? "bg-green-50 border-green-200" : ""
        }`}>
          <p className="text-xs text-muted-foreground">Saldo acumulado</p>
          <p className={`text-lg font-bold ${
            current.saldoHistorico > 0 ? "text-red-700" :
            current.saldoHistorico < 0 ? "text-green-700" : ""
          }`}>
            {formatCurrency(Math.abs(current.saldoHistorico))}
          </p>
          <p className={`text-xs ${
            current.saldoHistorico > 0 ? "text-red-500" :
            current.saldoHistorico < 0 ? "text-green-600" : "text-muted-foreground"
          }`}>
            {current.saldoHistorico > 0 ? "A pagar" : current.saldoHistorico < 0 ? "A favor" : "Neutral"}
          </p>
        </div>
      </div>

      {/* ── Libro mayor ── */}
      {rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm rounded-lg border">
          No hay movimientos en este período.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Concepto</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Origen</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Débito</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Crédito</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {saldoAnterior !== 0 && (
                <tr className="bg-muted/20">
                  <td className="px-4 py-2 text-xs text-muted-foreground" colSpan={3}>
                    Saldo al inicio del período (carry-forward)
                  </td>
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2" />
                  <td className={`px-4 py-2 text-right text-xs font-semibold ${
                    saldoAnterior > 0 ? "text-red-700" : "text-green-700"
                  }`}>
                    {saldoAnterior > 0 ? "+" : ""}{formatCurrency(saldoAnterior)}
                  </td>
                  <td className="px-4 py-2" />
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {row.date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">{row.concept}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.origin === "auto_factura" ? "bg-blue-100 text-blue-700" :
                      row.origin === "auto_retencion" ? "bg-amber-100 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {ORIGIN_LABEL[row.origin]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {row.debito > 0 ? formatCurrency(row.debito) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-green-700">
                    {row.credito > 0 ? formatCurrency(row.credito) : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold text-sm ${
                    row.saldoAcumulado > 0 ? "text-red-700" :
                    row.saldoAcumulado < 0 ? "text-green-700" : ""
                  }`}>
                    {formatCurrency(Math.abs(row.saldoAcumulado))}
                    <span className="text-xs font-normal ml-1">
                      {row.saldoAcumulado > 0 ? "▲" : row.saldoAcumulado < 0 ? "▼" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.deletable && (
                      <>
                        {deleteId === row.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(row.id)}
                              disabled={deleting}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Confirmar
                            </button>
                            <span className="text-muted-foreground">·</span>
                            <button
                              onClick={() => setDeleteId(null)}
                              className="text-xs text-muted-foreground hover:underline"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteId(row.id)}
                            className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/30">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-xs text-muted-foreground text-right">
                  Movimiento neto del período
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold">
                  {formatCurrency(entriesInPeriod.reduce((s, e) => s + e.debito, 0))}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-green-700">
                  {formatCurrency(entriesInPeriod.reduce((s, e) => s + e.credito, 0))}
                </td>
                <td className={`px-4 py-3 text-right text-sm font-bold ${
                  current.saldoHistorico > 0 ? "text-red-700" :
                  current.saldoHistorico < 0 ? "text-green-700" : ""
                }`}>
                  {formatCurrency(Math.abs(current.saldoHistorico))}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <AgregarEntradaImpuestoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultTaxType={activeTab}
        companyId={activeCompanyId}
        companies={companies}
      />
    </div>
  );
}
