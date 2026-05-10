"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TaxType, TaxEntryKind } from "@/generated/prisma/client";

export async function agregarEntradaImpuesto(data: {
  companyId: string;
  taxType: TaxType;
  kind: TaxEntryKind;
  concept: string;
  amount: number;
  date: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!["admin", "gerente"].includes(session.user.role)) throw new Error("Sin permisos");

  if (!data.concept.trim()) throw new Error("El concepto es obligatorio");
  if (data.amount <= 0) throw new Error("El monto debe ser mayor a cero");
  if (!data.date) throw new Error("La fecha es obligatoria");
  if (!data.companyId) throw new Error("Seleccioná la empresa");

  await prisma.taxEntry.create({
    data: {
      companyId: data.companyId,
      taxType: data.taxType,
      kind: data.kind,
      concept: data.concept.trim(),
      amount: data.amount,
      date: new Date(data.date),
      createdById: session.user.id,
    },
  });

  revalidatePath("/impuestos");
}

export async function eliminarEntradaImpuesto(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!["admin", "gerente"].includes(session.user.role)) throw new Error("Sin permisos");

  await prisma.taxEntry.delete({ where: { id } });
  revalidatePath("/impuestos");
}
