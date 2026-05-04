"use client";

import { useTransition } from "react";
import { saldarFactura, saldarVentaRepuestos } from "@/app/actions/cuenta-corriente";

export function SaldarFacturaBtn({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => saldarFactura(invoiceId))}
      className="text-xs text-green-700 hover:text-green-900 underline underline-offset-2 transition-colors disabled:opacity-50"
    >
      {isPending ? "..." : "Saldar"}
    </button>
  );
}

export function SaldarVentaBtn({ saleId }: { saleId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => saldarVentaRepuestos(saleId))}
      className="text-xs text-green-700 hover:text-green-900 underline underline-offset-2 transition-colors disabled:opacity-50"
    >
      {isPending ? "..." : "Saldar"}
    </button>
  );
}
