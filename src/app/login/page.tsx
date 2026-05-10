"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email o contraseña incorrectos.");
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-slate-600 text-xs font-semibold uppercase tracking-wider">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-slate-50 border-slate-200 focus:border-blue-400"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-slate-600 text-xs font-semibold uppercase tracking-wider">
          Contraseña
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-slate-50 border-slate-200 focus:border-blue-400"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button
        type="submit"
        className="w-full mt-2"
        disabled={loading}
        style={{ backgroundColor: '#1B5299', color: '#fff' }}
      >
        {loading ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #e8eef7 0%, #d5e0ef 50%, #c8d5e8 100%)' }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <img
          src="/LOGO.png"
          alt="Blue Motors"
          style={{
            width: '320px',
            mixBlendMode: 'multiply',
          }}
        />
        <p
          className="mt-4 text-xs tracking-[0.25em] uppercase font-semibold"
          style={{ color: '#4A5568' }}
        >
          Concesionario Oficial DFSK — Tucumán
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'rgba(255, 255, 255, 0.88)',
          boxShadow: '0 20px 60px rgba(27, 82, 153, 0.15), 0 4px 16px rgba(0,0,0,0.06)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.7)',
        }}
      >
        <p className="text-center text-xs font-semibold tracking-widest uppercase text-slate-400 mb-6">
          Sistema de Gestión
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
