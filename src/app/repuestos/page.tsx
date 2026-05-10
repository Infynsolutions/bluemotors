import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { NuevoArticuloDialog } from "@/features/repuestos/components/nuevo-articulo-dialog";
import { AjustarStockDialog } from "@/features/repuestos/components/ajustar-stock-dialog";
import { RepuestosFiltros } from "@/features/repuestos/components/repuestos-filtros";

export const dynamic = "force-dynamic";

export default async function RepuestosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { q, categoria } = await searchParams;

  const [parts, categories] = await Promise.all([
    prisma.part.findMany({
      where: {
        active: true,
        ...(q ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
          ],
        } : {}),
        ...(categoria ? { categoryId: categoria } : {}),
      },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.partCategory.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const isAdminOrGerente = ["admin", "gerente"].includes(session.user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Repuestos</h1>
          <p className="text-sm text-muted-foreground">{parts.length} artículos</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/repuestos/compras"
            className="h-9 px-4 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors flex items-center"
          >
            Órdenes de compra
          </Link>
          {isAdminOrGerente && (
            <Link
              href="/repuestos/configuracion"
              className="h-9 px-4 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors flex items-center"
            >
              Configuración
            </Link>
          )}
          <NuevoArticuloDialog categories={categories} />
        </div>
      </div>

      {/* Filtros */}
      <Suspense>
        <RepuestosFiltros categories={categories} q={q ?? ""} categoria={categoria ?? ""} />
      </Suspense>

      {/* Tabla */}
      {parts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm rounded-lg border">
          {q || categoria ? "Sin resultados para los filtros aplicados." : "No hay artículos cargados."}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Código</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Artículo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Marca</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">P. Costo</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">P. Venta</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {parts.map((p) => {
                const stockBajo = p.minStock > 0 && p.stock <= p.minStock;
                const sinStock = p.stock === 0;
                return (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.code}</td>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/repuestos/${p.id}`} className="hover:underline underline-offset-2">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.brand || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold tabular-nums ${
                        sinStock ? "text-red-600" : stockBajo ? "text-amber-600" : ""
                      }`}>
                        {p.stock} {p.unit}
                      </span>
                      {stockBajo && !sinStock && (
                        <span className="ml-1 text-xs text-amber-500">↓ mín {p.minStock}</span>
                      )}
                      {sinStock && (
                        <span className="ml-1 text-xs text-red-500">sin stock</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(Number(p.costPrice))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatCurrency(Number(p.salePrice))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Link href={`/repuestos/${p.id}`}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                          Mayor
                        </Link>
                        {isAdminOrGerente && (
                          <AjustarStockDialog partId={p.id} partName={p.name} currentStock={p.stock} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
