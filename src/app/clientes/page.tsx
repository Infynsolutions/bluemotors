import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClientesToolbar } from "@/features/clientes/components/clientes-toolbar";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await auth();
  const { q } = await searchParams;

  const where = q?.trim()
    ? {
        OR: [
          { name: { contains: q.trim(), mode: "insensitive" as const } },
          { dni: { contains: q.trim(), mode: "insensitive" as const } },
          { cuit: { contains: q.trim(), mode: "insensitive" as const } },
        ],
      }
    : {};

  const clients = await prisma.client.findMany({
    where,
    include: { _count: { select: { sales: true } } },
    orderBy: { name: "asc" },
  });

  // Datos normalizados para la toolbar (export)
  const clientesExport = clients.map((c) => ({
    nombre: c.name,
    tipo: c.clientType === "FISICA" ? "Persona Física" : "Persona Jurídica",
    dni: c.dni ?? "",
    cuit: c.cuit ?? "",
    telefono: c.phone ?? "",
    email: c.email ?? "",
    domicilio: [c.address, c.city, c.province].filter(Boolean).join(", "),
    ventas: c._count.sales,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} cliente{clients.length !== 1 ? "s" : ""}
            {q && ` · búsqueda: "${q}"`}
          </p>
        </div>
      </div>

      {/* Título para PDF */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Blue Motors — Listado de clientes</h1>
        {q && <p className="text-sm">Búsqueda: {q}</p>}
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}</p>
      </div>

      <Suspense>
        <ClientesToolbar clientes={clientesExport} />
      </Suspense>

      {clients.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {q ? `No se encontraron clientes para "${q}".` : "No hay clientes registrados."}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 print:bg-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">DNI / CUIT</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Domicilio</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Ventas</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map((c) => {
                const domicilio = [c.address, c.city, c.province].filter(Boolean).join(", ");
                return (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors print:hover:bg-transparent">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/ventas/clientes/${c.id}`}
                        className="hover:underline print:no-underline print:text-black"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.clientType === "FISICA" ? "Física" : "Jurídica"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {c.clientType === "FISICA" ? (
                        <>
                          <div>{c.dni ?? "—"}</div>
                          {c.cuit && <div className="text-[11px] text-muted-foreground/70">CUIT: {c.cuit}</div>}
                        </>
                      ) : (
                        c.cuit ?? "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{domicilio || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                        c._count.sales > 0 ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                      }`}>
                        {c._count.sales}
                      </span>
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
