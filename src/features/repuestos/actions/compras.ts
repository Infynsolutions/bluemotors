"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Proveedores ───────────────────────────────────────────────────────────────

export async function getProveedores() {
  return prisma.supplier.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
}

export async function crearProveedor(data: {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  cuit?: string;
  address?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!["admin", "gerente"].includes(session.user.role)) throw new Error("Sin permisos");
  if (!data.name.trim()) throw new Error("El nombre es obligatorio");

  await prisma.supplier.create({
    data: {
      name: data.name.trim(),
      contactName: data.contactName?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      cuit: data.cuit?.trim() || null,
      address: data.address?.trim() || null,
    },
  });

  revalidatePath("/repuestos/configuracion");
}

export async function editarProveedor(id: string, data: {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  cuit?: string;
  address?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!["admin", "gerente"].includes(session.user.role)) throw new Error("Sin permisos");
  if (!data.name.trim()) throw new Error("El nombre es obligatorio");

  await prisma.supplier.update({
    where: { id },
    data: {
      name: data.name.trim(),
      contactName: data.contactName?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      cuit: data.cuit?.trim() || null,
      address: data.address?.trim() || null,
    },
  });

  revalidatePath("/repuestos/configuracion");
}

// ── Órdenes de compra ─────────────────────────────────────────────────────────

export async function getOrdenesDeCompra() {
  return prisma.purchaseOrder.findMany({
    include: {
      supplier: true,
      items: { include: { part: true } },
      invoice: true,
      receipt: true,
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrdenDeCompra(id: string) {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: { include: { part: { include: { category: true } } } },
      invoice: true,
      receipt: { include: { items: { include: { part: true } } } },
      payment: true,
    },
  });
}

async function generarNumeroOrden(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count();
  return `OC-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function crearOrdenDeCompra(data: {
  supplierId: string;
  notes?: string;
  items: { partId: string; quantity: number; unitPrice: number }[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!["admin", "gerente"].includes(session.user.role)) throw new Error("Sin permisos");

  if (!data.supplierId) throw new Error("Seleccioná un proveedor");
  if (!data.items.length) throw new Error("Agregá al menos un artículo");
  if (data.items.some((i) => i.quantity <= 0)) throw new Error("Las cantidades deben ser mayores a cero");
  if (data.items.some((i) => i.unitPrice < 0)) throw new Error("Los precios no pueden ser negativos");

  const orderNumber = await generarNumeroOrden();

  const order = await prisma.purchaseOrder.create({
    data: {
      orderNumber,
      supplierId: data.supplierId,
      notes: data.notes?.trim() || null,
      items: {
        create: data.items.map((i) => ({
          partId: i.partId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      },
    },
  });

  revalidatePath("/repuestos/compras");
  return order.id;
}

export async function marcarOrdenEnviada(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order || order.status !== "DRAFT") throw new Error("La orden no está en borrador");

  await prisma.purchaseOrder.update({ where: { id }, data: { status: "SENT" } });

  revalidatePath("/repuestos/compras");
  revalidatePath(`/repuestos/compras/${id}`);
}

export async function cargarFacturaProveedor(data: {
  purchaseOrderId: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceType: "A" | "B" | "C";
  totalAmount: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!["admin", "gerente"].includes(session.user.role)) throw new Error("Sin permisos");

  if (!data.invoiceNumber.trim()) throw new Error("El número de factura es obligatorio");
  if (!data.invoiceDate) throw new Error("La fecha es obligatoria");
  if (data.totalAmount <= 0) throw new Error("El monto debe ser mayor a cero");

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: data.purchaseOrderId },
    include: { supplier: true },
  });
  if (!order || order.status !== "SENT") throw new Error("La orden debe estar en estado Enviada");

  const isTypeA = data.invoiceType === "A";
  const netAmount = isTypeA ? data.totalAmount / 1.21 : null;
  const vatAmount = isTypeA ? data.totalAmount - data.totalAmount / 1.21 : null;

  await prisma.$transaction(async (tx) => {
    await tx.purchaseInvoice.create({
      data: {
        purchaseOrderId: data.purchaseOrderId,
        invoiceNumber: data.invoiceNumber.trim(),
        invoiceDate: new Date(data.invoiceDate),
        invoiceType: data.invoiceType,
        totalAmount: data.totalAmount,
        ...(netAmount !== null ? { netAmount } : {}),
        ...(vatAmount !== null ? { vatAmount } : {}),
      },
    });

    await tx.purchaseOrder.update({
      where: { id: data.purchaseOrderId },
      data: { status: "INVOICED" },
    });

    // Factura A → IVA crédito fiscal en GSI
    if (isTypeA && vatAmount) {
      await tx.taxEntry.create({
        data: {
          companyId: "empresa_gsi",
          taxType: "IVA",
          kind: "credito",
          concept: `Factura compra ${data.invoiceType} ${data.invoiceNumber.trim()} — ${order.supplier.name}`,
          amount: vatAmount,
          date: new Date(data.invoiceDate),
          createdById: session.user.id,
        },
      });
    }
  });

  revalidatePath("/repuestos/compras");
  revalidatePath(`/repuestos/compras/${data.purchaseOrderId}`);
  revalidatePath("/impuestos");
}

export async function cargarRecepcion(data: {
  purchaseOrderId: string;
  receiptDate: string;
  notes?: string;
  items: { partId: string; orderedQty: number; receivedQty: number }[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  const order = await prisma.purchaseOrder.findUnique({ where: { id: data.purchaseOrderId } });
  if (!order || order.status !== "INVOICED") throw new Error("La orden debe tener factura cargada");

  if (data.items.some((i) => i.receivedQty < 0)) throw new Error("Las cantidades no pueden ser negativas");

  await prisma.$transaction(async (tx) => {
    const receipt = await tx.goodsReceipt.create({
      data: {
        purchaseOrderId: data.purchaseOrderId,
        receiptDate: new Date(data.receiptDate),
        notes: data.notes?.trim() || null,
        items: {
          create: data.items.map((i) => ({
            partId: i.partId,
            orderedQty: i.orderedQty,
            receivedQty: i.receivedQty,
          })),
        },
      },
    });

    // Actualizar stock y registrar movimientos
    for (const item of data.items) {
      if (item.receivedQty <= 0) continue;

      await tx.part.update({
        where: { id: item.partId },
        data: { stock: { increment: item.receivedQty } },
      });

      await tx.stockMovement.create({
        data: {
          partId: item.partId,
          type: "PURCHASE",
          quantity: item.receivedQty,
          reference: order.orderNumber,
          notes: `Recepción ${order.orderNumber}`,
          createdById: session.user.id,
        },
      });
    }

    void receipt;

    await tx.purchaseOrder.update({
      where: { id: data.purchaseOrderId },
      data: { status: "RECEIVED" },
    });
  });

  revalidatePath("/repuestos");
  revalidatePath("/repuestos/compras");
  revalidatePath(`/repuestos/compras/${data.purchaseOrderId}`);
}

export async function registrarPagoCompra(data: {
  purchaseOrderId: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!["admin", "gerente"].includes(session.user.role)) throw new Error("Sin permisos");

  if (data.amount <= 0) throw new Error("El monto debe ser mayor a cero");
  if (!data.paymentDate) throw new Error("La fecha es obligatoria");
  if (!data.method) throw new Error("Seleccioná el método de pago");

  const order = await prisma.purchaseOrder.findUnique({ where: { id: data.purchaseOrderId } });
  if (!order || order.status !== "RECEIVED") throw new Error("La orden debe estar en estado Recibida");

  await prisma.$transaction([
    prisma.purchasePayment.create({
      data: {
        purchaseOrderId: data.purchaseOrderId,
        amount: data.amount,
        paymentDate: new Date(data.paymentDate),
        method: data.method,
        reference: data.reference?.trim() || null,
      },
    }),
    prisma.purchaseOrder.update({
      where: { id: data.purchaseOrderId },
      data: { status: "PAID" },
    }),
  ]);

  revalidatePath("/repuestos/compras");
  revalidatePath(`/repuestos/compras/${data.purchaseOrderId}`);
}
