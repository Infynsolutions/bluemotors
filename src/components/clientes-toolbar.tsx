"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";

interface Cliente {
  nombre: string;
  tipo: string;
  dni: string;
  cuit: string;
  telefono: string;
  email: string;
  domicilio: string;
  ventas: number;
}

interface Props {
  clientes: Cliente[];
}

export function ClientesToolbar({ clientes }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => {
      const next = new URLSearchParams();
      if (q.trim()) next.set("q", q.trim());
      router.push(`/clientes?${next.toString()}`);
    });
  }

  function exportCSV() {
    const headers = ["Nombre", "Tipo", "DNI", "CUIT", "Teléfono", "Email", "Domicilio", "Ventas"];
    const rows = clientes.map((c) => [
      c.nombre, c.tipo, c.dni, c.cuit, c.telefono, c.email, c.domicilio, c.ventas.toString(),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap print:hidden">
      <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, DNI o CUIT..."
          className="flex-1 h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        <button
          type="submit"
          disabled={isPending}
          className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          Buscar
        </button>
      </form>

      <div className="flex gap-2">
        <button
          onClick={exportCSV}
          className="h-9 px-3 rounded-lg border border-input text-sm hover:bg-muted transition-colors"
        >
          Exportar Excel
        </button>
        <button
          onClick={() => window.print()}
          className="h-9 px-3 rounded-lg border border-input text-sm hover:bg-muted transition-colors"
        >
          Exportar PDF
        </button>
      </div>
    </div>
  );
}
