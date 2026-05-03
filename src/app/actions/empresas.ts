"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getEmpresas() {
  return prisma.company.findMany({ orderBy: { name: "asc" } });
}

export async function actualizarEmpresa(data: {
  id: string;
  name: string;
  razonSocial?: string;
  cuit?: string;
  address?: string;
  phone?: string;
  email?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!["admin", "gerente"].includes(session.user.role)) throw new Error("Sin permisos");

  if (!data.name.trim()) throw new Error("El nombre es obligatorio");

  await prisma.company.update({
    where: { id: data.id },
    data: {
      name: data.name.trim(),
      razonSocial: data.razonSocial?.trim() || null,
      cuit: data.cuit?.trim() || null,
      address: data.address?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
    },
  });

  revalidatePath("/configuracion/empresas");
}
