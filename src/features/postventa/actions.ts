"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { InvoiceType } from "@/generated/prisma/client";
import { WORKSHOP_NAMES } from "@/features/postventa/constants";


// ── Listado ───────────────────────────────────────────────────────────────────

export async function getServiceOrders() {
  return prisma.serviceOrder.findMany({
    where: { status: { not: "CANCELLED" } },
    include: {
      client: { select: { name: true } },
      appointment: true,
      workOrder: { select: { moNumber: true, totalAmount: true } },
      invoice: { select: { status: true, totalAmount: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getServiceOrder(id: string) {
  return prisma.serviceOrder.findUnique({
    where: { id },
    include: {
      client: true,
      vehicle: true,
      appointment: true,
      transfer: { include: { remitItems: { include: { part: true } } } },
      workOrder: { include: { items: { include: { part: true } } } },
      pickup: true,
      invoice: true,
    },
  });
}

// ── Paso 1: Crear ficha + turno ───────────────────────────────────────────────

async function generarNumeroMO(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.workOrder.count();
  return `MO-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function crearFichaPostventa(data: {
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  vehicleId?: string;
  vehicleDominio: string;
  vehicleDesc: string;
  motivo: string;
  notes?: string;
  scheduledDate?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  if (!data.clientName.trim()) throw new Error("El nombre del solicitante es obligatorio");
  if (!data.vehicleDominio.trim()) throw new Error("La patente es obligatoria");
  if (!data.vehicleDesc.trim()) throw new Error("La descripción del vehículo es obligatoria");
  if (!data.motivo.trim()) throw new Error("El motivo es obligatorio");

  const order = await prisma.serviceOrder.create({
    data: {
      clientId: data.clientId || null,
      clientName: data.clientName.trim(),
      clientPhone: data.clientPhone?.trim() || null,
      clientEmail: data.clientEmail?.trim() || null,
      vehicleId: data.vehicleId || null,
      vehicleDominio: data.vehicleDominio.trim().toUpperCase(),
      vehicleDesc: data.vehicleDesc.trim(),
      motivo: data.motivo.trim(),
      notes: data.notes?.trim() || null,
      status: data.scheduledDate ? "APPOINTMENT_SET" : "PENDING",
      ...(data.scheduledDate ? {
        appointment: {
          create: { scheduledDate: new Date(data.scheduledDate) },
        },
      } : {}),
    },
  });

  revalidatePath("/postventa");
  return order.id;
}

// ── Paso 2: Agendar / confirmar turno ─────────────────────────────────────────

export async function agendarTurno(data: {
  serviceOrderId: string;
  scheduledDate: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  const order = await prisma.serviceOrder.findUnique({ where: { id: data.serviceOrderId } });
  if (!order || order.status !== "PENDING") throw new Error("La ficha no está en estado pendiente");

  await prisma.$transaction([
    prisma.serviceAppointment.upsert({
      where: { serviceOrderId: data.serviceOrderId },
      create: {
        serviceOrderId: data.serviceOrderId,
        scheduledDate: new Date(data.scheduledDate),
        notes: data.notes?.trim() || null,
      },
      update: {
        scheduledDate: new Date(data.scheduledDate),
        notes: data.notes?.trim() || null,
      },
    }),
    prisma.serviceOrder.update({
      where: { id: data.serviceOrderId },
      data: { status: "APPOINTMENT_SET" },
    }),
  ]);

  revalidatePath("/postventa");
  revalidatePath(`/postventa/${data.serviceOrderId}`);
}

export async function marcarRecordatorioEnviado(serviceOrderId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  await prisma.serviceAppointment.update({
    where: { serviceOrderId },
    data: { reminderSent: true },
  });

  revalidatePath(`/postventa/${serviceOrderId}`);
}

// ── Paso 3: Registrar traslado al taller ──────────────────────────────────────

export async function registrarTraslado(data: {
  serviceOrderId: string;
  workshopNumber: number;
  driverName: string;
  transferDate: string;
  notes?: string;
  parts: { partId: string; quantity: number }[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  if (!data.driverName.trim()) throw new Error("El nombre del conductor es obligatorio");
  if (![1, 2].includes(data.workshopNumber)) throw new Error("Taller inválido");

  const order = await prisma.serviceOrder.findUnique({ where: { id: data.serviceOrderId } });
  if (!order || order.status !== "APPOINTMENT_SET") throw new Error("La ficha debe tener turno agendado");

  // Verificar stock disponible
  for (const p of data.parts) {
    if (p.quantity <= 0) continue;
    const part = await prisma.part.findUnique({ where: { id: p.partId } });
    if (!part) throw new Error("Artículo no encontrado");
    if (part.stock < p.quantity) throw new Error(`Stock insuficiente para ${part.name} (disponible: ${part.stock})`);
  }

  await prisma.$transaction(async (tx) => {
    const transfer = await tx.serviceTransfer.create({
      data: {
        serviceOrderId: data.serviceOrderId,
        workshopNumber: data.workshopNumber,
        driverName: data.driverName.trim(),
        transferDate: new Date(data.transferDate),
        notes: data.notes?.trim() || null,
        remitItems: {
          create: data.parts
            .filter((p) => p.quantity > 0)
            .map((p) => ({ partId: p.partId, quantity: p.quantity })),
        },
      },
    });

    // Descontar stock
    for (const p of data.parts.filter((p) => p.quantity > 0)) {
      await tx.part.update({
        where: { id: p.partId },
        data: { stock: { decrement: p.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          partId: p.partId,
          type: "SERVICE_OUT",
          quantity: -p.quantity,
          reference: `Traslado ${WORKSHOP_NAMES[data.workshopNumber]}`,
          notes: `Ficha postventa — ${order.vehicleDominio}`,
          createdById: session.user.id,
        },
      });
    }

    void transfer;

    await tx.serviceOrder.update({
      where: { id: data.serviceOrderId },
      data: { status: "IN_TRANSIT" },
    });
  });

  revalidatePath("/postventa");
  revalidatePath(`/postventa/${data.serviceOrderId}`);
  revalidatePath("/repuestos");
}

// ── Paso 4: Cargar MO (orden de ingreso) ──────────────────────────────────────

export async function cargarOrdenIngreso(data: {
  serviceOrderId: string;
  description: string;
  items: { partId?: string; description: string; quantity: number; unitPrice: number }[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  if (!data.description.trim()) throw new Error("La descripción del trabajo es obligatoria");
  if (!data.items.length) throw new Error("Agregá al menos un ítem");

  const order = await prisma.serviceOrder.findUnique({ where: { id: data.serviceOrderId } });
  if (!order || order.status !== "IN_TRANSIT") throw new Error("El vehículo debe estar en tránsito");

  const totalAmount = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const moNumber = await generarNumeroMO();

  await prisma.$transaction([
    prisma.workOrder.create({
      data: {
        serviceOrderId: data.serviceOrderId,
        moNumber,
        description: data.description.trim(),
        totalAmount,
        items: {
          create: data.items.map((i) => ({
            partId: i.partId || null,
            description: i.description.trim(),
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
    }),
    prisma.serviceOrder.update({
      where: { id: data.serviceOrderId },
      data: { status: "AT_WORKSHOP" },
    }),
  ]);

  revalidatePath("/postventa");
  revalidatePath(`/postventa/${data.serviceOrderId}`);
}

// ── Paso 5: Completar trabajo ─────────────────────────────────────────────────

export async function completarTrabajo(data: {
  serviceOrderId: string;
  techNotes: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  const order = await prisma.serviceOrder.findUnique({
    where: { id: data.serviceOrderId },
    include: { workOrder: true },
  });
  if (!order || order.status !== "AT_WORKSHOP") throw new Error("El vehículo debe estar en el taller");
  if (!order.workOrder) throw new Error("No hay orden de ingreso cargada");

  await prisma.$transaction([
    prisma.workOrder.update({
      where: { serviceOrderId: data.serviceOrderId },
      data: { techNotes: data.techNotes.trim() || null, completedAt: new Date() },
    }),
    prisma.serviceOrder.update({
      where: { id: data.serviceOrderId },
      data: { status: "COMPLETED" },
    }),
  ]);

  revalidatePath("/postventa");
  revalidatePath(`/postventa/${data.serviceOrderId}`);
}

// ── Paso 6: Registrar retiro + cerrar ficha ───────────────────────────────────

export async function registrarRetiro(data: {
  serviceOrderId: string;
  pickedUpBy: string;
  pickupDate: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  if (!data.pickedUpBy.trim()) throw new Error("El nombre de quien retira es obligatorio");

  const order = await prisma.serviceOrder.findUnique({ where: { id: data.serviceOrderId } });
  if (!order || order.status !== "COMPLETED") throw new Error("El trabajo debe estar completado");

  await prisma.$transaction([
    prisma.servicePickup.create({
      data: {
        serviceOrderId: data.serviceOrderId,
        pickedUpBy: data.pickedUpBy.trim(),
        pickupDate: new Date(data.pickupDate),
        notes: data.notes?.trim() || null,
      },
    }),
    prisma.serviceOrder.update({
      where: { id: data.serviceOrderId },
      data: { status: "CLOSED" },
    }),
  ]);

  revalidatePath("/postventa");
  revalidatePath(`/postventa/${data.serviceOrderId}`);
}

// ── Paso 7: Generar factura / registrar pago ──────────────────────────────────

export async function generarFacturaServicio(data: {
  serviceOrderId: string;
  invoiceType: InvoiceType;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!["admin", "gerente"].includes(session.user.role)) throw new Error("Sin permisos");

  if (!data.invoiceNumber.trim()) throw new Error("El número de factura es obligatorio");
  if (data.totalAmount <= 0) throw new Error("El monto debe ser mayor a cero");

  const order = await prisma.serviceOrder.findUnique({ where: { id: data.serviceOrderId } });
  if (!order || order.status !== "CLOSED") throw new Error("La ficha debe estar cerrada");

  const isTypeA = data.invoiceType === "A";
  const netAmount = isTypeA ? data.totalAmount / 1.21 : null;
  const vatAmount = isTypeA ? data.totalAmount - data.totalAmount / 1.21 : null;

  await prisma.$transaction(async (tx) => {
    await tx.serviceInvoice.create({
      data: {
        serviceOrderId: data.serviceOrderId,
        companyId: "empresa_gsi",
        invoiceType: data.invoiceType,
        invoiceNumber: data.invoiceNumber.trim(),
        invoiceDate: new Date(data.invoiceDate),
        totalAmount: data.totalAmount,
        ...(netAmount !== null ? { netAmount } : {}),
        ...(vatAmount !== null ? { vatAmount } : {}),
        status: "PENDING",
      },
    });

    // Factura A → IVA débito en GSI
    if (isTypeA && vatAmount) {
      await tx.taxEntry.create({
        data: {
          companyId: "empresa_gsi",
          taxType: "IVA",
          kind: "debito",
          concept: `Factura servicio ${data.invoiceType} ${data.invoiceNumber.trim()} — ${order.vehicleDominio}`,
          amount: vatAmount,
          date: new Date(data.invoiceDate),
          createdById: session.user.id,
        },
      });
    }
  });

  revalidatePath("/postventa");
  revalidatePath(`/postventa/${data.serviceOrderId}`);
  revalidatePath("/impuestos");
}

export async function registrarPagoServicio(data: {
  serviceOrderId: string;
  paymentDate: string;
  paymentMethod: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  const order = await prisma.serviceOrder.findUnique({
    where: { id: data.serviceOrderId },
    include: { invoice: true },
  });
  if (!order?.invoice) throw new Error("No hay factura generada");
  if (order.invoice.status === "PAID") throw new Error("Ya está pagado");

  const esCuentaCorriente = data.paymentMethod === "cuenta_corriente";

  await prisma.serviceInvoice.update({
    where: { serviceOrderId: data.serviceOrderId },
    data: {
      status: esCuentaCorriente ? "PENDING" : "PAID",
      paymentDate: esCuentaCorriente ? null : new Date(data.paymentDate),
      paymentMethod: data.paymentMethod,
    },
  });

  revalidatePath("/postventa");
  revalidatePath(`/postventa/${data.serviceOrderId}`);
}

export async function cancelarFicha(data: { serviceOrderId: string; reason?: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!["admin", "gerente"].includes(session.user.role)) throw new Error("Sin permisos");

  await prisma.serviceOrder.update({
    where: { id: data.serviceOrderId },
    data: { status: "CANCELLED", notes: data.reason || null },
  });

  revalidatePath("/postventa");
  revalidatePath(`/postventa/${data.serviceOrderId}`);
}
