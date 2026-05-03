"use client";

import { useState, useTransition } from "react";
import { crearPart } from "@/app/actions/repuestos";
import { formatMontoInput, parseMontoInput } from "@/lib/format";

type Category = { id: string; name: string };

interface Props {
  categories: Category[];
}

export function NuevoArticuloDialog({ categories }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("unidad");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [minStock, setMinStock] = useState("0");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setOpen(false);
    setCode(""); setName(""); setDescription(""); setBrand("");
    setCostPrice(""); setSalePrice(""); setMinStock("0");
    setCategoryId(categories[0]?.id ?? "");
    setUnit("unidad"); setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await crearPart({
          code, name, description, categoryId, brand, unit,
          costPrice: parseMontoInput(costPrice),
          salePrice: parseMontoInput(salePrice),
          minStock: parseInt(minStock) || 0,
        });
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity"
      >
        + Nuevo artículo
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-background rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold">Nuevo artículo</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Código *</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} required
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Categoría *</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Marca</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unidad</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                <option value="unidad">Unidad</option>
                <option value="litro">Litro</option>
                <option value="kg">Kg</option>
                <option value="metro">Metro</option>
                <option value="juego">Juego</option>
                <option value="par">Par</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">P. Costo *</label>
              <input value={costPrice} onChange={(e) => setCostPrice(formatMontoInput(e.target.value))}
                inputMode="numeric" required
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">P. Venta *</label>
              <input value={salePrice} onChange={(e) => setSalePrice(formatMontoInput(e.target.value))}
                inputMode="numeric" required
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Stock mínimo</label>
              <input value={minStock} onChange={(e) => setMinStock(e.target.value)}
                type="number" min="0"
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descripción</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 resize-none" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
              {isPending ? "Guardando..." : "Crear artículo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
