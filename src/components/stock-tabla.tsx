"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { AgregarVehiculoDialog } from "@/components/agregar-vehiculo-dialog";
import { EditarVehiculoDialog } from "@/components/editar-vehiculo-dialog";
import { eliminarVehiculo } from "@/app/actions/stock";
import { formatCurrency } from "@/lib/format";
import type { Role } from "@/generated/prisma/client";

const STATUS_LABEL: Record<string, { label: string; class: string }> = {
  available: { label: "Disponible", class: "bg-green-100 text-green-700" },
  reserved:  { label: "Reservado",  class: "bg-amber-100 text-amber-700" },
  sold:      { label: "Vendido",    class: "bg-slate-100 text-slate-600" },
};

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  isUsado: boolean;
  status: string;
  vin: string | null;
  motorNumber: string | null;
  dominio: string | null;
  color: string | null;
  location: string | null;
  mileage: number | null;
  _count: { sales: number };
}

interface Props {
  vehicles: Vehicle[];
  modelos: { id: string; name: string }[];
  ubicaciones: { id: string; name: string }[];
  role: Role;
}

export function StockTabla({ vehicles, modelos, ubicaciones, role }: Props) {
  const [openAgregar, setOpenAgregar] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    setDeleteError("");
    startTransition(async () => {
      try {
        await eliminarVehiculo(id);
        setDeleteId(null);
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Error al eliminar");
      }
    });
  }

  const canEdit = role === "admin" || role === "vendedor";
  const canDelete = role === "admin";

  return (
    <>
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setOpenAgregar(true)}>+ Agregar vehículo</Button>
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No hay vehículos con los filtros seleccionados.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vehículo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">VIN / Motor</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Color</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ubicación</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Precio</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium capitalize">
                      {v.brand} {v.model}{" "}
                      <span className="text-muted-foreground font-normal">{v.year}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {v.isUsado && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Usado</span>
                      )}
                      {v.dominio && (
                        <span className="text-xs font-mono text-muted-foreground">{v.dominio}</span>
                      )}
                      {v.isUsado && v.mileage !== null && (
                        <span className="text-xs text-muted-foreground">{v.mileage.toLocaleString("es-AR")} km</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{v.vin ?? "—"}</div>
                    {v.motorNumber && <div className="text-xs">{v.motorNumber}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{v.color ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.location ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(v.price)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_LABEL[v.status]?.class ?? ""}`}>
                      {STATUS_LABEL[v.status]?.label ?? v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canEdit && v.status !== "sold" && (
                        <button
                          onClick={() => setEditVehicle(v)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Editar
                        </button>
                      )}
                      {canDelete && v._count.sales === 0 && (
                        <button
                          onClick={() => { setDeleteId(v.id); setDeleteError(""); }}
                          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm delete */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-background rounded-xl border shadow-lg p-6 max-w-sm w-full space-y-4">
            <p className="font-semibold">¿Eliminar vehículo?</p>
            <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isPending}>Cancelar</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteId)} disabled={isPending}>
                {isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AgregarVehiculoDialog
        open={openAgregar}
        onOpenChange={setOpenAgregar}
        modelos={modelos}
        ubicaciones={ubicaciones}
      />

      <EditarVehiculoDialog
        open={!!editVehicle}
        onOpenChange={(v) => { if (!v) setEditVehicle(null); }}
        vehicle={editVehicle}
        modelos={modelos}
        ubicaciones={ubicaciones}
      />
    </>
  );
}
