"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:opacity-80"
    >
      Imprimir
    </button>
  );
}

export function PrintButtonPDF() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted transition-colors"
    >
      Descargar / Imprimir PDF
    </button>
  );
}
