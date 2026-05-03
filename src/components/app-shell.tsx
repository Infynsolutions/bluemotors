import { Sidebar } from "@/components/sidebar";
import type { Role } from "@/generated/prisma/client";

interface AppShellProps {
  user: { name: string; email: string; role: Role };
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
