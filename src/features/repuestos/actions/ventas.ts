"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { InvoiceType } from "@/generated/prisma/client";

const COMPANY_GSI = "empresa_gsi";

// ── Crear venta ───────────────────────────────────────────────────────────────

export async function crearVentaRepuestos(data: {
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  notes?: string;
  items: { partId: string; description: string; quantity: number; unitPrice: number }[];
  invoiceType?: InvoiceType;
  invoiceNumber?: string;
  invoiceDate?: string;
  paymentMethod?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  if (!data.items.length) throw new Error("Debe agregar al menos un ítem");

  const totalAmount = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  // Verify stock for all parts
  for (const item of data.items) {
    const part = await prisma.part.findUnique({ where: { id: item.partId } });
    if (!part) throw new Error(`Repuesto no encontrado`);
    if (part.stock < item.quantity) throw new Error(`Stock insuficiente para "${part.name}" (stock: ${part.stock})`);
  }

  // Generate sale number VR-YYYY-NNNN
  const year = new Date().getFullYear();
  const count = await prisma.partSale.count();
  const saleNumber = `VR-${year}-${String(count + 1).padStart(4, "0")}`;

  // IVA breakdown for type A
  const isA = data.invoiceType === "A";
  const netAmount = isA ? totalAmount / 1.21 : undefined;
  const vatAmount = isA ? totalAmount - totalAmount / 1.21 : undefined;

  const isPaid = !!data.paymentMethod && data.paymentMethod !== "cuenta_corriente";

  const sale = await prisma.$transaction(async (tx) => {
    const sale = await tx.partSale.create({
      data: {
        saleNumber,
        clientId: data.clientId || undefined,
        clientName: data.clientName,
        clientPhone: data.clientPhone || undefined,
        notes: data.notes || undefined,
        totalAmount,
        invoiceType: data.invoiceType || undefined,
        invoiceNumber: data.invoiceNumber || undefined,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
        netAmount,
        vatAmount,
        paymentMethod: data.paymentMethod || undefined,
        paymentDate: isPaid ? new Date() : undefined,
        status: isPaid ? "PAID" : "PENDING",
        companyId: COMPANY_GSI,
        createdById: session.user.id,
        items: {
          create: data.items.map((i) => ({
            partId: i.partId,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
    });

    // Decrement stock + create movements
    for (const item of data.items) {
      await tx.part.update({
        where: { id: item.partId },
        data: { stock: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          partId: item.partId,
          type: "SALE_OUT",
          quantity: item.quantity,
          reference: saleNumber,
          createdById: session.user.id,
        },
      });
    }

    // TaxEntry débito IVA en GSI si factura A
    if (isA && vatAmount) {
      await tx.taxEntry.create({
        data: {
          taxType: "IVA",
          kind: "debito",
          amount: vatAmount,
          concept: `IVA débito — ${saleNumber}`,
          date: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
          companyId: COMPANY_GSI,
          createdById: session.user.id,
        },
      });
    }

    return sale;
  });

  revalidatePath("/repuestos/ventas");
  revalidatePath("/repuestos");
  return sale.id;
}

// ── Registrar pago ────────────────────────────────────────────────────────────

export async function registrarPagoVenta(data: {
  saleId: string;
  paymentMethod: string;
  paymentDate: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  const esCuentaCorriente = data.paymentMethod === "cuenta_corriente";

  await prisma.partSale.update({
    where: { id: data.saleId },
    data: {
      status: esCuentaCorriente ? "PENDING" : "PAID",
      paymentMethod: data.paymentMethod,
      paymentDate: esCuentaCorriente ? null : new Date(data.paymentDate),
    },
  });

  revalidatePath("/repuestos/ventas");
}

// ── Cancelar venta ────────────────────────────────────────────────────────────

export async function cancelarVenta(saleId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  const sale = await prisma.partSale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });
  if (!sale) throw new Error("Venta no encontrada");
  if (sale.status === "CANCELLED") throw new Error("Ya está cancelada");

  await prisma.$transaction(async (tx) => {
    await tx.partSale.update({ where: { id: saleId }, data: { status: "CANCELLED" } });

    // Restore stock
    for (const item of sale.items) {
      await tx.part.update({
        where: { id: item.partId },
        data: { stock: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          partId: item.partId,
          type: "ADJUSTMENT",
          quantity: item.quantity,
          reference: `Cancelación ${sale.saleNumber}`,
          createdById: session.user.id,
        },
      });
    }
  });

  revalidatePath("/repuestos/ventas");
}
