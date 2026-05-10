"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";

type Category = { id: string; name: string };

interface Props {
  categories: Category[];
  q: string;
  categoria: string;
}

export function RepuestosFiltros({ categories, q, categoria }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function navigate(next: URLSearchParams) {
    startTransition(() => router.push(`/repuestos?${next.toString()}`));
  }

  function onCategoriaChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("categoria", value);
    else next.delete("categoria");
    navigate(next);
  }

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const value = (form.elements.namedItem("q") as HTMLInputElement).value;
    const next = new URLSearchParams(params.toString());
    if (value) next.set("q", value);
    else next.delete("q");
    navigate(next);
  }

  const hasFilters = q || categoria;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <form onSubmit={onSearch} className="flex items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por código, nombre o marca..."
          className="h-9 w-72 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        <button type="submit"
          className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80">
          Buscar
        </button>
      </form>

      <select
        value={categoria}
        onChange={(e) => onCategoriaChange(e.target.value)}
        className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring"
      >
        <option value="">Todas las categorías</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {hasFilters && (
        <Link href="/repuestos"
          className="h-9 px-3 rounded-lg border border-input text-sm hover:bg-muted transition-colors flex items-center">
          Limpiar
        </Link>
      )}
    </div>
  );
}
