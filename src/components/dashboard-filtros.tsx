"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function DashboardFiltros() {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlPeriodo = params.get("periodo") ?? "todos";
  // Estado local para mostrar inputs sin navegar todavía
  const [localPeriodo, setLocalPeriodo] = useState(urlPeriodo);
  const [desde, setDesde] = useState(params.get("desde") ?? "");
  const [hasta, setHasta] = useState(params.get("hasta") ?? "");

  function navigate(next: URLSearchParams) {
    startTransition(() => router.push(`/dashboard?${next.toString()}`));
  }

  function handlePeriodoClick(value: string) {
    setLocalPeriodo(value);
    if (value === "rango") return; // esperar que el usuario elija fechas
    const next = new URLSearchParams();
    if (value !== "todos") next.set("periodo", value);
    navigate(next);
  }

  function applyRango(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams({ periodo: "rango" });
    if (desde) next.set("desde", desde);
    if (hasta) next.set("hasta", hasta);
    navigate(next);
  }

  const activeButton = localPeriodo;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex rounded-lg border border-input overflow-hidden text-sm">
        {[
          { value: "todos", label: "Todos" },
          { value: "mes", label: "Este mes" },
          { value: "rango", label: "Rango" },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handlePeriodoClick(value)}
            disabled={isPending}
            className={`px-3 py-1.5 transition-colors ${
              activeButton === value
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
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring"
          />
          <span className="text-muted-foreground text-xs">—</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring"
          />
          <button
            type="submit"
            disabled={isPending || !desde || !hasta}
            className="h-8 px-3 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            Aplicar
          </button>
        </form>
      )}
    </div>
  );
}
