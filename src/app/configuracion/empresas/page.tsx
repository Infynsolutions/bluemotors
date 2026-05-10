"use client";

import { useEffect, useState, useTransition } from "react";
import { getEmpresas, actualizarEmpresa } from "@/features/empresas/actions";

type Company = Awaited<ReturnType<typeof getEmpresas>>[number];

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [editing, setEditing] = useState<Company | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getEmpresas().then(setCompanies);
  }, []);

  function startEdit(c: Company) {
    setEditing({ ...c });
    setError("");
    setSuccess("");
  }

  function handleChange(field: keyof Company, value: string) {
    if (!editing) return;
    setEditing({ ...editing, [field]: value });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        await actualizarEmpresa({
          id: editing.id,
          name: editing.name,
          razonSocial: editing.razonSocial ?? "",
          cuit: editing.cuit ?? "",
          address: editing.address ?? "",
          phone: editing.phone ?? "",
          email: editing.email ?? "",
        });
        const updated = await getEmpresas();
        setCompanies(updated);
        setEditing(null);
        setSuccess("Guardado.");
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Configuración — Empresas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Datos fiscales de cada empresa del grupo.
        </p>
      </div>

      {success && (
        <p className="text-sm text-green-600 font-medium">{success}</p>
      )}

      <div className="space-y-4">
        {companies.map((c) =>
          editing?.id === c.id ? (
            <form key={c.id} onSubmit={handleSave} className="rounded-xl border p-5 space-y-4">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Editando empresa
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nombre *</label>
                  <input
                    value={editing.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Razón Social</label>
                  <input
                    value={editing.razonSocial ?? ""}
                    onChange={(e) => handleChange("razonSocial", e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">CUIT</label>
                  <input
                    value={editing.cuit ?? ""}
                    onChange={(e) => handleChange("cuit", e.target.value)}
                    placeholder="20-12345678-9"
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Teléfono</label>
                  <input
                    value={editing.phone ?? ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-sm font-medium">Domicilio</label>
                  <input
                    value={editing.address ?? ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={editing.email ?? ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
                >
                  {isPending ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div key={c.id} className="rounded-xl border p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  {c.razonSocial && (
                    <p className="text-sm text-muted-foreground">{c.razonSocial}</p>
                  )}
                </div>
                <button
                  onClick={() => startEdit(c)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Editar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-muted-foreground">CUIT</span>
                <span>{c.cuit || "—"}</span>
                <span className="text-muted-foreground">Domicilio</span>
                <span>{c.address || "—"}</span>
                <span className="text-muted-foreground">Teléfono</span>
                <span>{c.phone || "—"}</span>
                <span className="text-muted-foreground">Email</span>
                <span>{c.email || "—"}</span>
              </div>
              {!c.cuit && !c.address && !c.phone && !c.email && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
                  Completá los datos fiscales para que aparezcan en las facturas.
                </p>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
