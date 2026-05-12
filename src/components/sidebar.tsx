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
    <aside className="w-56 shrink-0 flex flex-col min-h-screen border-r bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex flex-col items-start px-4 pt-4 pb-3 border-b border-sidebar-border">
        <img
          src="/LOGO.png"
          alt="Blue Motors"
          style={{ width: '148px', mixBlendMode: 'multiply' }}
        />
        <span className="text-[9px] tracking-widest uppercase font-medium mt-1.5" style={{ color: 'oklch(0.14 0.06 254 / 45%)' }}>
          Sistema de Gestión
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visible.map((item, i) => {
          if (item.type === "separator") {
            return (
              <p key={i} className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest select-none" style={{ color: 'oklch(0.14 0.06 254 / 45%)' }}>
                {item.label}
              </p>
            );
          }
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full" style={{ backgroundColor: '#4A90D9' }} />
              )}
              <item.icon size={16} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight size={14} className="opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</p>
          <p className="text-xs text-sidebar-foreground/50">{ROLE_LABEL[user.role]}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          Salir
        </button>
      </div>
    </aside>
  );
}
