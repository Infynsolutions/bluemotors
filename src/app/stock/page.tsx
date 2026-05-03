import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StockTabla } from "@/components/stock-tabla";
import { getModelos, getUbicaciones } from "@/app/actions/stock";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { key: "todos",       label: "Todos" },
  { key: "disponible",  label: "Disponibles" },
  { key: "reservado",   label: "Reservados" },
  { key: "vendido",     label: "Vendidos" },
] as const;

const TYPE_FILTERS = [
  { key: "todos",   label: "Todos" },
  { key: "0km",    label: "0 km" },
  { key: "usado",  label: "Usados" },
  { key: "pedido", label: "Por pedido" },
] as const;

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; tipo?: string }>;
}) {
  const session = await auth();
  const { estado = "todos", tipo = "todos" } = await searchParams;

  // Fetch con filtros
  const where: Record<string, unknown> = {};
  if (estado === "disponible") where.status = "available";
  else if (estado === "reservado") where.status = "reserved";
  else if (estado === "vendido") where.status = "sold";

  if (tipo === "0km")    { where.isUsado = false; where.isPedido = false; }
  else if (tipo === "usado")   where.isUsado = true;
  else if (tipo === "pedido")  where.isPedido = true;
  else { /* todos: no filter */ }

  const [vehicles, modelos, ubicaciones] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true, brand: true, model: true, year: true,
        price: true, isUsado: true, isPedido: true, status: true,
        vin: true, motorNumber: true, dominio: true,
        color: true, location: true, mileage: true,
        _count: { select: { sales: true } },
      },
    }),
    getModelos(),
    getUbicaciones(),
  ]);

  const vehiclesNormalized = vehicles.map((v) => ({
    ...v,
    price: Number(v.price),
    status: v.status as string,
  }));

  // Contadores para las tabs de tipo (sobre el total sin filtro de tipo)
  const allVehicles = tipo === "todos"
    ? vehicles
    : await prisma.vehicle.findMany({
        where: estado === "disponible" ? { status: "available" } : estado === "reservado" ? { status: "reserved" } : estado === "vendido" ? { status: "sold" } : {},
        select: { isUsado: true, isPedido: true },
      });
  const total0km    = allVehicles.filter((v) => !v.isUsado && !v.isPedido).length;
  const totalUsados = allVehicles.filter((v) => v.isUsado).length;
  const totalPedido = allVehicles.filter((v) => v.isPedido).length;
  const totalTodos  = allVehicles.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Stock</h1>
          <p className="text-sm text-muted-foreground">
            {vehicles.length} vehículo{vehicles.length !== 1 ? "s" : ""}
          </p>
        </div>
        {session!.user.role === "admin" && (
          <Link
            href="/stock/configuracion"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Configuración
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Tipo: 0km / Usados */}
        <div className="flex rounded-lg border overflow-hidden text-sm">
          {TYPE_FILTERS.map(({ key, label }) => {
            const count = key === "0km" ? total0km : key === "usado" ? totalUsados : key === "pedido" ? totalPedido : totalTodos;
            const isActive = tipo === key;
            const href = `/stock?tipo=${key}&estado=${estado}`;
            return (
              <Link
                key={key}
                href={href}
                className={`px-4 py-1.5 font-medium transition-colors flex items-center gap-1.5 ${
                  isActive ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {label}
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${isActive ? "bg-white/20" : "bg-muted"}`}>
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Estado */}
        <div className="flex rounded-lg border overflow-hidden text-sm">
          {STATUS_FILTERS.map(({ key, label }) => {
            const isActive = estado === key;
            const href = `/stock?estado=${key}&tipo=${tipo}`;
            return (
              <Link
                key={key}
                href={href}
                className={`px-3 py-1.5 transition-colors ${
                  isActive ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <StockTabla
        vehicles={vehiclesNormalized}
        modelos={modelos}
        ubicaciones={ubicaciones}
        role={session!.user.role}
      />
    </div>
  );
}
