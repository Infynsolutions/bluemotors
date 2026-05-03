import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session && ["admin", "gerente"].includes(session.user.role)) {
    redirect("/dashboard");
  }
  redirect("/ventas");
}
