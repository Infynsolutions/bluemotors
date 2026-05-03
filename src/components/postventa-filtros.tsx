"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function PostventaFiltros() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [desde, setDesde] = useState(searchParams.get("desde") ?? "");
  const [hasta, setHasta] = useState(searchParams.get("hasta") ?? "");

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    return `/postventa?${p.toString()}`;
  }

  function handleSearch() {
    router.push(buildUrl({ q }));
  }

  function handleDateChange(field: "desde" | "hasta", value: string) {
    if (field === "desde") setDesde(value);
    else setHasta(value);
    router.push(buildUrl({ [field]: value }));
  }

  function handleClear() {
    setQ(""); setDesde(""); setHasta("");
    const p = new URLSearchParams(searchParams.toString());
    p.delete("q"); p.delete("desde"); p.delete("hasta");
    router.push(`/postventa?${p.toString()}`);
  }

  const hasFilters = !!(searchParams.get("q") || searchParams.get("desde") || searchParams.get("hasta"));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Búsqueda */}
      <div className="flex items-center gap-1.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Buscar cliente o patente..."
          className="h-9 w-56 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        <button onClick={handleSearch}
          className="h-9 px-3 rounded-lg border border-input text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          Buscar
        </button>
      </div>

      {/* Desde */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground whitespace-nowrap">Desde</label>
        <input
          type="date"
          lang="es-AR"
          value={desde}
          onChange={(e) => handleDateChange("desde", e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {/* Hasta */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground whitespace-nowrap">Hasta</label>
        <input
          type="date"
          lang="es-AR"
          value={hasta}
          onChange={(e) => handleDateChange("hasta", e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {/* Limpiar */}
      {hasFilters && (
        <button onClick={handleClear}
          className="h-9 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
