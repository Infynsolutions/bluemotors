"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import type { Role } from "@/generated/prisma/client";

const SECTION_LABELS: Record<string, string> = {
  "/dashboard":            "Dashboard",
  "/ventas":               "Ventas",
  "/clientes":             "Clientes",
  "/cuenta-corriente":     "Cuenta Corriente",
  "/stock":                "Stock de Vehículos",
  "/repuestos/ventas":     "Ventas de Repuestos",
  "/repuestos/compras":    "Compras de Repuestos",
  "/repuestos":            "Repuestos",
  "/postventa":            "Postventa",
  "/impuestos":            "Impuestos",
  "/configuracion/usuarios": "Usuarios",
  "/configuracion":        "Configuración",
};

function getSectionLabel(pathname: string): string {
  const match = Object.keys(SECTION_LABELS)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key));
  return match ? SECTION_LABELS[match] : "";
}

interface AppShellProps {
  user: { name: string; email: string; role: Role };
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const label = getSectionLabel(pathname);

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto relative" style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e8eef7 100%)' }}>

        {/* Logo watermark */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <img
            src="/LOGO.png"
            alt=""
            style={{
              width: '60%',
              maxWidth: '600px',
              opacity: 0.10,
              userSelect: 'none',
              mixBlendMode: 'multiply',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative mx-auto max-w-6xl px-6 py-8">
          {children}
        </div>

      </main>
    </div>
  );
}
