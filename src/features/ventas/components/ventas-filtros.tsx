"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const PERIODOS = [
  { key: "todos", label: "Todos" },
  { key: "mes", label: "Este mes" },
  { key: "rango", label: "Rango de fechas" },
] as const;

export function VentasFiltros() {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const periodo = params.get("periodo") ?? "todos";
  const [desde, setDesde] = useState(params.get("desde") ?? "");
  const [hasta, setHasta] = useState(params.get("hasta") ?? "");

  function navigate(overrides: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    startTransition(() => router.push(`/ventas?${next.toString()}`));
  }

  function applyRange() {
    if (!desde || !hasta) return;
    navigate({ periodo: "rango", desde, hasta });
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className={`flex rounded-lg border overflow-hidden text-sm ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
        {PERIODOS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => navigate({ periodo: key, desde: "", hasta: "" })}
            className={`px-3 py-1.5 transition-colors ${
              periodo === key
                ? "bg-foreground text-background"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {periodo === "rango" && (
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <button
            onClick={applyRange}
            disabled={!desde || !hasta}
            className="h-8 px-3 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40 hover:opacity-80 transition-opacity"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
