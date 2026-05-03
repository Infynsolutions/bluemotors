"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getModelos, getUbicaciones,
  agregarModelo, eliminarModelo,
  agregarUbicacion, eliminarUbicacion,
} from "@/app/actions/stock";

type Item = { id: string; name: string; active: boolean };

export default function ConfiguracionPage() {
  const [modelos, setModelos] = useState<Item[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Item[]>([]);
  const [nuevoModelo, setNuevoModelo] = useState("");
  const [nuevaUbicacion, setNuevaUbicacion] = useState("");
  const [errorModelo, setErrorModelo] = useState("");
  const [errorUbicacion, setErrorUbicacion] = useState("");
  const [isPendingM, startM] = useTransition();
  const [isPendingU, startU] = useTransition();

  async function reload() {
    const [m, u] = await Promise.all([getModelos(), getUbicaciones()]);
    setModelos(m);
    setUbicaciones(u);
  }

  useEffect(() => { reload(); }, []);

  function handleAgregarModelo(e: React.FormEvent) {
    e.preventDefault();
    setErrorModelo("");
    startM(async () => {
      try {
        await agregarModelo(nuevoModelo);
        setNuevoModelo("");
        await reload();
      } catch (err) {
        setErrorModelo(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function handleEliminarModelo(id: string) {
    startM(async () => {
      await eliminarModelo(id);
      await reload();
    });
  }

  function handleAgregarUbicacion(e: React.FormEvent) {
    e.preventDefault();
    setErrorUbicacion("");
    startU(async () => {
      try {
        await agregarUbicacion(nuevaUbicacion);
        setNuevaUbicacion("");
        await reload();
      } catch (err) {
        setErrorUbicacion(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function handleEliminarUbicacion(id: string) {
    startU(async () => {
      await eliminarUbicacion(id);
      await reload();
    });
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/stock" className="hover:text-foreground transition-colors">Stock</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Configuración</span>
      </div>

      <h1 className="text-xl font-semibold">Configuración de stock</h1>

      {/* Modelos */}
      <section className="space-y-4">
        <h2 className="font-semibold">Modelos DFSK</h2>
        <form onSubmit={handleAgregarModelo} className="flex gap-2">
          <Input
            value={nuevoModelo}
            onChange={(e) => setNuevoModelo(e.target.value)}
            placeholder="Ej: Glory 500"
            className="flex-1"
          />
          <Button type="submit" disabled={isPendingM || !nuevoModelo.trim()}>
            Agregar
          </Button>
        </form>
        {errorModelo && <p className="text-sm text-destructive">{errorModelo}</p>}
        <ul className="space-y-1">
          {modelos.length === 0 && (
            <li className="text-sm text-muted-foreground">Sin modelos configurados.</li>
          )}
          {modelos.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span>{m.name}</span>
              <button
                onClick={() => handleEliminarModelo(m.id)}
                disabled={isPendingM}
                className="text-muted-foreground hover:text-destructive transition-colors text-xs"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="border-t" />

      {/* Ubicaciones */}
      <section className="space-y-4">
        <h2 className="font-semibold">Ubicaciones / Cocheras</h2>
        <form onSubmit={handleAgregarUbicacion} className="flex gap-2">
          <Input
            value={nuevaUbicacion}
            onChange={(e) => setNuevaUbicacion(e.target.value)}
            placeholder="Ej: Cochera 1 — San Miguel"
            className="flex-1"
          />
          <Button type="submit" disabled={isPendingU || !nuevaUbicacion.trim()}>
            Agregar
          </Button>
        </form>
        {errorUbicacion && <p className="text-sm text-destructive">{errorUbicacion}</p>}
        <ul className="space-y-1">
          {ubicaciones.length === 0 && (
            <li className="text-sm text-muted-foreground">Sin ubicaciones configuradas.</li>
          )}
          {ubicaciones.map((u) => (
            <li key={u.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span>{u.name}</span>
              <button
                onClick={() => handleEliminarUbicacion(u.id)}
                disabled={isPendingU}
                className="text-muted-foreground hover:text-destructive transition-colors text-xs"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
