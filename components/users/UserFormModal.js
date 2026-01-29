"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

const INITIAL_STATE = {
  full_name: "",
  email: "",
  username: "",
  password: "",
  phone: "",
  language: "es",
  timezone: "UTC",
  is_active: true,
};

export default function UserFormModal({
  open,
  onClose,
  onSaved,
  onSuccess,
  user = null,
}) {
  const [form, setForm] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const isEdit = Boolean(user);
  const firstInputRef = useRef(null);

  useEffect(() => {
    setError(null);
    setFieldErrors({});
    if (user) {
      setForm({
        full_name: user.full_name || "",
        email: user.email || "",
        username: user.username || "",
        password: "",
        phone: user.phone || "",
        language: user.language || "es",
        timezone: user.timezone || "UTC",
        is_active: user.is_active ?? true,
      });
    } else {
      setForm(INITIAL_STATE);
    }
  }, [user, open]);

  // bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // focus en primer input al abrir
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => firstInputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open]);

  // Escape para cerrar
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && open) onClose?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    setFieldErrors((p) => ({ ...p, [name]: undefined }));
  }

  function validateForm(values) {
    const errors = {};
    if (!values.full_name || values.full_name.trim().length < 3) {
      errors.full_name = "El nombre completo debe tener al menos 3 caracteres.";
    }
    if (!values.email) {
      errors.email = "El email es requerido.";
    } else {
      const re =
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i;
      if (!re.test(values.email)) errors.email = "Introduce un email válido.";
    }
    if (!values.username || values.username.trim().length < 3) {
      errors.username =
        "El nombre de usuario debe tener al menos 3 caracteres.";
    }
    if (!isEdit) {
      if (!values.password || values.password.length < 8) {
        errors.password =
          "La contraseña es obligatoria y debe tener al menos 8 caracteres.";
      }
    } else if (values.password && values.password.length < 8) {
      errors.password =
        "Si cambias la contraseña, debe tener al menos 8 caracteres.";
    }
    if (values.phone && !/^\+?[0-9\-\s()]{6,20}$/.test(values.phone)) {
      errors.phone = "Teléfono no válido.";
    }
    return errors;
  }

  async function requestWithFallback(
    url,
    primaryMethod,
    fallbackMethod,
    payload,
  ) {
    const opts = (method) => ({
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    try {
      let res = await fetch(url, opts(primaryMethod));
      if (res.status === 405 && fallbackMethod) {
        res = await fetch(url, opts(fallbackMethod));
      }
      return res;
    } catch (err) {
      if (fallbackMethod) {
        const res = await fetch(url, opts(fallbackMethod));
        return res;
      }
      throw err;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;

      if (isEdit) {
        const id = user.id ?? user._id ?? user.__tmpId;
        const url = `/api/users/${id}`;
        const res = await requestWithFallback(url, "PATCH", "PUT", payload);

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          let json = null;
          try {
            if (text) json = JSON.parse(text);
          } catch {}
          if (json && json.errors) setFieldErrors(json.errors);
          throw new Error(
            (json && (json.error || json.message)) || `Status ${res.status}`,
          );
        }

        const json = await res.json().catch(() => ({}));
        const savedUser = json?.user || json?.data || json || null;
        onSaved?.(savedUser);
        onSuccess?.(savedUser);
        onClose?.();
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          if (json && json.errors) setFieldErrors(json.errors);
          throw new Error(
            (json && (json.error || json.message)) || `Status ${res.status}`,
          );
        }

        const json = await res.json().catch(() => ({}));
        const savedUser = json?.data || json || null;
        onSaved?.(savedUser);
        onSuccess?.(savedUser);
        onClose?.();
      }
    } catch (err) {
      console.error("[UserFormModal] error submit:", err);
      setError(err.message || "Error al guardar usuario");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-title"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      />

      {/* modal centralizado con translate -50% -50% para garantizar centrado exacto */}
      <div
        role="document"
        className="relative z-10 rounded-lg bg-white shadow-xl"
        style={{
          boxSizing: "border-box",
          width: "calc(100% - 64px)", // deja 32px margen a cada lado
          maxWidth: "1100px", // ancho máximo en desktop
          maxHeight: "80vh",
          overflow: "hidden",
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex max-h-[80vh] flex-col overflow-auto">
          <div className="flex items-center justify-between border-b px-4 py-3 lg:px-6 lg:py-4">
            <h2 id="user-form-title" className="text-lg font-semibold">
              {isEdit ? "Editar usuario" : "Agregar usuario"}
            </h2>

            <div className="flex items-center gap-2">
              {isEdit && (
                <span className="hidden text-sm text-gray-500 lg:block">
                  {user?.email}
                </span>
              )}
              <button
                type="button"
                onClick={() => onClose?.()}
                aria-label="Cerrar"
                className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
              >
                Cerrar
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            {error && (
              <div className="m-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* grid: 1 columna por defecto; 2 columnas a partir de lg (>=1024px) */}
            <div className="grid gap-3 p-4 lg:grid-cols-2 lg:gap-6 lg:p-6">
              {/* left column */}
              <div className="space-y-3 min-w-0">
                <div>
                  <label className="sr-only">Nombre completo</label>
                  <input
                    ref={firstInputRef}
                    name="full_name"
                    placeholder="Nombre completo"
                    value={form.full_name}
                    onChange={handleChange}
                    required
                    // clases que evitan overflow (min-w-0, box-border, max-w-full)
                    className={`w-full max-w-full min-w-0 box-border rounded border px-3 py-2 text-sm ${fieldErrors.full_name ? "border-red-300" : ""}`}
                    aria-invalid={!!fieldErrors.full_name}
                    aria-describedby={
                      fieldErrors.full_name ? "err-full_name" : undefined
                    }
                  />
                  {fieldErrors.full_name && (
                    <div
                      id="err-full_name"
                      className="mt-1 text-xs text-red-600"
                    >
                      {fieldErrors.full_name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="sr-only">Email</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className={`w-full max-w-full min-w-0 box-border rounded border px-3 py-2 text-sm ${fieldErrors.email ? "border-red-300" : ""}`}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={
                      fieldErrors.email ? "err-email" : undefined
                    }
                  />
                  {fieldErrors.email && (
                    <div id="err-email" className="mt-1 text-xs text-red-600">
                      {fieldErrors.email}
                    </div>
                  )}
                </div>

                <div>
                  <label className="sr-only">Usuario</label>
                  <input
                    name="username"
                    placeholder="Usuario"
                    value={form.username}
                    onChange={handleChange}
                    required
                    className={`w-full max-w-full min-w-0 box-border rounded border px-3 py-2 text-sm ${fieldErrors.username ? "border-red-300" : ""}`}
                    aria-invalid={!!fieldErrors.username}
                    aria-describedby={
                      fieldErrors.username ? "err-username" : undefined
                    }
                  />
                  {fieldErrors.username && (
                    <div
                      id="err-username"
                      className="mt-1 text-xs text-red-600"
                    >
                      {fieldErrors.username}
                    </div>
                  )}
                </div>
              </div>

              {/* right column */}
              <div className="space-y-3 min-w-0">
                <div>
                  <label className="sr-only">Contraseña</label>
                  <input
                    name="password"
                    type="password"
                    placeholder={
                      isEdit ? "Dejar vacía para no cambiar" : "Contraseña"
                    }
                    value={form.password}
                    onChange={handleChange}
                    className={`w-full max-w-full min-w-0 box-border rounded border px-3 py-2 text-sm ${fieldErrors.password ? "border-red-300" : ""}`}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={
                      fieldErrors.password ? "err-password" : undefined
                    }
                  />
                  {fieldErrors.password && (
                    <div
                      id="err-password"
                      className="mt-1 text-xs text-red-600"
                    >
                      {fieldErrors.password}
                    </div>
                  )}
                </div>

                <div>
                  <label className="sr-only">Teléfono</label>
                  <input
                    name="phone"
                    placeholder="Teléfono"
                    value={form.phone}
                    onChange={handleChange}
                    className={`w-full max-w-full min-w-0 box-border rounded border px-3 py-2 text-sm ${fieldErrors.phone ? "border-red-300" : ""}`}
                    aria-invalid={!!fieldErrors.phone}
                    aria-describedby={
                      fieldErrors.phone ? "err-phone" : undefined
                    }
                  />
                  {fieldErrors.phone && (
                    <div id="err-phone" className="mt-1 text-xs text-red-600">
                      {fieldErrors.phone}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <label className="sr-only">Idioma</label>
                    <select
                      name="language"
                      value={form.language}
                      onChange={handleChange}
                      className="w-full max-w-full min-w-0 box-border rounded border px-3 py-2 text-sm"
                    >
                      <option value="es">Español</option>
                      <option value="en">Inglés</option>
                    </select>
                  </div>

                  <div className="lg:w-1/2 w-full min-w-0">
                    <label className="sr-only">Zona horaria</label>
                    <select
                      name="timezone"
                      value={form.timezone}
                      onChange={handleChange}
                      className="w-full max-w-full min-w-0 box-border rounded border px-3 py-2 text-sm"
                    >
                      <option value="UTC">UTC</option>
                      <option value="Europe/Sofia">Europe/Sofia</option>
                      <option value="America/New_York">America/New_York</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* footer */}
            <div className="flex flex-col gap-3 border-t px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-4">
              <div className="flex items-center gap-3">
                <input
                  id="is_active"
                  type="checkbox"
                  name="is_active"
                  checked={!!form.is_active}
                  onChange={handleChange}
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Usuario activo
                </label>
              </div>

              <div className="flex gap-3 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={() => onClose?.()}
                  className="rounded border px-4 py-2 text-sm"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modal, document.body);
  }
  return null;
}
