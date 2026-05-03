"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearFichaPostventa } from "@/app/actions/postventa";

type Client = { id: string; name: string; phone: string | null; email: string | null };
type Vehicle = { id: string; brand: string; model: string; year: number; dominio: string | null };

interface Props {
  clients: Client[];
  vehicles: Vehicle[];
}

export function NuevaFichaPostventaDialog({ clients, vehicles }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleDominio, setVehicleDominio] = useState("");
  const [vehicleDesc, setVehicleDesc] = useState("");
  const [motivo, setMotivo] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  function handleClientChange(id: string) {
    setClientId(id);
    if (id) {
      const c = clients.find((c) => c.id === id);
      if (c) {
        setClientName(c.name);
        setClientPhone(c.phone ?? "");
      }
    }
  }

  function handleVehicleChange(id: string) {
    setVehicleId(id);
    if (id) {
      const v = vehicles.find((v) => v.id === id);
      if (v) {
        setVehicleDominio(v.dominio ?? "");
        setVehicleDesc(`${v.brand} ${v.model} ${v.year}`);
      }
    }
  }

  function handleClose() {
    setOpen(false);
    setClientId(""); setClientName(""); setClientPhone("");
    setVehicleId(""); setVehicleDominio(""); setVehicleDesc("");
    setMotivo(""); setNotes(""); setScheduledDate(""); setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const id = await crearFichaPostventa({
          clientId: clientId || undefined,
          clientName,
          clientPhone,
          vehicleId: vehicleId || undefined,
          vehicleDominio,
          vehicleDesc,
          motivo,
          notes,
          scheduledDate: scheduledDate || undefined,
        });
        handleClose();
        router.push(`/postventa/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear");
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity">
        + Nueva ficha
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-background rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-base font-semibold">Nueva ficha de postventa</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Recepción del pedido de servicio</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solicitante</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cliente registrado</label>
              <select value={clientId} onChange={(e) => handleClientChange(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                <option value="">— Seleccionar cliente (opcional) —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nombre *</label>
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} required
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Teléfono</label>
                <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
            </div>
          </div>

          {/* Vehículo */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehículo</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Vehículo del sistema</label>
              <select value={vehicleId} onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                <option value="">— Seleccionar vehículo (opcional) —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.dominio} — {v.brand} {v.model} {v.year}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Patente *</label>
                <input value={vehicleDominio} onChange={(e) => setVehicleDominio(e.target.value.toUpperCase())} required
                  placeholder="ABC123"
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm font-mono outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Descripción *</label>
                <input value={vehicleDesc} onChange={(e) => setVehicleDesc(e.target.value)} required
                  placeholder="DFSK Glory 500 2024"
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
              </div>
            </div>
          </div>

          {/* Motivo + turno */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Motivo / descripción del problema *</label>
              <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} required rows={2}
                placeholder="Ej: cambio de aceite, ruido en suspensión delantera..."
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha del turno</label>
              <input type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Observaciones internas</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity">
              {isPending ? "Creando..." : "Crear ficha"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
