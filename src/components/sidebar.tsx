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
  BookUser,
  UserCog,
} from "lucide-react";
import type { Role } from "@/generated/prisma/client";

type NavItem =
  | { type: "link"; href: string; label: string; icon: React.ElementType; roles: Role[] | null }
  | { type: "separator"; label: string; roles: Role[] | null };

const NAV: NavItem[] = [
  { type: "link", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "gerente"] },

  { type: "separator", label: "Comercial", roles: null },
  { type: "link", href: "/ventas",           label: "Ventas",         icon: Car,         roles: null },
  { type: "link", href: "/clientes",         label: "Clientes",       icon: Users,       roles: null },
  { type: "link", href: "/cuenta-corriente", label: "Cta. corriente", icon: BookUser,    roles: null },

  { type: "separator", label: "Inventario", roles: null },
  { type: "link", href: "/stock",           label: "Stock vehículos",  icon: Package,     roles: null },
  { type: "link", href: "/repuestos",       label: "Repuestos",        icon: Wrench,      roles: null },
  { type: "link", href: "/repuestos/ventas",label: "Ventas repuestos", icon: ShoppingCart,roles: null },

  { type: "separator", label: "Taller", roles: null },
  { type: "link", href: "/postventa", label: "Postventa", icon: ClipboardList, roles: null },

  { type: "separator", label: "Admin", roles: ["admin", "gerente"] },
  { type: "link", href: "/impuestos",              label: "Impuestos",     icon: Receipt,  roles: ["admin", "gerente"] },
  { type: "link", href: "/configuracion/usuarios", label: "Usuarios",      icon: UserCog,  roles: ["admin"] },
  { type: "link", href: "/configuracion/empresas", label: "Configuración", icon: Settings, roles: ["admin", "gerente"] },
];

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

  const visible = NAV.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <aside className="w-56 shrink-0 flex flex-col min-h-screen border-r bg-background">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b">
        <span className="font-bold text-sm tracking-tight">Blue Motors SGI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visible.map((item, i) => {
          if (item.type === "separator") {
            return (
              <p key={i} className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
                {item.label}
              </p>
            );
          }
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <item.icon size={16} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
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
