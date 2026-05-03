"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Car,
  Users,
  Package,
  Wrench,
  ShoppingCart,
  ClipboardList,
  Receipt,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import type { Role } from "@/generated/prisma/client";

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "gerente"] as Role[],
  },
  {
    href: "/ventas",
    label: "Ventas",
    icon: Car,
    roles: null,
  },
  {
    href: "/stock",
    label: "Stock",
    icon: Package,
    roles: null,
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: Users,
    roles: null,
  },
  {
    href: "/repuestos",
    label: "Repuestos",
    icon: Wrench,
    roles: null,
  },
  {
    href: "/repuestos/ventas",
    label: "Ventas repuestos",
    icon: ShoppingCart,
    roles: null,
  },
  {
    href: "/postventa",
    label: "Postventa",
    icon: ClipboardList,
    roles: null,
  },
  {
    href: "/impuestos",
    label: "Impuestos",
    icon: Receipt,
    roles: ["admin", "gerente"] as Role[],
  },
  {
    href: "/configuracion/empresas",
    label: "Configuración",
    icon: Settings,
    roles: ["admin", "gerente"] as Role[],
  },
] satisfies { href: string; label: string; icon: React.ElementType; roles: Role[] | null }[];

const ROLE_LABEL: Record<Role, string> = {
  vendedor: "Vendedor",
  admin: "Admin",
  gerente: "Gerente",
};

interface SidebarProps {
  user: { name: string; email: string; role: Role };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const links = NAV.filter(({ roles }) => !roles || roles.includes(user.role));

  return (
    <aside className="w-56 shrink-0 flex flex-col min-h-screen border-r bg-background">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b">
        <span className="font-bold text-sm tracking-tight">Blue Motors SGI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight size={14} className="opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t space-y-1">
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          Salir
        </button>
      </div>
    </aside>
  );
}
