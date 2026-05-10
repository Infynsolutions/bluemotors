"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editarVehiculo } from "@/features/stock/actions";
import { formatMontoInput, parseMontoInput } from "@/lib/format";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  isUsado: boolean;
  vin: string | null;
  motorNumber: string | null;
  color: string | null;
  location: string | null;
  mileage: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicle: Vehicle | null;
  modelos: { id: string; name: string }[];
  ubicaciones: { id: string; name: string }[];
}

export function EditarVehiculoDialog({ open, onOpenChange, vehicle, modelos, ubicaciones }: Props) {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [vin, setVin] = useState("");
  const [motorNumber, setMotorNumber] = useState("");
  const [color, setColor] = useState("");
  const [location, setLocation] = useState("");
  const [mileage, setMileage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (vehicle) {
      setBrand(vehicle.brand);
      setModel(vehicle.model);
      setYear(vehicle.year.toString());
      setPrice(formatMontoInput(vehicle.price.toString()));
      setVin(vehicle.vin ?? "");
      setMotorNumber(vehicle.motorNumber ?? "");
      setColor(vehicle.color ?? "");
      setLocation(vehicle.location ?? "");
      setMileage(vehicle.mileage?.toString() ?? "");
      setError("");
    }
  }, [vehicle]);

  function handleClose() {
    setError("");
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicle) return;
    setError("");
    const priceNum = parseMontoInput(price);
    if (priceNum <= 0) { setError("Ingresá el precio"); return; }
    if (!model.trim()) { setError("Ingresá el modelo"); return; }

    startTransition(async () => {
      try {
        await editarVehiculo(vehicle.id, {
          isUsado: vehicle.isUsado,
          brand,
          model,
          year: parseInt(year),
          price: priceNum,
          vin: vin || undefined,
          motorNumber: motorNumber || undefined,
          color: color || undefined,
          location: location || undefined,
          mileage: vehicle.isUsado && mileage ? parseInt(mileage) : undefined,
        });
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Editar — {vehicle.brand} {vehicle.model} {vehicle.year}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label>Marca *</Label>
            <Input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={!vehicle.isUsado}
              className={!vehicle.isUsado ? "bg-muted" : ""}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Modelo *</Label>
            {!vehicle.isUsado && modelos.length > 0 ? (
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
              <Input value={model} onChange={(e) => setModel(e.target.value)} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Año *</Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} min={1990} max={new Date().getFullYear() + 1} />
            </div>
            <div className="space-y-1.5">
              <Label>Precio ($) *</Label>
              <Input value={price} onChange={(e) => setPrice(formatMontoInput(e.target.value))} inputMode="numeric" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>VIN / Chasis</Label>
              <Input value={vin} onChange={(e) => setVin(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Motor N°</Label>
              <Input value={motorNumber} onChange={(e) => setMotorNumber(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Input value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
            {vehicle.isUsado && (
              <div className="space-y-1.5">
                <Label>Kilometraje</Label>
                <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} />
              </div>
            )}
          </div>

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
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
