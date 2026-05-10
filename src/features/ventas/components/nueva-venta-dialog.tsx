"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  registrarVenta,
  getVehiclesDisponibles,
  getVendedores,
} from "@/features/ventas/actions";
import { formatCurrency, formatMontoInput, parseMontoInput } from "@/lib/format";
import type { Role } from "@/generated/prisma/client";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
}

interface Vendedor {
  id: string;
  name: string;
}

interface NuevaVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
}

const IVA_OPTIONS = [
  "Consumidor Final",
  "Responsable Inscripto",
  "Monotributista",
  "Exento",
  "No Responsable",
];

const ESTADO_CIVIL_OPTIONS = [
  "Soltero/a",
  "Casado/a",
  "Divorciado/a",
  "Viudo/a",
  "Unión convivencial",
];

export function NuevaVentaDialog({ open, onOpenChange, role }: NuevaVentaDialogProps) {
  // ── Vendedor (admin only) ─────────────────────────────────────────────────
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [selectedVendedorId, setSelectedVendedorId] = useState("");

  // ── Vehículo ──────────────────────────────────────────────────────────────
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tipoVehiculo, setTipoVehiculo] = useState<"stock" | "pedido">("stock");
  const [vehicleId, setVehicleId] = useState("");
  const [pedidoBrand, setPedidoBrand] = useState("");
  const [pedidoModel, setPedidoModel] = useState("");
  const [pedidoYear, setPedidoYear] = useState(new Date().getFullYear().toString());

  // ── Precio ────────────────────────────────────────────────────────────────
  const [salePrice, setSalePrice] = useState("");

  // ── Cliente ───────────────────────────────────────────────────────────────
  const [tipoCliente, setTipoCliente] = useState<"fisica" | "juridica">("fisica");
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [cuit, setCuit] = useState("");
  const [condicionIva, setCondicionIva] = useState("");
  const [estadoCivil, setEstadoCivil] = useState("");
  const [profesion, setProfesion] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [representanteLegal, setRepresentanteLegal] = useState("");
  const [cuitJuridica, setCuitJuridica] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [cp, setCp] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  // ── Otros ─────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    getVehiclesDisponibles().then(setVehicles).catch(() => {});
    if (role === "admin") {
      getVendedores().then(setVendedores).catch(() => {});
    }
  }, [open, role]);

  // Pre-fill salePrice when a stock vehicle is selected
  function handleVehicleChange(id: string) {
    setVehicleId(id);
    const v = vehicles.find((v) => v.id === id);
    setSalePrice(v ? formatMontoInput(v.price.toString()) : "");
  }

  function handleTipoVehiculoChange(tipo: "stock" | "pedido") {
    setTipoVehiculo(tipo);
    if (tipo === "pedido") {
      setVehicleId("");
      setSalePrice("");
    }
  }

  function handleClose() {
    setSelectedVendedorId("");
    setTipoVehiculo("stock");
    setVehicleId("");
    setPedidoBrand("");
    setPedidoModel("");
    setPedidoYear(new Date().getFullYear().toString());
    setSalePrice("");
    setTipoCliente("fisica");
    setNombre("");
    setDni("");
    setCuit("");
    setCondicionIva("");
    setEstadoCivil("");
    setProfesion("");
    setRazonSocial("");
    setRepresentanteLegal("");
    setCuitJuridica("");
    setDomicilio("");
    setCp("");
    setLocalidad("");
    setProvincia("");
    setTelefono("");
    setEmail("");
    setNotes("");
    setError("");
    onOpenChange(false);
  }

  // ── Derivados para precio ─────────────────────────────────────────────────
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null;
  const listPrice = selectedVehicle?.price ?? null;
  const salePriceNum = parseMontoInput(salePrice);
  const discount =
    listPrice && salePriceNum > 0 && salePriceNum < listPrice
      ? listPrice - salePriceNum
      : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (tipoVehiculo === "stock" && !vehicleId) {
      setError("Seleccioná un vehículo.");
      return;
    }
    if (tipoVehiculo === "pedido" && (!pedidoBrand || !pedidoModel)) {
      setError("Completá marca y modelo del vehículo.");
      return;
    }
    if (!salePrice || salePriceNum <= 0) {
      setError("Ingresá el precio de venta.");
      return;
    }
    if (tipoCliente === "fisica" && !nombre.trim()) {
      setError("El nombre del cliente es obligatorio.");
      return;
    }
    if (tipoCliente === "fisica" && !dni.trim()) {
      setError("El DNI es obligatorio.");
      return;
    }
    if (tipoCliente === "juridica" && !razonSocial.trim()) {
      setError("La razón social es obligatoria.");
      return;
    }
    if (tipoCliente === "juridica" && !cuitJuridica.trim()) {
      setError("El CUIT es obligatorio para persona jurídica.");
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const vehiculo =
          tipoVehiculo === "stock"
            ? ({ tipo: "stock", vehicleId } as const)
            : ({
                tipo: "pedido",
                brand: pedidoBrand,
                model: pedidoModel,
                year: parseInt(pedidoYear),
              } as const);

        const cliente =
          tipoCliente === "fisica"
            ? ({
                tipo: "fisica",
                nombre: nombre.trim(),
                dni: dni.trim(),
                cuit: cuit.trim() || undefined,
                domicilio: domicilio.trim() || undefined,
                cp: cp.trim() || undefined,
                localidad: localidad.trim() || undefined,
                provincia: provincia.trim() || undefined,
                telefono: telefono.trim() || undefined,
                email: email.trim() || undefined,
                condicionIva: condicionIva || undefined,
                estadoCivil: estadoCivil || undefined,
                profesion: profesion.trim() || undefined,
              } as const)
            : ({
                tipo: "juridica",
                razonSocial: razonSocial.trim(),
                representanteLegal: representanteLegal.trim() || undefined,
                cuit: cuitJuridica.trim(),
                domicilioFiscal: domicilio.trim() || undefined,
                cp: cp.trim() || undefined,
                localidad: localidad.trim() || undefined,
                provincia: provincia.trim() || undefined,
                telefono: telefono.trim() || undefined,
                email: email.trim() || undefined,
              } as const);

        await registrarVenta({
          vehiculo,
          cliente,
          salePrice: salePriceNum,
          vendorIdOverride: role === "admin" && selectedVendedorId ? selectedVendedorId : undefined,
          notes: notes.trim() || undefined,
        });
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrar la venta.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nueva venta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto pr-1 pt-1">

          {/* ── VENDEDOR (solo admin) ── */}
          {role === "admin" && (
            <>
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendedor</p>
                <div className="space-y-1.5">
                  <Label htmlFor="vendedor">Vendedor que registra la venta</Label>
                  <select
                    id="vendedor"
                    value={selectedVendedorId}
                    onChange={(e) => setSelectedVendedorId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">— Yo mismo (admin) —</option>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </section>
              <div className="border-t" />
            </>
          )}

          {/* ── VEHÍCULO ── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehículo</p>

            <div className="flex rounded-lg border overflow-hidden text-sm">
              <button type="button" onClick={() => handleTipoVehiculoChange("stock")}
                className={`flex-1 py-2 transition-colors ${tipoVehiculo === "stock" ? "bg-foreground text-background font-medium" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                Desde stock
              </button>
              <button type="button" onClick={() => handleTipoVehiculoChange("pedido")}
                className={`flex-1 py-2 transition-colors ${tipoVehiculo === "pedido" ? "bg-foreground text-background font-medium" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                Por pedido
              </button>
            </div>

            {tipoVehiculo === "stock" ? (
              <div className="space-y-1.5">
                <Label htmlFor="vehicle">Vehículo disponible</Label>
                {vehicles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay vehículos en stock.</p>
                ) : (
                  <select
                    id="vehicle"
                    value={vehicleId}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">Seleccionar vehículo...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.brand} {v.model} {v.year} — {formatCurrency(v.price)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">El VIN se carga cuando el vehículo llega de fábrica.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="brand">Marca</Label>
                    <Input id="brand" value={pedidoBrand} onChange={(e) => setPedidoBrand(e.target.value)} placeholder="DFSK" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="year">Año</Label>
                    <Input id="year" type="number" value={pedidoYear} onChange={(e) => setPedidoYear(e.target.value)} min={2020} max={2030} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model">Modelo</Label>
                  <Input id="model" value={pedidoModel} onChange={(e) => setPedidoModel(e.target.value)} placeholder="Glory 500" />
                </div>
              </div>
            )}

            {/* ── PRECIO ── */}
            <div className="space-y-1.5 pt-1">
              {listPrice !== null && (
                <p className="text-xs text-muted-foreground">
                  Precio de lista: <span className="font-medium text-foreground">{formatCurrency(listPrice)}</span>
                </p>
              )}
              <Label htmlFor="salePrice">
                Precio de venta *
                {discount !== null && discount > 0 && (
                  <span className="ml-2 text-xs font-normal text-amber-600">
                    Descuento: {formatCurrency(discount)}
                  </span>
                )}
              </Label>
              <Input
                id="salePrice"
                value={salePrice}
                onChange={(e) => setSalePrice(formatMontoInput(e.target.value))}
                placeholder="6.500.000"
                inputMode="numeric"
              />
            </div>
          </section>

          <div className="border-t" />

          {/* ── CLIENTE ── */}
          <section className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datos del cliente</p>

            <div className="flex rounded-lg border overflow-hidden text-sm">
              <button type="button" onClick={() => setTipoCliente("fisica")}
                className={`flex-1 py-2 transition-colors ${tipoCliente === "fisica" ? "bg-foreground text-background font-medium" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                Persona física
              </button>
              <button type="button" onClick={() => setTipoCliente("juridica")}
                className={`flex-1 py-2 transition-colors ${tipoCliente === "juridica" ? "bg-foreground text-background font-medium" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                Persona jurídica
              </button>
            </div>

            {tipoCliente === "fisica" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">Nombre del cliente *</Label>
                  <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan García" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dni">DNI *</Label>
                    <Input id="dni" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="12345678" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cuit">CUIT / CUIL</Label>
                    <Input id="cuit" value={cuit} onChange={(e) => setCuit(e.target.value)} placeholder="20-12345678-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="condicionIva">Condición fiscal frente a IVA</Label>
                  <select id="condicionIva" value={condicionIva} onChange={(e) => setCondicionIva(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                    <option value="">Seleccionar...</option>
                    {IVA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="razonSocial">Razón social *</Label>
                  <Input id="razonSocial" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="Empresa S.A." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="representanteLegal">Representante legal</Label>
                  <Input id="representanteLegal" value={representanteLegal} onChange={(e) => setRepresentanteLegal(e.target.value)} placeholder="María López" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cuitJuridica">CUIT *</Label>
                  <Input id="cuitJuridica" value={cuitJuridica} onChange={(e) => setCuitJuridica(e.target.value)} placeholder="30-12345678-9" />
                </div>
              </>
            )}

            {/* Campos compartidos */}
            <div className="space-y-1.5">
              <Label htmlFor="domicilio">{tipoCliente === "fisica" ? "Domicilio" : "Domicilio fiscal"}</Label>
              <Input id="domicilio" value={domicilio} onChange={(e) => setDomicilio(e.target.value)} placeholder="Av. Salta 1234" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cp">CP</Label>
                <Input id="cp" value={cp} onChange={(e) => setCp(e.target.value)} placeholder="4000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="localidad">Localidad</Label>
                <Input id="localidad" value={localidad} onChange={(e) => setLocalidad(e.target.value)} placeholder="San Miguel de Tucumán" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="provincia">Provincia</Label>
                <Input id="provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Tucumán" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="381 555-0000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@ejemplo.com" />
              </div>
            </div>
            {tipoCliente === "fisica" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="estadoCivil">Estado civil</Label>
                  <select id="estadoCivil" value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                    <option value="">Seleccionar...</option>
                    {ESTADO_CIVIL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profesion">Profesión</Label>
                  <Input id="profesion" value={profesion} onChange={(e) => setProfesion(e.target.value)} placeholder="Contador/a" />
                </div>
              </div>
            )}
          </section>

          <div className="border-t" />

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones de la venta..." rows={2} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Registrando..." : "Registrar venta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
