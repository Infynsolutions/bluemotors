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

export default async function ClienteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ venta?: string }>;
}) {
  const { clientId } = await params;
  const { venta } = await searchParams;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      sales: {
        include: {
          vehicle: true,
          saleSteps: { orderBy: { stepNumber: "asc" } },
          invoice: true,
          patentamiento: true,
          patenteOtorgada: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) notFound();

  const domicilio = [client.address, client.city, client.province]
    .filter(Boolean)
    .join(", ");

  const activeSaleId = venta ?? client.sales[0]?.id ?? null;
  const activeSale = client.sales.find((s) => s.id === activeSaleId) ?? client.sales[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ventas" className="hover:text-foreground transition-colors">
          Ventas
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{client.name}</span>
      </div>

      {/* Datos del cliente */}
      <div className="rounded-lg border p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{client.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {client.clientType === "FISICA" ? "Persona Física" : "Persona Jurídica"}
            </p>
          </div>
          <span className="text-xs bg-muted rounded-full px-3 py-1 text-muted-foreground">
            {client.sales.length} venta{client.sales.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          {client.clientType === "FISICA" ? (
            <>
              {client.dni && <Row label="DNI" value={client.dni} />}
              {client.cuit && <Row label="CUIT/CUIL" value={client.cuit} />}
              {client.maritalStatus && <Row label="Estado civil" value={client.maritalStatus} />}
              {client.profession && <Row label="Profesión" value={client.profession} />}
            </>
          ) : (
            <>
              {client.cuit && <Row label="CUIT" value={client.cuit} />}
              {client.legalRepresentative && (
                <Row label="Rep. legal" value={client.legalRepresentative} />
              )}
            </>
          )}
          {domicilio && <Row label="Domicilio" value={domicilio} />}
          {client.postalCode && <Row label="Código postal" value={client.postalCode} />}
          {client.phone && <Row label="Teléfono" value={client.phone} />}
          {client.email && <Row label="Email" value={client.email} />}
          {client.ivaCondition && <Row label="Cond. IVA" value={client.ivaCondition} />}
        </div>
      </div>

      {/* Historial de ventas con pestañas */}
      {client.sales.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin ventas registradas.</p>
      ) : (
        <div className="space-y-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Historial de ventas
          </h2>

          {/* Pestañas */}
          <div className="flex gap-1 border-b overflow-x-auto pb-0">
            {client.sales.map((sale) => {
              const isActive = sale.id === activeSale?.id;
              const completedSteps = sale.saleSteps.filter((s) => s.status === "completed").length;
              return (
                <Link
                  key={sale.id}
                  href={`/ventas/clientes/${clientId}?venta=${sale.id}`}
                  className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                  }`}
                >
                  {sale.vehicle.brand} {sale.vehicle.model} {sale.vehicle.year}
                  {sale.vehicle.dominio && (
                    <span className="ml-1.5 text-xs font-mono opacity-60">
                      {sale.vehicle.dominio}
                    </span>
                  )}
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    completedSteps === 7 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {completedSteps}/7
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Contenido de la pestaña activa */}
          {activeSale && (() => {
            const completedSteps = activeSale.saleSteps.filter((s) => s.status === "completed").length;
            return (
              <div className="rounded-b-lg border border-t-0 p-5 space-y-5">
                {/* Cabecera */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activeSale.createdAt).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {activeSale.salePrice && (
                    <span className="text-base font-semibold">
                      {formatCurrency(Number(activeSale.salePrice))}
                    </span>
                  )}
                </div>

                {/* Timeline */}
                <div className="space-y-2">
                  {STEP_NAMES.map((name, i) => {
                    const stepNum = i + 1;
                    const step = activeSale.saleSteps.find((s) => s.stepNumber === stepNum);
                    const done = step?.status === "completed";
                    const isCurrent = stepNum === completedSteps + 1;

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
                {(activeSale.invoice || activeSale.patentamiento || activeSale.patenteOtorgada) && (
                  <div className="border-t pt-3 space-y-1 text-xs text-muted-foreground">
                    {activeSale.invoice && (
                      <p>
                        Factura {activeSale.invoice.invoiceType} N°{" "}
                        {activeSale.invoice.invoiceNumber} —{" "}
                        {new Date(activeSale.invoice.invoiceDate).toLocaleDateString("es-AR")}
                      </p>
                    )}
                    {activeSale.patentamiento && (
                      <p>
                        Presentado en: {activeSale.patentamiento.seccional}
                        {activeSale.patentamiento.numeroExpediente &&
                          ` — Exp. ${activeSale.patentamiento.numeroExpediente}`}
                      </p>
                    )}
                    {activeSale.patenteOtorgada && (
                      <p>
                        Dominio:{" "}
                        <span className="font-mono font-medium text-foreground">
                          {activeSale.patenteOtorgada.numeroDominio}
                        </span>
                        {activeSale.patenteOtorgada.preEntregaRealizada && (
                          <span className="ml-2 text-green-700">· Pre-entrega ✓</span>
                        )}
                      </p>
                    )}
                  </div>
                )}

                {completedSteps >= 3 && (
                  <div className="border-t pt-3">
                    <a
                      href={`/recibo/${activeSale.id}`}
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
          })()}
        </div>
      )}
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
