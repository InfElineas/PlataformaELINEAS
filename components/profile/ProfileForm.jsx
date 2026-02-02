"use client";

import { useState } from "react";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const timezones = [
  "UTC",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Caracas",
  "Europe/Madrid",
];
const languages = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

export default function ProfileForm({ initialData }) {
  const { refresh } = useAuthSession();
  const [formState, setFormState] = useState({
    full_name: initialData.full_name || "",
    email: initialData.email || "",
    username: initialData.username || "",
    phone: initialData.phone || "",
    language: initialData.language || "es",
    timezone: initialData.timezone || "UTC",
    avatar_url: initialData.avatar_url || "",
  });
  const [status, setStatus] = useState({
    loading: false,
    error: "",
    success: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: "", success: "" });

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formState.full_name,
          phone: formState.phone,
          language: formState.language,
          timezone: formState.timezone,
          avatar_url: formState.avatar_url,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({
          loading: false,
          error: data.error || "No se pudo actualizar el perfil",
          success: "",
        });
        return;
      }

      setStatus({
        loading: false,
        error: "",
        success: "Perfil actualizado correctamente",
      });
      refresh();
    } catch (error) {
      console.error("Profile update failed", error);
      setStatus({
        loading: false,
        error: "Error inesperado al guardar",
        success: "",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Nombre completo</Label>
          <Input
            id="full_name"
            name="full_name"
            value={formState.full_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Usuario</Label>
          <Input
            id="username"
            name="username"
            value={formState.username}
            disabled
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formState.email}
            disabled
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            name="phone"
            value={formState.phone}
            onChange={handleChange}
            placeholder="+52 55 1234 5678"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Idioma</Label>
          <select
            id="language"
            name="language"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formState.language}
            onChange={handleChange}
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Zona horaria</Label>
          <select
            id="timezone"
            name="timezone"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formState.timezone}
            onChange={handleChange}
          >
            {timezones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="avatar_url">Avatar</Label>
        <Textarea
          id="avatar_url"
          name="avatar_url"
          value={formState.avatar_url}
          onChange={handleChange}
          placeholder="URL de imagen pública"
          rows={2}
        />
      </div>
      {status.error && (
        <div
          className={cn(
            "rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive",
          )}
        >
          {status.error}
        </div>
      )}
      {status.success && (
        <div
          className={cn(
            "rounded-md border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500",
          )}
        >
          {status.success}
        </div>
      )}
      <Button className="max-sm:w-full" type="submit" disabled={status.loading}>
        {status.loading ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
