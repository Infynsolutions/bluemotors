"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Paso 1+2: Registrar venta ────────────────────────────────────────────────

type ClienteFisicaInput = {
  tipo: "fisica";
  nombre: string;
  dni: string;
  cuit?: string;
  domicilio?: string;
  cp?: string;
  localidad?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  condicionIva?: string;
  estadoCivil?: string;
  profesion?: string;
};

type ClienteJuridicaInput = {
  tipo: "juridica";
  razonSocial: string;
  representanteLegal?: string;
  cuit: string;
  domicilioFiscal?: string;
  cp?: string;
  localidad?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
};

type RegistrarVentaInput = {
  vehiculo:
    | { tipo: "stock"; vehicleId: string }
    | { tipo: "pedido"; brand: string; model: string; year: number };
  cliente: ClienteFisicaInput | ClienteJuridicaInput;
  salePrice: number;
  vendorIdOverride?: string; // admin selects which vendedor made the sale
  notes?: string;
};

export async function registrarVenta(data: RegistrarVentaInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  const { role, id: userId } = session.user;
  if (role !== "vendedor" && role !== "admin") throw new Error("Sin permiso");

  if (data.vehiculo.tipo === "stock") {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehiculo.vehicleId },
    });
    if (!vehicle || vehicle.status !== "available") {
      throw new Error("El vehículo no está disponible");
    }
  }

  // Admin can attribute the sale to another vendedor
  const vendorId =
    role === "admin" && data.vendorIdOverride ? data.vendorIdOverride : userId;

  await prisma.$transaction(async (tx) => {
    // ── Vehículo ──────────────────────────────────────────────────────────────
    let vehicleId: string;
    if (data.vehiculo.tipo === "stock") {
      vehicleId = data.vehiculo.vehicleId;
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: { status: "reserved" },
      });
    } else {
      const v = await tx.vehicle.create({
        data: {
          brand: data.vehiculo.brand,
          model: data.vehiculo.model,
          year: data.vehiculo.year,
          price: data.salePrice,
          status: "reserved",
          isPedido: true,
        },
      });
      vehicleId = v.id;
    }

    // ── Cliente ───────────────────────────────────────────────────────────────
    let clientId: string;
    if (data.cliente.tipo === "fisica") {
      const c = data.cliente;
      const existing = await tx.client.findUnique({ where: { dni: c.dni } });
      if (existing) {
        clientId = existing.id;
      } else {
        const created = await tx.client.create({
          data: {
            clientType: "FISICA",
            name: c.nombre,
            dni: c.dni,
            ...(c.cuit ? { cuit: c.cuit } : {}),
            ...(c.domicilio ? { address: c.domicilio } : {}),
            ...(c.cp ? { postalCode: c.cp } : {}),
            ...(c.localidad ? { city: c.localidad } : {}),
            ...(c.provincia ? { province: c.provincia } : {}),
            ...(c.telefono ? { phone: c.telefono } : {}),
            ...(c.email ? { email: c.email } : {}),
            ...(c.condicionIva ? { ivaCondition: c.condicionIva } : {}),
            ...(c.estadoCivil ? { maritalStatus: c.estadoCivil } : {}),
            ...(c.profesion ? { profession: c.profesion } : {}),
          },
        });
        clientId = created.id;
      }
    } else {
      const c = data.cliente;
      const existing = await tx.client.findFirst({ where: { cuit: c.cuit } });
      if (existing) {
        clientId = existing.id;
      } else {
        const created = await tx.client.create({
          data: {
            clientType: "JURIDICA",
            name: c.razonSocial,
            cuit: c.cuit,
            ...(c.representanteLegal ? { legalRepresentative: c.representanteLegal } : {}),
            ...(c.domicilioFiscal ? { address: c.domicilioFiscal } : {}),
            ...(c.cp ? { postalCode: c.cp } : {}),
            ...(c.localidad ? { city: c.localidad } : {}),
            ...(c.provincia ? { province: c.provincia } : {}),
            ...(c.telefono ? { phone: c.telefono } : {}),
            ...(c.email ? { email: c.email } : {}),
          },
        });
        clientId = created.id;
      }
    }

    // ── Venta ─────────────────────────────────────────────────────────────────
    const sale = await tx.sale.create({
      data: {
        vendorId,
        vehicleId,
        clientId,
        salePrice: data.salePrice,
        status: "active",
        lastStepUpdatedAt: new Date(),
      },
    });

    // ── Pasos 1 y 2 completados ───────────────────────────────────────────────
    await tx.saleStep.createMany({
      data: [
        {
          saleId: sale.id,
          stepNumber: 1,
          status: "completed",
          completedBy: userId,
          completedAt: new Date(),
          notes: data.notes ?? null,
        },
        {
          saleId: sale.id,
          stepNumber: 2,
          status: "completed",
          completedBy: userId,
          completedAt: new Date(),
        },
      ],
    });
  });

  revalidatePath("/ventas");
}

// ─── Paso 3: Carga de venta ───────────────────────────────────────────────────

type PagoBase = { tipo: "cash" | "transfer"; monto: number };
type PagoCheque = { tipo: "check"; monto: number; banco: string; vencimiento: string };
type PagoUsado = {
  tipo: "used_vehicle";
  monto: number;
  brand: string;
  model: string;
  year: number;
  vin?: string;
  color?: string;
  mileage?: number;
  location: string;
};
type PagoRetencion = {
  tipo: "retencion";
  monto: number;
  retentionType: string;
  certNumber?: string;
  retentionDate: string;
};
type PagoInput = PagoBase | PagoCheque | PagoUsado | PagoRetencion;

type CargaVentaInput = {
  saleId: string;
  pagos: PagoInput[];
  documentosRecibidos: string[]; // array of DocType keys marked as received
};

export async function cargaVenta(data: CargaVentaInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (session.user.role !== "admin") throw new Error("Solo el admin puede completar este paso");
  if (data.pagos.length === 0) throw new Error("Debe registrar al menos una forma de pago");

  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    include: {
      saleSteps: true,
      payments: { select: { amount: true } },
    },
  });
  if (!sale || sale.status !== "active") throw new Error("Venta no encontrada");

  const completedSteps = sale.saleSteps.filter((s) => s.status === "completed").length;
  if (completedSteps !== 3) throw new Error("La venta no está en el paso de cobro");

  // Total existente + nuevos pagos
  const existingTotal = sale.payments.reduce((s, p) => s + Number(p.amount), 0);
  const newTotal = data.pagos.reduce((sum, p) => sum + p.monto, 0);
  const grandTotal = existingTotal + newTotal;
  const isFirstPayment = existingTotal === 0;
  const shouldCompleteStep = sale.salePrice === null || grandTotal >= Number(sale.salePrice);

  await prisma.$transaction(async (tx) => {
    for (const pago of data.pagos) {
      let tradeInVehicleId: string | undefined;

      if (pago.tipo === "used_vehicle") {
        const v = await tx.vehicle.create({
          data: {
            brand: pago.brand,
            model: pago.model,
            year: pago.year,
            price: pago.monto,
            status: "available",
            isUsado: true,
            location: pago.location,
            ...(pago.vin ? { vin: pago.vin } : {}),
            ...(pago.color ? { color: pago.color } : {}),
            ...(pago.mileage ? { mileage: pago.mileage } : {}),
          },
        });
        tradeInVehicleId = v.id;
      }

      const payment = await tx.payment.create({
        data: {
          saleId: data.saleId,
          type: pago.tipo,
          amount: pago.monto,
          ...(tradeInVehicleId ? { tradeInVehicleId } : {}),
          ...(pago.tipo === "retencion" ? {
            retentionType: pago.retentionType,
            retentionCertNumber: pago.certNumber ?? null,
            retentionDate: new Date(pago.retentionDate),
          } : {}),
        },
      });

      if (pago.tipo === "check") {
        await tx.check.create({
          data: {
            paymentId: payment.id,
            bank: pago.banco,
            amount: pago.monto,
            dueDate: new Date(pago.vencimiento),
          },
        });
      }
    }

    // Documentos: solo en el primer pago
    if (isFirstPayment) {
      for (const docType of data.documentosRecibidos) {
        await tx.document.create({
          data: {
            saleId: data.saleId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            docType: docType as any,
            receivedBy: session.user.id,
            receivedAt: new Date(),
          },
        });
      }
    }

    // Solo completar el paso si el total cubre el precio de venta
    if (shouldCompleteStep) {
      await tx.saleStep.create({
        data: {
          saleId: data.saleId,
          stepNumber: 4,
          status: "completed",
          completedBy: session.user.id,
          completedAt: new Date(),
        },
      });

      await tx.sale.update({
        where: { id: data.saleId },
        data: { lastStepUpdatedAt: new Date() },
      });
    }
  });

  revalidatePath("/ventas");
}

// ─── Paso 4: Carga de factura ─────────────────────────────────────────────────

type CargaFacturaInput = {
  saleId: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO date string
  invoiceType: "A" | "B" | "C";
};

export async function cargaFactura(data: CargaFacturaInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (session.user.role !== "admin") throw new Error("Solo el admin puede completar este paso");

  if (!data.invoiceNumber.trim()) throw new Error("Ingresá el número de factura");
  if (!data.invoiceDate) throw new Error("Ingresá la fecha de la factura");

  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    include: { saleSteps: true },
  });
  if (!sale || sale.status !== "active") throw new Error("Venta no encontrada");

  const completedSteps = sale.saleSteps.filter((s) => s.status === "completed").length;
  if (completedSteps !== 2) throw new Error("La venta no está en el paso de facturación");

  const totalAmount = Number(sale.salePrice ?? 0);
  const isTypeA = data.invoiceType === "A";
  const netAmount = isTypeA ? totalAmount / 1.21 : null;
  const vatAmount = isTypeA ? totalAmount - totalAmount / 1.21 : null;

  await prisma.$transaction(async (tx) => {
    await tx.invoice.create({
      data: {
        saleId: data.saleId,
        companyId: "empresa_blue_motors",
        invoiceNumber: data.invoiceNumber.trim(),
        invoiceDate: new Date(data.invoiceDate),
        invoiceType: data.invoiceType,
        totalAmount,
        ...(netAmount !== null ? { netAmount } : {}),
        ...(vatAmount !== null ? { vatAmount } : {}),
      },
    });

    await tx.saleStep.create({
      data: {
        saleId: data.saleId,
        stepNumber: 3,
        status: "completed",
        completedBy: session.user.id,
        completedAt: new Date(),
      },
    });

    await tx.sale.update({
      where: { id: data.saleId },
      data: { lastStepUpdatedAt: new Date() },
    });
  });

  revalidatePath("/ventas");
}

// ─── Paso 5: Patentamiento ────────────────────────────────────────────────────

type CargaPatentamientoInput = {
  saleId: string;
  fechaPresentacion: string; // ISO date
  seccional: string;
  numeroExpediente?: string;
  observaciones?: string;
};

export async function cargaPatentamiento(data: CargaPatentamientoInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (session.user.role !== "admin") throw new Error("Solo el admin puede completar este paso");

  if (!data.seccional.trim()) throw new Error("Ingresá la seccional del Registro");
  if (!data.fechaPresentacion) throw new Error("Ingresá la fecha de presentación");

  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    include: { saleSteps: true },
  });
  if (!sale || sale.status !== "active") throw new Error("Venta no encontrada");

  const completedSteps = sale.saleSteps.filter((s) => s.status === "completed").length;
  if (completedSteps !== 4) throw new Error("La venta no está en el paso 5");

  await prisma.$transaction(async (tx) => {
    await tx.patentamiento.create({
      data: {
        saleId: data.saleId,
        fechaPresentacion: new Date(data.fechaPresentacion),
        seccional: data.seccional.trim(),
        ...(data.numeroExpediente?.trim() ? { numeroExpediente: data.numeroExpediente.trim() } : {}),
        ...(data.observaciones?.trim() ? { observaciones: data.observaciones.trim() } : {}),
      },
    });

    await tx.saleStep.create({
      data: {
        saleId: data.saleId,
        stepNumber: 5,
        status: "completed",
        completedBy: session.user.id,
        completedAt: new Date(),
      },
    });

    await tx.sale.update({
      where: { id: data.saleId },
      data: { lastStepUpdatedAt: new Date() },
    });
  });

  revalidatePath("/ventas");
}

// ─── Paso 6: Patente otorgada ─────────────────────────────────────────────────

type CargaPatenteOtorgadaInput = {
  saleId: string;
  fechaOtorgamiento: string; // ISO date
  numeroDominio: string;
  preEntregaRealizada: boolean;
  observaciones?: string;
};

export async function cargaPatenteOtorgada(data: CargaPatenteOtorgadaInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (session.user.role !== "admin") throw new Error("Solo el admin puede completar este paso");

  if (!data.numeroDominio.trim()) throw new Error("Ingresá el número de dominio");
  if (!data.fechaOtorgamiento) throw new Error("Ingresá la fecha de otorgamiento");

  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    include: { saleSteps: true },
  });
  if (!sale || sale.status !== "active") throw new Error("Venta no encontrada");

  const completedSteps = sale.saleSteps.filter((s) => s.status === "completed").length;
  if (completedSteps !== 5) throw new Error("La venta no está en el paso 6");

  await prisma.$transaction(async (tx) => {
    await tx.patenteOtorgada.create({
      data: {
        saleId: data.saleId,
        fechaOtorgamiento: new Date(data.fechaOtorgamiento),
        numeroDominio: data.numeroDominio.trim().toUpperCase(),
        preEntregaRealizada: data.preEntregaRealizada,
        ...(data.observaciones?.trim() ? { observaciones: data.observaciones.trim() } : {}),
      },
    });

    // Guardar dominio en el vehículo
    await tx.vehicle.update({
      where: { id: sale.vehicleId },
      data: { dominio: data.numeroDominio.trim().toUpperCase() },
    });

    await tx.saleStep.create({
      data: {
        saleId: data.saleId,
        stepNumber: 6,
        status: "completed",
        completedBy: session.user.id,
        completedAt: new Date(),
      },
    });

    await tx.sale.update({
      where: { id: data.saleId },
      data: { lastStepUpdatedAt: new Date() },
    });
  });

  revalidatePath("/ventas");
}

// ─── Paso 7: Entrega ──────────────────────────────────────────────────────────

type CargaEntregaInput = {
  saleId: string;
  fechaEntrega: string; // ISO date
  receptorNombre: string;
  observaciones?: string;
};

export async function cargaEntrega(data: CargaEntregaInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (session.user.role !== "admin") throw new Error("Solo el admin puede completar este paso");

  if (!data.receptorNombre.trim()) throw new Error("Ingresá el nombre de quien recibe");
  if (!data.fechaEntrega) throw new Error("Ingresá la fecha de entrega");

  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    include: { saleSteps: true },
  });
  if (!sale || sale.status !== "active") throw new Error("Venta no encontrada");

  const completedSteps = sale.saleSteps.filter((s) => s.status === "completed").length;
  if (completedSteps !== 6) throw new Error("La venta no está en el paso 7");

  await prisma.$transaction(async (tx) => {
    await tx.entrega.create({
      data: {
        saleId: data.saleId,
        fechaEntrega: new Date(data.fechaEntrega),
        receptorNombre: data.receptorNombre.trim(),
        ...(data.observaciones?.trim() ? { observaciones: data.observaciones.trim() } : {}),
      },
    });

    await tx.saleStep.create({
      data: {
        saleId: data.saleId,
        stepNumber: 7,
        status: "completed",
        completedBy: session.user.id,
        completedAt: new Date(),
      },
    });

    // Marcar venta como completada y vehículo como vendido
    await tx.sale.update({
      where: { id: data.saleId },
      data: { status: "completed", lastStepUpdatedAt: new Date() },
    });

    await tx.vehicle.update({
      where: { id: sale.vehicleId },
      data: { status: "sold" },
    });
  });

  revalidatePath("/ventas");
}

// ─── Asignar vehículo a venta por pedido ─────────────────────────────────────

export async function asignarVehiculoAPedido(saleId: string, newVehicleId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (session.user.role !== "admin") throw new Error("Solo el admin puede reasignar vehículos");

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { vehicle: true },
  });
  if (!sale) throw new Error("Venta no encontrada");
  if (!sale.vehicle.isPedido) throw new Error("Esta venta no es por pedido");

  const newVehicle = await prisma.vehicle.findUnique({ where: { id: newVehicleId } });
  if (!newVehicle || newVehicle.status !== "available") throw new Error("El vehículo no está disponible");

  const oldVehicleId = sale.vehicleId;

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({ where: { id: saleId }, data: { vehicleId: newVehicleId } });
    await tx.vehicle.update({ where: { id: newVehicleId }, data: { status: "reserved" } });
    // Eliminar el vehículo fantasma de pedido (ya no tiene ventas asociadas)
    await tx.vehicle.delete({ where: { id: oldVehicleId } });
  });

  revalidatePath("/ventas");
  revalidatePath("/stock");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function getSaleParaFactura(saleId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    select: {
      salePrice: true,
      client: {
        select: {
          clientType: true,
          name: true,
          dni: true,
          cuit: true,
          address: true,
          city: true,
          province: true,
          postalCode: true,
          ivaCondition: true,
        },
      },
      vehicle: {
        select: { brand: true, model: true, year: true, vin: true, color: true },
      },
    },
  });

  if (!sale) throw new Error("Venta no encontrada");
  return {
    salePrice: sale.salePrice ? Number(sale.salePrice) : null,
    client: sale.client,
    vehicle: sale.vehicle,
  };
}

export async function getVehiclesDisponibles() {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const vehicles = await prisma.vehicle.findMany({
    where: { status: "available", isPedido: false, isUsado: false },
    orderBy: [{ brand: "asc" }, { model: "asc" }],
    select: { id: true, brand: true, model: true, year: true, price: true },
  });

  return vehicles.map((v) => ({ ...v, price: Number(v.price) }));
}

export async function getVendedores() {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  return prisma.user.findMany({
    where: { role: "vendedor" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ─── Cancelar venta ───────────────────────────────────────────────────────────

export async function cancelarVenta(saleId: string, motivo: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!["admin", "gerente"].includes(session.user.role)) throw new Error("Sin permisos");

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { status: true, vehicleId: true, vehicle: { select: { isPedido: true } } },
  });
  if (!sale) throw new Error("Venta no encontrada");
  if (sale.status !== "active") throw new Error("Solo se pueden cancelar ventas activas");

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: saleId },
      data: {
        status: "cancelled",
        cancelReason: motivo.trim() || null,
        cancelledAt: new Date(),
      },
    });
    if (!sale.vehicle.isPedido) {
      await tx.vehicle.update({
        where: { id: sale.vehicleId },
        data: { status: "available" },
      });
    }
  });

  revalidatePath("/ventas");
  revalidatePath("/stock");
  revalidatePath("/dashboard");
}
