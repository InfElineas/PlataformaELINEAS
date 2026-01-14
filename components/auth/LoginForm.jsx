"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export default function LoginForm({ redirectTo = "/" }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    // Mostrar loader
    Swal.fire({
      title: "Ingresando…",
      text: "Por favor espera",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, password, rememberMe }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Cerrar el loader antes de mostrar el error
        Swal.close();

        // Mostrar alerta específica para "Invalid credentials"
        if (data.error === "Invalid credentials") {
          await Swal.fire({
            icon: "error",
            title: "Credenciales incorrectas",
            text: "El usuario o la contraseña son incorrectos",
            timer: 2000, // 2 segundos
            timerProgressBar: true,
            showConfirmButton: false,
          });
        } else {
          await Swal.fire({
            icon: "error",
            title: "Error al iniciar sesión",
            text: data.error || "Ocurrió un error inesperado",
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
          });
        }
        return;
      }

      // Login exitoso
      Swal.close();
      router.push(redirectTo || "/");
      router.refresh();
    } catch (err) {
      console.error("Login request failed", err);

      // Cerrar loader antes de mostrar alerta
      Swal.close();

      await Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo completar el login. Intenta nuevamente.",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="identifier">Correo o usuario</Label>
        <Input
          id="identifier"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="usuario@empresa.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2 text-sm">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(value) => setRememberMe(Boolean(value))}
          />
          <span>Recordarme</span>
        </label>
        <a
          href="/forgot-password"
          className="text-sm text-primary hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Ingresando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
