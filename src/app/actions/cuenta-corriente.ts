"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Registrar abono ───────────────────────────────────────────────────────────

export async function registrarAbono(data: {
  clientId?: string;
  clientName: string;
  amount: number;
  paymentMethod: string;
  date: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  if (data.amount <= 0) throw new Error("El monto debe ser mayor a 0");

  await prisma.cuentaCorrientePago.create({
    data: {
      clientId: data.clientId || undefined,
      clientName: data.clientName,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      date: new Date(data.date),
      notes: data.notes || undefined,
      createdById: session.user.id,
    },
  });

  revalidatePath("/cuenta-corriente");
  if (data.clientId) revalidatePath(`/cuenta-corriente/${data.clientId}`);
}

// ── Saldar deuda específica ───────────────────────────────────────────────────

export async function saldarFactura(serviceInvoiceId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  await prisma.serviceInvoice.update({
    where: { id: serviceInvoiceId },
    data: {
      status: "PAID",
      paymentDate: new Date(),
    },
  });

  revalidatePath("/cuenta-corriente");
}

export async function saldarVentaRepuestos(saleId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  await prisma.partSale.update({
    where: { id: saleId },
    data: {
      status: "PAID",
      paymentDate: new Date(),
    },
  });

  revalidatePath("/cuenta-corriente");
}
