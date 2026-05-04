"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Role } from "@/generated/prisma/client";

export async function crearUsuario(data: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") throw new Error("Sin permiso");

  if (!data.name.trim()) throw new Error("El nombre es obligatorio");
  if (!data.email.trim()) throw new Error("El email es obligatorio");
  if (data.password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new Error("Ya existe un usuario con ese email");

  const passwordHash = await bcrypt.hash(data.password, 10);

  await prisma.user.create({
    data: {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      passwordHash,
      role: data.role,
    },
  });

  revalidatePath("/configuracion/usuarios");
}

export async function editarUsuario(data: {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") throw new Error("Sin permiso");

  if (!data.name.trim()) throw new Error("El nombre es obligatorio");
  if (!data.email.trim()) throw new Error("El email es obligatorio");

  const existing = await prisma.user.findFirst({
    where: { email: data.email, NOT: { id: data.id } },
  });
  if (existing) throw new Error("Ya existe otro usuario con ese email");

  const updateData: Record<string, unknown> = {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: data.role,
  };

  if (data.password && data.password.length >= 6) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  await prisma.user.update({ where: { id: data.id }, data: updateData });

  revalidatePath("/configuracion/usuarios");
}

export async function desactivarUsuario(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") throw new Error("Sin permiso");
  if (session.user.id === id) throw new Error("No podés desactivarte a vos mismo");

  await prisma.user.delete({ where: { id } });

  revalidatePath("/configuracion/usuarios");
}
