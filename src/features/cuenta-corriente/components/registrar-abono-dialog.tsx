"use client";

import { useState, useTransition } from "react";
import { registrarAbono } from "@/features/cuenta-corriente/actions";

interface Props {
  clientId?: string;
  clientName: string;
}

const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "cheque", label: "Cheque" },
];

export function RegistrarAbonoDialog({ clientId, clientName }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  function handleClose() {
    setOpen(false);
    setError("");
    setAmount("");
    setPaymentMethod("efectivo");
    setDate(new Date().toISOString().slice(0, 10));
    setNotes("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Ingresá un monto válido"); return; }

    setError("");
    startTransition(async () => {
      try {
        await registrarAbono({ clientId, clientName, amount: amt, paymentMethod, date, notes: notes || undefined });
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrar abono");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Registrar abono
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl border w-full max-w-md mx-4 p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold">Registrar abono</h2>
              <p className="text-sm text-muted-foreground">{clientName}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Monto</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Método de pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notas <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Referencia, cheque #..."
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={handleClose}
                  className="h-9 px-4 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {isPending ? "Guardando..." : "Guardar abono"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
