import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

const STEP_NAMES = [
  "Venta confirmada",
  "Alta de cliente",
  "Carga de venta",
  "Facturación",
  "Patentamiento",
  "Patente otorgada",
  "Entrega",
];

export default async function VehiculoDetailPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      sales: {
        include: {
          client: true,
          vendor: { select: { name: true } },
          saleSteps: { orderBy: { stepNumber: "asc" } },
          invoice: true,
          patentamiento: true,
          patenteOtorgada: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!vehicle) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ventas" className="hover:text-foreground transition-colors">
          Ventas
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">
          {vehicle.brand} {vehicle.model} {vehicle.year}
        </span>
      </div>

      {/* Ficha técnica */}
      <div className="rounded-lg border p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              {vehicle.brand} {vehicle.model}{" "}
              <span className="text-muted-foreground font-normal">{vehicle.year}</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {vehicle.dominio && (
                <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                  {vehicle.dominio}
                </span>
              )}
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  vehicle.status === "available"
                    ? "bg-green-100 text-green-700"
                    : vehicle.status === "reserved"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {vehicle.status === "available"
                  ? "Disponible"
                  : vehicle.status === "reserved"
                  ? "Reservado"
                  : "Vendido"}
              </span>
              {vehicle.isUsado && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                  Usado
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Precio</p>
            <p className="font-semibold">{formatCurrency(Number(vehicle.price))}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          {vehicle.vin && <Row label="VIN" value={vehicle.vin} />}
          {vehicle.color && <Row label="Color" value={vehicle.color} />}
          {vehicle.mileage !== null && vehicle.mileage !== undefined && (
            <Row label="Kilometraje" value={`${vehicle.mileage.toLocaleString("es-AR")} km`} />
          )}
          {vehicle.location && <Row label="Ubicación" value={vehicle.location} />}
          {vehicle.isPedido && <Row label="Tipo" value="Por pedido a fábrica" />}
          <Row
            label="Ingresado"
            value={new Date(vehicle.createdAt).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          />
        </div>
      </div>

      {/* Historial de ventas */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Historial de ventas
        </h2>

        {vehicle.sales.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ventas registradas.</p>
        ) : (
          vehicle.sales.map((sale) => {
            const completedSteps = sale.saleSteps.filter((s) => s.status === "completed");
            const currentStep = completedSteps.length;

            return (
              <div key={sale.id} className="rounded-lg border p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    {sale.client ? (
                      <Link
                        href={`/ventas/clientes/${sale.client.id}`}
                        className="font-medium hover:underline"
                      >
                        {sale.client.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">Sin cliente</span>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Vendedor: {sale.vendor.name} —{" "}
                      {new Date(sale.createdAt).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {sale.salePrice && (
                    <span className="text-sm font-semibold">
                      {formatCurrency(Number(sale.salePrice))}
                    </span>
                  )}
                </div>

                {/* Timeline de pasos */}
                <div className="space-y-1.5">
                  {STEP_NAMES.map((name, i) => {
                    const stepNum = i + 1;
                    const step = sale.saleSteps.find((s) => s.stepNumber === stepNum);
                    const done = step?.status === "completed";
                    const isCurrent = stepNum === currentStep + 1;

                    return (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            done
                              ? "bg-green-600 text-white"
                              : isCurrent
                              ? "bg-amber-400 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {done ? "✓" : stepNum}
                        </div>
                        <span className={done ? "text-foreground" : "text-muted-foreground"}>
                          {name}
                        </span>
                        {done && step?.completedAt && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {new Date(step.completedAt).toLocaleDateString("es-AR")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Datos extra */}
                {sale.invoice && (
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    Factura {sale.invoice.invoiceType} N° {sale.invoice.invoiceNumber} —{" "}
                    {new Date(sale.invoice.invoiceDate).toLocaleDateString("es-AR")}
                  </div>
                )}
                {sale.patentamiento && (
                  <div className="text-xs text-muted-foreground">
                    Presentado en: {sale.patentamiento.seccional}
                    {sale.patentamiento.numeroExpediente &&
                      ` — Exp. ${sale.patentamiento.numeroExpediente}`}
                  </div>
                )}
                {sale.patenteOtorgada && (
                  <div className="text-xs text-muted-foreground">
                    Dominio:{" "}
                    <span className="font-mono font-medium text-foreground">
                      {sale.patenteOtorgada.numeroDominio}
                    </span>
                    {sale.patenteOtorgada.preEntregaRealizada && (
                      <span className="ml-2 text-green-700">· Pre-entrega ✓</span>
                    )}
                  </div>
                )}

                {currentStep >= 3 && (
                  <div className="border-t pt-2">
                    <a
                      href={`/recibo/${sale.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Ver recibo
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span>{value}</span>
    </div>
  );
}
