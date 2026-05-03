import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!["admin", "gerente"].includes(session.user.role)) redirect("/ventas");

  return <AppShell user={session.user}>{children}</AppShell>;
}
