"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NuevaVentaDialog } from "@/features/ventas/components/nueva-venta-dialog";
import { CargaVentaDialog } from "@/features/ventas/components/carga-venta-dialog";
import { CargaFacturaDialog } from "@/features/ventas/components/carga-factura-dialog";
import { CargaPatentamientoDialog } from "@/features/ventas/components/carga-patentamiento-dialog";
import { CargaPatenteOtorgadaDialog } from "@/features/ventas/components/carga-patente-otorgada-dialog";
import { CargaEntregaDialog } from "@/features/ventas/components/carga-entrega-dialog";
import { AsignarVehiculoDialog } from "@/features/ventas/components/asignar-vehiculo-dialog";
import { CancelarVentaDialog } from "@/features/ventas/components/cancelar-venta-dialog";
import Link from "next/link";
import type { Role } from "@/generated/prisma/client";

const STEP_COLORS: Record<number, string> = {
  0: "bg-slate-100 text-slate-700",
  1: "bg-blue-100 text-blue-700",
  2: "bg-violet-100 text-violet-700",
  3: "bg-amber-100 text-amber-700",
  4: "bg-orange-100 text-orange-700",
  5: "bg-cyan-100 text-cyan-700",
  6: "bg-green-100 text-green-700",
  7: "bg-emerald-100 text-emerald-800",
};

interface Sale {
  id: string;
  status: string;
  currentStep: number;
  salePrice: number | null;
  totalPagado: number;
  createdAt: Date;
  lastStepUpdatedAt: Date | null;
  cancelReason: string | null;
  cancelledAt: Date | null;
  vendor: { name: string };
  client: { id: string; name: string } | null;
  vehicle: { id: string; brand: string; model: string; year: number; isPedido: boolean };
  _count: { documents: number };
}

interface SalesBoardProps {
  sales: Sale[];
  stepNames: string[];
  role: Role;
  userId: string;
}

export function SalesBoard({ sales, stepNames, role, userId }: SalesBoardProps) {
  const [open, setOpen] = useState(false);
  const [cargaSale, setCargaSale] = useState<{ id: string; vehicleLabel: string; salePrice: number | null; existingTotal: number } | null>(null);
  const [facturaSaleId, setFacturaSaleId] = useState<string | null>(null);
  const [patentamientoSale, setPatentamientoSale] = useState<{ id: string; vehicleLabel: string } | null>(null);
  const [patenteOtorgadaSale, setPatenteOtorgadaSale] = useState<{ id: string; vehicleLabel: string } | null>(null);
  const [entregaSale, setEntregaSale] = useState<{ id: string; vehicleLabel: string; clientName: string } | null>(null);
  const [asignarSale, setAsignarSale] = useState<{ id: string; pedidoLabel: string } | null>(null);
  const [cancelSale, setCancelSale] = useState<{ id: string; vehicleLabel: string } | null>(null);

  const daysSince = (date: Date | null) => {
    if (!date) return null;
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <div className="space-y-4">
      {(role === "vendedor" || role === "admin") && (
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}>+ Nueva venta</Button>
        </div>
      )}

      {sales.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No hay ventas activas.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vehículo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vendedor</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paso actual</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sales.map((sale) => {
                const days = daysSince(sale.lastStepUpdatedAt ?? sale.createdAt);
                const isStale = days !== null && days >= 5;
                return (
                  <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/ventas/vehiculos/${sale.vehicle.id ?? ""}`}
                        className="hover:underline"
                      >
                        {sale.vehicle.brand} {sale.vehicle.model}{" "}
                        <span className="text-muted-foreground font-normal">
                          {sale.vehicle.year}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {sale.client ? (
                        <Link
                          href={`/ventas/clientes/${sale.client.id}`}
                          className="hover:underline hover:text-foreground transition-colors"
                        >
                          {sale.client.name}
                        </Link>
                      ) : (
                        <span className="italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{sale.vendor.name}</td>
                    <td className="px-4 py-3">
                      {sale.status === "cancelled" ? (
                        <div>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                            Cancelada
                          </span>
                          {sale.cancelReason && (
                            <p className="text-xs text-muted-foreground mt-1">{sale.cancelReason}</p>
                          )}
                        </div>
                      ) : (() => {
                        const isCobrado =
                          sale.currentStep === 3 &&
                          sale.salePrice !== null &&
                          sale.totalPagado >= sale.salePrice;
                        const isParcial =
                          sale.currentStep === 3 &&
                          sale.totalPagado > 0 &&
                          !isCobrado;
                        const isCobro = sale.currentStep === 3 && sale.totalPagado === 0;
                        if (isCobrado) {
                          return (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 whitespace-nowrap">
                              4. Cobrado
                            </span>
                          );
                        }
                        if (isParcial) {
                          return (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 whitespace-nowrap">
                              4. Cobro parcial
                            </span>
                          );
                        }
                        if (isCobro) {
                          return (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 whitespace-nowrap">
                              4. Cobro
                            </span>
                          );
                        }
                        return (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${
                              STEP_COLORS[sale.currentStep] ?? STEP_COLORS[0]
                            }`}
                          >
                            {sale.currentStep === 7
                              ? "Completada"
                              : `${sale.currentStep + 1}. ${stepNames[sale.currentStep]}`}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2 flex-wrap">
                      {sale.status !== "cancelled" && (
                        <>
                          {sale.vehicle.isPedido && role === "admin" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAsignarSale({
                                id: sale.id,
                                pedidoLabel: `${sale.vehicle.brand} ${sale.vehicle.model} ${sale.vehicle.year}`,
                              })}
                            >
                              Asignar vehículo
                            </Button>
                          )}
                          {sale.currentStep === 2 && role === "admin" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setFacturaSaleId(sale.id)}
                            >
                              Cargar factura
                            </Button>
                          )}
                          {sale.currentStep === 3 && role === "admin" &&
                            (sale.salePrice === null || sale.totalPagado < sale.salePrice) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setCargaSale({
                                  id: sale.id,
                                  vehicleLabel: `${sale.vehicle.brand} ${sale.vehicle.model} ${sale.vehicle.year}`,
                                  salePrice: sale.salePrice,
                                  existingTotal: sale.totalPagado,
                                })
                              }
                            >
                              Cargar cobro
                            </Button>
                          )}
                          {sale.currentStep === 4 && role === "admin" && !sale.vehicle.isPedido && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPatentamientoSale({
                                  id: sale.id,
                                  vehicleLabel: `${sale.vehicle.brand} ${sale.vehicle.model} ${sale.vehicle.year}`,
                                })
                              }
                            >
                              Cargar patentamiento
                            </Button>
                          )}
                          {sale.currentStep === 5 && role === "admin" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPatenteOtorgadaSale({
                                  id: sale.id,
                                  vehicleLabel: `${sale.vehicle.brand} ${sale.vehicle.model} ${sale.vehicle.year}`,
                                })
                              }
                            >
                              Patente otorgada
                            </Button>
                          )}
                          {sale.currentStep === 6 && role === "admin" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEntregaSale({
                                  id: sale.id,
                                  vehicleLabel: `${sale.vehicle.brand} ${sale.vehicle.model} ${sale.vehicle.year}`,
                                  clientName: sale.client?.name ?? "",
                                })
                              }
                            >
                              Registrar entrega
                            </Button>
                          )}
                          {sale.status === "active" && (role === "admin" || role === "gerente") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setCancelSale({
                                id: sale.id,
                                vehicleLabel: `${sale.vehicle.brand} ${sale.vehicle.model} ${sale.vehicle.year}`,
                              })}
                            >
                              Cancelar
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <NuevaVentaDialog open={open} onOpenChange={setOpen} role={role} />

      {facturaSaleId && (
        <CargaFacturaDialog
          open={true}
          onOpenChange={(v) => { if (!v) setFacturaSaleId(null); }}
          saleId={facturaSaleId}
        />
      )}

      {patentamientoSale && (
        <CargaPatentamientoDialog
          open={true}
          onOpenChange={(v) => { if (!v) setPatentamientoSale(null); }}
          saleId={patentamientoSale.id}
          vehicleLabel={patentamientoSale.vehicleLabel}
        />
      )}

      {patenteOtorgadaSale && (
        <CargaPatenteOtorgadaDialog
          open={true}
          onOpenChange={(v) => { if (!v) setPatenteOtorgadaSale(null); }}
          saleId={patenteOtorgadaSale.id}
          vehicleLabel={patenteOtorgadaSale.vehicleLabel}
        />
      )}

      {entregaSale && (
        <CargaEntregaDialog
          open={true}
          onOpenChange={(v) => { if (!v) setEntregaSale(null); }}
          saleId={entregaSale.id}
          vehicleLabel={entregaSale.vehicleLabel}
          clientName={entregaSale.clientName}
        />
      )}

      {asignarSale && (
        <AsignarVehiculoDialog
          open={true}
          onOpenChange={(v) => { if (!v) setAsignarSale(null); }}
          saleId={asignarSale.id}
          pedidoLabel={asignarSale.pedidoLabel}
        />
      )}

      {cargaSale && (
        <CargaVentaDialog
          open={true}
          onOpenChange={(v) => { if (!v) setCargaSale(null); }}
          saleId={cargaSale.id}
          vehicleLabel={cargaSale.vehicleLabel}
          salePrice={cargaSale.salePrice}
          existingTotal={cargaSale.existingTotal}
        />
      )}

      {cancelSale && (
        <CancelarVentaDialog
          open={true}
          onOpenChange={(v) => { if (!v) setCancelSale(null); }}
          saleId={cancelSale.id}
          vehicleLabel={cancelSale.vehicleLabel}
        />
      )}
    </div>
  );
}
