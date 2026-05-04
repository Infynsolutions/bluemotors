import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CuentaCorrientePage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Collect all pending cuenta_corriente debts
  const [serviceInvoices, partSales, pagos] = await Promise.all([
    prisma.serviceInvoice.findMany({
      where: { paymentMethod: "cuenta_corriente", status: "PENDING" },
      include: {
        serviceOrder: {
          select: {
            clientId: true,
            clientName: true,
            vehicleDominio: true,
          },
        },
      },
    }),
    prisma.partSale.findMany({
      where: { paymentMethod: "cuenta_corriente", status: "PENDING" },
      select: {
        id: true,
        clientId: true,
        clientName: true,
        totalAmount: true,
        saleNumber: true,
      },
    }),
    prisma.cuentaCorrientePago.findMany({
      select: { clientId: true, clientName: true, amount: true },
    }),
  ]);

  // Group by clientId (or clientName if no clientId)
  type ClientRow = {
    clientId: string | null;
    clientName: string;
    totalDeuda: number;
    totalPagos: number;
    saldo: number;
  };

  const map = new Map<string, ClientRow>();

  function key(id: string | null, name: string) {
    return id ?? `noId:${name}`;
  }

  function getOrCreate(id: string | null, name: string) {
    const k = key(id, name);
    if (!map.has(k)) {
      map.set(k, { clientId: id, clientName: name, totalDeuda: 0, totalPagos: 0, saldo: 0 });
    }
    return map.get(k)!;
  }

  for (const inv of serviceInvoices) {
    const { clientId, clientName } = inv.serviceOrder;
    const row = getOrCreate(clientId, clientName);
    row.totalDeuda += Number(inv.totalAmount);
  }

  for (const s of partSales) {
    const row = getOrCreate(s.clientId, s.clientName);
    row.totalDeuda += Number(s.totalAmount);
  }

  for (const p of pagos) {
    const row = getOrCreate(p.clientId, p.clientName);
    row.totalPagos += Number(p.amount);
  }

  for (const row of map.values()) {
    row.saldo = row.totalDeuda - row.totalPagos;
  }

  // Sort by saldo desc, filter out fully paid
  const rows = [...map.values()]
    .filter((r) => r.saldo > 0.01)
    .sort((a, b) => b.saldo - a.saldo);

  const totalGeneral = rows.reduce((s, r) => s + r.saldo, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Cuenta corriente</h1>
          <p className="text-sm text-muted-foreground">{rows.length} clientes con saldo pendiente</p>
        </div>
        <div className="rounded-xl border px-5 py-3 text-right">
          <p className="text-xs text-muted-foreground">Total a cobrar</p>
          <p className="text-2xl font-bold">{formatCurrency(totalGeneral)}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm rounded-lg border">
          No hay saldos pendientes en cuenta corriente.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deuda total</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pagos realizados</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={key(r.clientId, r.clientName)} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{r.clientName}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {formatCurrency(r.totalDeuda)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-600">
                    {r.totalPagos > 0 ? formatCurrency(r.totalPagos) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-red-600">
                    {formatCurrency(r.saldo)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={r.clientId ? `/cuenta-corriente/${r.clientId}` : `/cuenta-corriente/sin-id?nombre=${encodeURIComponent(r.clientName)}`}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
