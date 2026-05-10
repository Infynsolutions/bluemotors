"use client";

import { useTransition } from "react";
import { desactivarUsuario } from "@/features/usuarios/actions";

export function EliminarUsuarioBtn({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return;
    startTransition(() => desactivarUsuario(id));
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
    >
      {isPending ? "..." : "Eliminar"}
    </button>
  );
}
