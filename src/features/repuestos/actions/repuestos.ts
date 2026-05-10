"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Categorías ────────────────────────────────────────────────────────────────

export async function getCategorias() {
  return prisma.partCategory.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
}

export async function crearCategoria(name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!["admin", "gerente"].includes(session.user.role)) throw new Error("Sin permisos");
  if (!name.trim()) throw new Error("El nombre es obligatorio");

  await prisma.partCategory.create({ data: { name: name.trim() } });
  revalidatePath("/repuestos/configuracion");
}

export async function eliminarCategoria(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!["admin", "gerente"].includes(session.user.role)) throw new Error("Sin permisos");

  const partsCount = await prisma.part.count({ where: { categoryId: id } });
  if (partsCount > 0) throw new Error("No se puede eliminar: tiene artículos asignados");

  await prisma.partCategory.update({ where: { id }, data: { active: false } });
  revalidatePath("/repuestos/configuracion");
}

// ── Artículos ─────────────────────────────────────────────────────────────────

export async function getParts(opts?: { includeInactive?: boolean }) {
  return prisma.part.findMany({
    where: opts?.includeInactive ? {} : { active: true },
    include: { category: true },
    orderBy: { name: "asc" },
  });
}

export async function getPartById(id: string) {
  return prisma.part.findUnique({
    where: { id },
    include: {
      category: true,
      stockMovements: {
        orderBy: { date: "desc" },
        take: 50,
        include: { createdBy: { select: { name: true } } },
      },
    },
  });
}

export async function crearPart(data: {
  code: string;
  name: string;
  description?: string;
  categoryId: string;
  brand?: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  minStock: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  if (!data.code.trim()) throw new Error("El código es obligatorio");
  if (!data.name.trim()) throw new Error("El nombre es obligatorio");
  if (!data.categoryId) throw new Error("Seleccioná una categoría");
  if (data.costPrice < 0 || data.salePrice < 0) throw new Error("Los precios no pueden ser negativos");

  const existing = await prisma.part.findUnique({ where: { code: data.code.trim() } });
  if (existing) throw new Error(`Ya existe un artículo con el código ${data.code}`);

  await prisma.part.create({
    data: {
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      categoryId: data.categoryId,
      brand: data.brand?.trim() || null,
      unit: data.unit || "unidad",
      costPrice: data.costPrice,
      salePrice: data.salePrice,
      minStock: data.minStock,
      stock: 0,
    },
  });

  revalidatePath("/repuestos");
}

export async function editarPart(id: string, data: {
  code: string;
  name: string;
  description?: string;
  categoryId: string;
  brand?: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  minStock: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  if (!data.code.trim()) throw new Error("El código es obligatorio");
  if (!data.name.trim()) throw new Error("El nombre es obligatorio");

  const existing = await prisma.part.findFirst({
    where: { code: data.code.trim(), NOT: { id } },
  });
  if (existing) throw new Error(`Ya existe otro artículo con el código ${data.code}`);

  await prisma.part.update({
    where: { id },
    data: {
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      categoryId: data.categoryId,
      brand: data.brand?.trim() || null,
      unit: data.unit || "unidad",
      costPrice: data.costPrice,
      salePrice: data.salePrice,
      minStock: data.minStock,
    },
  });

  revalidatePath("/repuestos");
  revalidatePath(`/repuestos/${id}`);
}

export async function ajustarStock(data: {
  partId: string;
  quantity: number;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!["admin", "gerente"].includes(session.user.role)) throw new Error("Sin permisos");

  if (data.quantity === 0) throw new Error("La cantidad no puede ser cero");

  const part = await prisma.part.findUnique({ where: { id: data.partId } });
  if (!part) throw new Error("Artículo no encontrado");

  const newStock = part.stock + data.quantity;
  if (newStock < 0) throw new Error(`Stock insuficiente. Stock actual: ${part.stock}`);

  await prisma.$transaction([
    prisma.part.update({
      where: { id: data.partId },
      data: { stock: newStock },
    }),
    prisma.stockMovement.create({
      data: {
        partId: data.partId,
        type: "ADJUSTMENT",
        quantity: data.quantity,
        notes: data.notes?.trim() || null,
        createdById: session.user.id,
      },
    }),
  ]);

  revalidatePath("/repuestos");
  revalidatePath(`/repuestos/${data.partId}`);
}
