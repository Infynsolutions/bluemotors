"use client";

import { useEffect, useState, useTransition } from "react";
import { getCategorias, crearCategoria, eliminarCategoria } from "@/app/actions/repuestos";
import { getProveedores, crearProveedor, editarProveedor } from "@/app/actions/compras";

type Category = { id: string; name: string };
type Supplier = { id: string; name: string; contactName: string | null; email: string | null; phone: string | null; cuit: string | null; address: string | null };
type SupplierForm = { name: string; contactName: string; email: string; phone: string; cuit: string; address: string };

const BLANK_SUPPLIER: SupplierForm = { name: "", contactName: "", email: "", phone: "", cuit: "", address: "" };

export default function RepuestosConfigPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [newCat, setNewCat] = useState("");
  const [catError, setCatError] = useState("");
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [newSupplier, setNewSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(BLANK_SUPPLIER);
  const [supplierError, setSupplierError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function reload() {
    const [cats, sups] = await Promise.all([getCategorias(), getProveedores()]);
    setCategories(cats);
    setSuppliers(sups);
  }

  useEffect(() => { reload(); }, []);

  function handleAddCat(e: React.FormEvent) {
    e.preventDefault();
    setCatError("");
    startTransition(async () => {
      try {
        await crearCategoria(newCat);
        setNewCat("");
        await reload();
      } catch (err) { setCatError(err instanceof Error ? err.message : "Error"); }
    });
  }

  function handleDeleteCat(id: string) {
    startTransition(async () => {
      try {
        await eliminarCategoria(id);
        await reload();
      } catch (err) { setCatError(err instanceof Error ? err.message : "Error"); }
    });
  }

  function startNewSupplier() {
    setSupplierForm(BLANK_SUPPLIER);
    setNewSupplier(true);
    setEditingSupplier(null);
    setSupplierError("");
  }

  function startEditSupplier(s: Supplier) {
    setSupplierForm({ name: s.name, contactName: s.contactName ?? "", email: s.email ?? "", phone: s.phone ?? "", cuit: s.cuit ?? "", address: s.address ?? "" } as SupplierForm);
    setEditingSupplier(s);
    setNewSupplier(false);
    setSupplierError("");
  }

  function handleSupplierSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSupplierError("");
    startTransition(async () => {
      try {
        if (editingSupplier) {
          await editarProveedor(editingSupplier.id, supplierForm);
        } else {
          await crearProveedor(supplierForm);
        }
        setEditingSupplier(null);
        setNewSupplier(false);
        await reload();
      } catch (err) { setSupplierError(err instanceof Error ? err.message : "Error"); }
    });
  }

  const showSupplierForm = newSupplier || editingSupplier !== null;

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold">Configuración — Repuestos</h1>
        <p className="text-sm text-muted-foreground mt-1">Categorías de artículos y proveedores.</p>
      </div>

      {/* Categorías */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Categorías</h2>
        {catError && <p className="text-sm text-red-600">{catError}</p>}
        <div className="rounded-lg border divide-y">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{c.name}</span>
              <button onClick={() => handleDeleteCat(c.id)} disabled={isPending}
                className="text-xs text-muted-foreground hover:text-red-600 transition-colors">
                Eliminar
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted-foreground">Sin categorías.</p>
          )}
        </div>
        <form onSubmit={handleAddCat} className="flex gap-2">
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nueva categoría..."
            required
            className="h-9 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
          <button type="submit" disabled={isPending}
            className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
            Agregar
          </button>
        </form>
      </section>

      {/* Proveedores */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Proveedores</h2>
          {!showSupplierForm && (
            <button onClick={startNewSupplier}
              className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity">
              + Nuevo proveedor
            </button>
          )}
        </div>

        {showSupplierForm && (
          <form onSubmit={handleSupplierSubmit} className="rounded-xl border p-4 space-y-4">
            <p className="text-sm font-semibold">{editingSupplier ? "Editar proveedor" : "Nuevo proveedor"}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">Nombre *</label>
                <input value={supplierForm.name} onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))} required
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Contacto</label>
                <input value={supplierForm.contactName ?? ""} onChange={(e) => setSupplierForm((p) => ({ ...p, contactName: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">CUIT</label>
                <input value={supplierForm.cuit ?? ""} onChange={(e) => setSupplierForm((p) => ({ ...p, cuit: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <input type="email" value={supplierForm.email ?? ""} onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Teléfono</label>
                <input value={supplierForm.phone ?? ""} onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">Dirección</label>
                <input value={supplierForm.address ?? ""} onChange={(e) => setSupplierForm((p) => ({ ...p, address: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
            </div>
            {supplierError && <p className="text-sm text-red-600">{supplierError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={isPending}
                className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
                {isPending ? "Guardando..." : "Guardar"}
              </button>
              <button type="button" onClick={() => { setEditingSupplier(null); setNewSupplier(false); }}
                className="h-9 px-4 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="rounded-lg border divide-y">
          {suppliers.map((s) => (
            <div key={s.id} className="flex items-start justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                  {s.contactName && <span className="text-xs text-muted-foreground">{s.contactName}</span>}
                  {s.email && <span className="text-xs text-muted-foreground">{s.email}</span>}
                  {s.phone && <span className="text-xs text-muted-foreground">{s.phone}</span>}
                  {s.cuit && <span className="text-xs text-muted-foreground">CUIT: {s.cuit}</span>}
                </div>
              </div>
              <button onClick={() => startEditSupplier(s)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 shrink-0 ml-4">
                Editar
              </button>
            </div>
          ))}
          {suppliers.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted-foreground">Sin proveedores.</p>
          )}
        </div>
      </section>
    </div>
  );
}
