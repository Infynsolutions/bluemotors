"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import type { Role } from "@/generated/prisma/client";

const ROLE_LABEL: Record<Role, string> = {
  vendedor: "Vendedor",
  admin: "Admin",
  gerente: "Gerente",
};

const NAV_LINKS = [
  { href: "/ventas", label: "Ventas" },
  { href: "/stock", label: "Stock" },
  { href: "/clientes", label: "Clientes" },
  { href: "/dashboard", label: "Dashboard", roles: ["admin", "gerente"] as Role[] },
] satisfies { href: string; label: string; roles?: Role[] }[];

interface NavbarProps {
  user: { name: string; email: string; role: Role };
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 max-w-6xl h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="font-semibold text-sm">Blue Motors SGI</div>
          <nav className="flex items-center gap-1">
            {NAV_LINKS.filter(({ roles }) => !roles || roles.includes(user.role)).map(({ href, label }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user.name}{" "}
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {ROLE_LABEL[user.role]}
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Salir
          </Button>
        </div>
      </div>
    </header>
  );
}
