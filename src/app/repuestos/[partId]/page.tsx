import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  PURCHASE:    "Compra",
  SERVICE_OUT: "Salida postventa",
  SALE_OUT:    "Venta directa",
  ADJUSTMENT:  "Ajuste",
};

const TYPE_COLOR: Record<string, string> = {
  PURCHASE:    "text-green-700 bg-green-50",
  SERVICE_OUT: "text-purple-700 bg-purple-50",
  SALE_OUT:    "text-blue-700 bg-blue-50",
  ADJUSTMENT:  "text-amber-700 bg-amber-50",
};

// Positive = stock in, negative = stock out
function netQuantity(type: string, qty: number): number {
  if (type === "PURCHASE") return qty;
  if (type === "ADJUSTMENT") return qty; // stored as signed
  return -qty; // SERVICE_OUT, SALE_OUT
}

export default async function PartMayorPage({
  params,
}: {
  params: Promise<{ partId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { partId } = await params;

  const part = await prisma.part.findUnique({
    where: { id: partId },
    include: {
      category: true,
      stockMovements: {
        include: { createdBy: { select: { name: true } } },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!part) notFound();

  // Compute running balance per movement
  let balance = 0;
  const movements = part.stockMovements.map((m) => {
    const delta = netQuantity(m.type, m.quantity);
    balance += delta;
    return { ...m, delta, runningBalance: balance };
  });

  // Show newest first for the table
  const movementsDesc = [...movements].reverse();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Link href="/repuestos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Repuestos
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-sm text-muted-foreground">{part.code}</span>
        </div>
        <h1 className="text-xl font-semibold mt-1">{part.name}</h1>
        <p className="text-sm text-muted-foreground">{part.category.name}{part.brand ? ` · ${part.brand}` : ""}</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Stock actual</p>
          <p className={`text-2xl font-bold mt-1 ${part.stock === 0 ? "text-red-600" : part.minStock > 0 && part.stock <= part.minStock ? "text-amber-600" : ""}`}>
            {part.stock}
          </p>
          <p className="text-xs text-muted-foreground">{part.unit}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Entradas</p>
          <p className="text-2xl font-bold mt-1 text-green-600">
            +{movements.filter((m) => m.delta > 0).reduce((s, m) => s + m.delta, 0)}
          </p>
          <p className="text-xs text-muted-foreground">total histórico</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Salidas</p>
          <p className="text-2xl font-bold mt-1 text-red-600">
            {movements.filter((m) => m.delta < 0).reduce((s, m) => s + m.delta, 0)}
          </p>
          <p className="text-xs text-muted-foreground">total histórico</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Precio venta</p>
          <p className="text-lg font-bold mt-1">{formatCurrency(Number(part.salePrice))}</p>
          <p className="text-xs text-muted-foreground">costo: {formatCurrency(Number(part.costPrice))}</p>
        </div>
      </div>

      {/* Movimientos */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Movimientos de stock</h2>
        {movements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm rounded-lg border">
            Sin movimientos registrados.
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Referencia</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuario</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cantidad</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movementsDesc.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {m.date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                      {" "}
                      <span className="text-muted-foreground/60">
                        {m.date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[m.type]}`}>
                        {TYPE_LABEL[m.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {m.reference || "—"}
                      {m.notes && <span className="ml-1 text-muted-foreground/60 font-sans not-italic">({m.notes})</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{m.createdBy.name}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${m.delta > 0 ? "text-green-600" : "text-red-600"}`}>
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-sm">
                      {m.runningBalance}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                    Stock actual
                  </td>
                  <td className="px-4 py-2 text-right font-bold tabular-nums">
                    {part.stock} {part.unit}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
