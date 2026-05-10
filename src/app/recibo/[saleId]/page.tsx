import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { PrintButtonPDF } from "@/components/print-button";

const DOC_LABELS: Record<string, string> = {
  dni_front: "DNI (frente)",
  dni_back: "DNI (dorso)",
  cuit: "CUIT",
  form_08: "Formulario 08",
  payment_proof: "Comprobante de pago",
  contract: "Contrato de venta",
};

const PAGO_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  check: "Cheque",
  used_vehicle: "Auto usado (parte de pago)",
};

export default async function ReciboPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      client: true,
      vehicle: true,
      vendor: { select: { name: true } },
      payments: {
        include: {
          checks: true,
          tradeInVehicle: true,
        },
        orderBy: { createdAt: "asc" },
      },
      documents: {
        include: {
          receivedByUser: { select: { name: true } },
        },
      },
      saleSteps: {
        where: { stepNumber: 3 },
        include: {
          completedByUser: { select: { name: true } },
        },
      },
    },
  });

  if (!sale) notFound();

  const step3 = sale.saleSteps[0] ?? null;
  const receiptDate = step3?.completedAt ?? sale.createdAt;
  const processedBy = step3?.completedByUser?.name ?? sale.vendor.name;
  const totalPagado = sale.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const salePrice = sale.salePrice ? Number(sale.salePrice) : null;

  const receivedDocs = sale.documents.filter((d) => d.receivedAt !== null);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden bg-white border-b px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Recibo de pago —{" "}
          <span className="font-medium text-foreground">
            {sale.vehicle.brand} {sale.vehicle.model} {sale.vehicle.year}
          </span>
        </span>
        <PrintButtonPDF />
      </div>

      {/* Receipt */}
      <div className="mx-auto max-w-2xl bg-white shadow-sm print:shadow-none my-8 print:my-0 p-10 print:p-0 font-sans text-[13px] leading-relaxed text-gray-900">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">BLUE MOTORS</h1>
            <p className="text-xs text-gray-500 mt-0.5">Concesionaria DFSK — Tucumán, Argentina</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Recibo N°</p>
            <p className="text-lg font-mono font-semibold">{saleId.slice(-8).toUpperCase()}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {receiptDate.toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="border-t-2 border-gray-900 mb-6 pt-4">
          <p className="text-center text-base font-bold uppercase tracking-widest text-gray-700">
            Recibo de Pago
          </p>
        </div>

        {/* Client */}
        <section className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Datos del cliente
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <Row label="Nombre / Razón social" value={sale.client?.name ?? "—"} />
            {sale.client?.clientType === "FISICA" ? (
              <>
                <Row label="DNI" value={sale.client.dni ?? "—"} />
                <Row label="CUIT" value={sale.client.cuit ?? "—"} />
              </>
            ) : (
              <>
                <Row label="CUIT" value={sale.client?.cuit ?? "—"} />
                <Row label="Rep. legal" value={sale.client?.legalRepresentative ?? "—"} />
              </>
            )}
            <Row label="Domicilio" value={[sale.client?.address, sale.client?.city, sale.client?.province].filter(Boolean).join(", ") || "—"} />
            <Row label="Teléfono" value={sale.client?.phone ?? "—"} />
            <Row label="Email" value={sale.client?.email ?? "—"} />
            <Row label="Cond. IVA" value={sale.client?.ivaCondition ?? "—"} />
          </div>
        </section>

        <div className="border-t border-dashed border-gray-300 my-5" />

        {/* Vehicle */}
        <section className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Vehículo
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <Row
              label="Descripción"
              value={`${sale.vehicle.brand} ${sale.vehicle.model} ${sale.vehicle.year}`}
            />
            {sale.vehicle.vin && <Row label="VIN / Patente" value={sale.vehicle.vin} />}
            {sale.vehicle.color && <Row label="Color" value={sale.vehicle.color} />}
            {salePrice !== null && (
              <Row label="Precio de venta" value={formatCurrency(salePrice)} bold />
            )}
          </div>
        </section>

        <div className="border-t border-dashed border-gray-300 my-5" />

        {/* Payments */}
        <section className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Detalle de pago
          </p>

          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left font-semibold text-gray-600 pb-2 pr-4">Forma</th>
                <th className="text-left font-semibold text-gray-600 pb-2">Detalle</th>
                <th className="text-right font-semibold text-gray-600 pb-2">Monto</th>
              </tr>
            </thead>
            <tbody>
              {sale.payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 align-top">{PAGO_LABELS[p.type] ?? p.type}</td>
                  <td className="py-2 align-top text-gray-600">
                    {p.type === "check" && p.checks[0] && (
                      <span>
                        {p.checks[0].bank} — vence{" "}
                        {new Date(p.checks[0].dueDate).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    {p.type === "used_vehicle" && p.tradeInVehicle && (
                      <span>
                        {p.tradeInVehicle.brand} {p.tradeInVehicle.model}{" "}
                        {p.tradeInVehicle.year}
                        {p.tradeInVehicle.vin ? ` · ${p.tradeInVehicle.vin}` : ""}
                        {p.tradeInVehicle.color ? ` · ${p.tradeInVehicle.color}` : ""}
                        {p.tradeInVehicle.mileage
                          ? ` · ${Number(p.tradeInVehicle.mileage).toLocaleString("es-AR")} km`
                          : ""}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">
                    {formatCurrency(Number(p.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="pt-3 font-bold text-right pr-4">TOTAL RECIBIDO</td>
                <td className="pt-3 text-right font-bold text-lg">
                  {formatCurrency(totalPagado)}
                </td>
              </tr>
              {salePrice !== null && salePrice !== totalPagado && (
                <tr>
                  <td colSpan={2} className="text-right pr-4 text-gray-500 text-xs pt-1">
                    {totalPagado < salePrice ? "Saldo pendiente" : "Excede precio de venta"}
                  </td>
                  <td className="text-right text-xs pt-1 text-amber-700 font-medium">
                    {formatCurrency(Math.abs(salePrice - totalPagado))}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </section>

        {/* Documents */}
        {receivedDocs.length > 0 && (
          <>
            <div className="border-t border-dashed border-gray-300 my-5" />
            <section className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Documentación recibida
              </p>
              <ul className="space-y-0.5">
                {receivedDocs.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-gray-700">
                    <span className="text-green-700 font-bold">✓</span>
                    {DOC_LABELS[d.docType] ?? d.docType}
                    {d.receivedAt && (
                      <span className="text-gray-400 text-xs ml-auto">
                        {new Date(d.receivedAt).toLocaleDateString("es-AR")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-900 mt-8 pt-5 flex justify-between items-end">
          <div className="text-xs text-gray-500">
            <p>Procesado por: <span className="font-semibold text-gray-700">{processedBy}</span></p>
            <p className="mt-0.5">
              Fecha:{" "}
              {receiptDate.toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>BLUE MOTORS</p>
            <p>Concesionaria DFSK Tucumán</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex gap-1">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
