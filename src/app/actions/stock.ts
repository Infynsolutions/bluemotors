"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Helpers de configuración ────────────────────────────────────────────────

export async function getModelos() {
  return prisma.vehicleModel.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
}

export async function getUbicaciones() {
  return prisma.stockLocation.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
}

// ─── CRUD Configuración ───────────────────────────────────────────────────────

export async function agregarModelo(name: string) {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Sin permiso");
  if (!name.trim()) throw new Error("Ingresá un nombre");
  await prisma.vehicleModel.create({ data: { name: name.trim() } });
  revalidatePath("/stock/configuracion");
}

export async function eliminarModelo(id: string) {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Sin permiso");
  await prisma.vehicleModel.update({ where: { id }, data: { active: false } });
  revalidatePath("/stock/configuracion");
}

export async function agregarUbicacion(name: string) {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Sin permiso");
  if (!name.trim()) throw new Error("Ingresá un nombre");
  await prisma.stockLocation.create({ data: { name: name.trim() } });
  revalidatePath("/stock/configuracion");
}

export async function eliminarUbicacion(id: string) {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Sin permiso");
  await prisma.stockLocation.update({ where: { id }, data: { active: false } });
  revalidatePath("/stock/configuracion");
}

// ─── CRUD Vehículos ───────────────────────────────────────────────────────────

type VehiculoInput = {
  isUsado: boolean;
  brand: string;
  model: string;
  year: number;
  price: number;
  vin?: string;
  motorNumber?: string;
  color?: string;
  location?: string;
  mileage?: number;
};

export async function agregarVehiculo(data: VehiculoInput) {
  const session = await auth();
  if (!["admin", "vendedor"].includes(session?.user.role ?? "")) throw new Error("Sin permiso");
  if (!data.brand.trim() || !data.model.trim()) throw new Error("Marca y modelo son requeridos");

  await prisma.vehicle.create({
    data: {
      brand: data.brand.trim(),
      model: data.model.trim(),
      year: data.year,
      price: data.price,
      isUsado: data.isUsado,
      status: "available",
      ...(data.vin?.trim() ? { vin: data.vin.trim() } : {}),
      ...(data.motorNumber?.trim() ? { motorNumber: data.motorNumber.trim() } : {}),
      ...(data.color?.trim() ? { color: data.color.trim() } : {}),
      ...(data.location?.trim() ? { location: data.location.trim() } : {}),
      ...(data.isUsado && data.mileage ? { mileage: data.mileage } : {}),
    },
  });

  revalidatePath("/stock");
}

export async function editarVehiculo(id: string, data: VehiculoInput) {
  const session = await auth();
  if (!["admin", "vendedor"].includes(session?.user.role ?? "")) throw new Error("Sin permiso");
  if (!data.brand.trim() || !data.model.trim()) throw new Error("Marca y modelo son requeridos");

  await prisma.vehicle.update({
    where: { id },
    data: {
      brand: data.brand.trim(),
      model: data.model.trim(),
      year: data.year,
      price: data.price,
      ...(data.vin?.trim() ? { vin: data.vin.trim() } : { vin: null }),
      ...(data.motorNumber?.trim() ? { motorNumber: data.motorNumber.trim() } : { motorNumber: null }),
      ...(data.color?.trim() ? { color: data.color.trim() } : { color: null }),
      ...(data.location?.trim() ? { location: data.location.trim() } : { location: null }),
      mileage: data.isUsado && data.mileage ? data.mileage : null,
    },
  });

  revalidatePath("/stock");
}

export async function eliminarVehiculo(id: string) {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Solo el admin puede eliminar vehículos");

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: { _count: { select: { sales: true } } },
  });
  if (!vehicle) throw new Error("Vehículo no encontrado");
  if (vehicle._count.sales > 0) throw new Error("No se puede eliminar un vehículo con ventas asociadas");

  await prisma.vehicle.delete({ where: { id } });
  revalidatePath("/stock");
}
