"use client";

import { useState, useTransition } from "react";
import { crearUsuario, editarUsuario } from "@/app/actions/usuarios";
import type { Role } from "@/generated/prisma/client";

const ROLES: { value: Role; label: string }[] = [
  { value: "vendedor", label: "Vendedor" },
  { value: "gerente", label: "Gerente" },
  { value: "admin", label: "Admin" },
];

interface UserData {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface Props {
  mode: "crear" | "editar";
  user?: UserData;
}

export function UsuarioDialog({ mode, user }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "vendedor");
  const [password, setPassword] = useState("");

  function handleClose() {
    setOpen(false);
    setError("");
    if (mode === "crear") {
      setName(""); setEmail(""); setRole("vendedor"); setPassword("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        if (mode === "crear") {
          await crearUsuario({ name, email, password, role });
        } else {
          await editarUsuario({ id: user!.id, name, email, role, password: password || undefined });
        }
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <>
      {mode === "crear" ? (
        <button onClick={() => setOpen(true)}
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Nuevo usuario
        </button>
      ) : (
        <button onClick={() => setOpen(true)}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
          Editar
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl border w-full max-w-md mx-4 p-6 space-y-5">
            <h2 className="text-base font-semibold">
              {mode === "crear" ? "Nuevo usuario" : "Editar usuario"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nombre completo</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  required />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@bluemotors.com"
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  required />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Rol</label>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Contraseña{mode === "editar" && <span className="text-muted-foreground font-normal"> (dejar vacío para no cambiar)</span>}
                </label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "crear" ? "Mínimo 6 caracteres" : "Nueva contraseña..."}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  required={mode === "crear"} />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={handleClose}
                  className="h-9 px-4 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {isPending ? "Guardando..." : mode === "crear" ? "Crear usuario" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
