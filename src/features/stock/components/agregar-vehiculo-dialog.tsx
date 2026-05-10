"use client";

import { useState, useTransition } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agregarVehiculo } from "@/features/stock/actions";
import { formatMontoInput, parseMontoInput } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modelos: { id: string; name: string }[];
  ubicaciones: { id: string; name: string }[];
}

type Tab = "0km" | "usado";

export function AgregarVehiculoDialog({ open, onOpenChange, modelos, ubicaciones }: Props) {
  const [tab, setTab] = useState<Tab>("0km");
  const [brand, setBrand] = useState("DFSK");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [price, setPrice] = useState("");
  const [vin, setVin] = useState("");
  const [motorNumber, setMotorNumber] = useState("");
  const [color, setColor] = useState("");
  const [location, setLocation] = useState("");
  const [mileage, setMileage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setTab("0km");
    setBrand("DFSK");
    setModel("");
    setYear(new Date().getFullYear().toString());
    setPrice("");
    setVin("");
    setMotorNumber("");
    setColor("");
    setLocation("");
    setMileage("");
    setError("");
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  function handleTabChange(t: Tab) {
    setTab(t);
    setBrand(t === "0km" ? "DFSK" : "");
    setModel("");
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const priceNum = parseMontoInput(price);
    if (priceNum <= 0) { setError("Ingresá el precio"); return; }
    if (!model.trim()) { setError("Ingresá el modelo"); return; }

    startTransition(async () => {
      try {
        await agregarVehiculo({
          isUsado: tab === "usado",
          brand: tab === "0km" ? "DFSK" : brand,
          model,
          year: parseInt(year),
          price: priceNum,
          vin: vin || undefined,
          motorNumber: motorNumber || undefined,
          color: color || undefined,
          location: location || undefined,
          mileage: tab === "usado" && mileage ? parseInt(mileage) : undefined,
        });
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  const isUsado = tab === "usado";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar vehículo</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex rounded-lg border overflow-hidden text-sm">
          {(["0km", "usado"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTabChange(t)}
              className={`flex-1 py-2 font-medium transition-colors ${
                tab === t ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {t === "0km" ? "0 km" : "Usado"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Marca */}
          {isUsado ? (
            <div className="space-y-1.5">
              <Label>Marca *</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Toyota, Ford..." />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input value="DFSK" disabled className="bg-muted" />
            </div>
          )}

          {/* Modelo */}
          <div className="space-y-1.5">
            <Label>Modelo *</Label>
            {!isUsado && modelos.length > 0 ? (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option value="">Seleccioná un modelo</option>
                {modelos.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            ) : (
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ej: Corolla" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Año *</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min={1990}
                max={new Date().getFullYear() + 1}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Precio ($) *</Label>
              <Input
                value={price}
                onChange={(e) => setPrice(formatMontoInput(e.target.value))}
                placeholder="6.500.000"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>VIN / Chasis</Label>
              <Input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="9BWZZZ..." />
            </div>
            <div className="space-y-1.5">
              <Label>Motor N°</Label>
              <Input value={motorNumber} onChange={(e) => setMotorNumber(e.target.value)} placeholder="AB123456" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Blanco" />
            </div>
            {isUsado && (
              <div className="space-y-1.5">
                <Label>Kilometraje</Label>
                <Input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="80000"
                />
              </div>
            )}
          </div>

          {/* Ubicación */}
          <div className="space-y-1.5">
            <Label>Ubicación</Label>
            {ubicaciones.length > 0 ? (
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option value="">Sin asignar</option>
                {ubicaciones.map((u) => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
            ) : (
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Cochera 1" />
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Agregar vehículo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
