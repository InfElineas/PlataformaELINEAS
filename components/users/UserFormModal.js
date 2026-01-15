"use client";

import { useEffect, useState, useRef } from "react";

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
  const dialogRef = useRef(null);

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

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape" && open) onClose?.();
    }
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
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

  // robust fetch: intenta primaryMethod; si fetch falla o responde 405, intenta fallbackMethod.
  async function requestWithFallback(
    url,
    primaryMethod,
    fallbackMethod,
    payload
  ) {
    const opts = (method) => ({
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // primer intento
    try {
      console.debug("[requestWithFallback] intent:", primaryMethod, url);
      let res = await fetch(url, opts(primaryMethod));
      console.debug("[requestWithFallback] status:", res.status);
      if (res.status === 405 && fallbackMethod) {
        console.debug(
          "[requestWithFallback] 405 -> intentando fallback:",
          fallbackMethod
        );
        res = await fetch(url, opts(fallbackMethod));
        console.debug("[requestWithFallback] fallback status:", res.status);
      }
      return res;
    } catch (err) {
      // si fetch lanzó (AbortError / network), intentar fallback si existe
      console.debug("[requestWithFallback] fetch error:", err?.name || err);
      if (fallbackMethod) {
        try {
          console.debug(
            "[requestWithFallback] intentando fallback tras error:",
            fallbackMethod,
            url
          );
          const res = await fetch(url, opts(fallbackMethod));
          console.debug(
            "[requestWithFallback] fallback status after error:",
            res.status
          );
          return res;
        } catch (err2) {
          console.debug(
            "[requestWithFallback] fallback también falló:",
            err2?.name || err2
          );
          throw err2;
        }
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
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;

      if (isEdit) {
        const id = user.id ?? user._id ?? user.__tmpId;
        const url = `/api/users/${id}`;

        // PATCH -> PUT fallback, y captura de excepciones (abort/network)
        let res = await requestWithFallback(url, "PATCH", "PUT", payload);

        // Si aun así no está ok, intentar endpoint alternativo /deactivate o /update (si aplica para tu backend)
        if (!res.ok) {
          // intentar respuesta JSON si la hay
          let text = "";
          try {
            text = await res.text();
          } catch {}
          let json = null;
          try {
            if (text) json = JSON.parse(text);
          } catch {}
          // si status 405/404 o similar, lanzar para que el catch gestione
          throw new Error(
            (json && (json.error || json.message)) || `Status ${res.status}`
          );
        }

        // parsear JSON seguro
        const json = await res.json().catch(() => ({}));
        const savedUser = json?.user || json?.data || null;

        onSaved?.(savedUser);
        onSuccess?.(savedUser);
        onClose?.();
      } else {
        // crear
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          if (json && json.errors) setFieldErrors(json.errors);
          throw new Error(
            (json && (json.error || json.message)) || `Status ${res.status}`
          );
        }

        const json = await res.json().catch(() => ({}));
        const savedUser = (json && (json.data || json)) || null;
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-title"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-lg bg-white shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b px-6 py-4">
          <h2 id="user-form-title" className="text-lg font-semibold">
            {isEdit ? "Editar usuario" : "Agregar usuario"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          {error && (
            <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <input
              name="full_name"
              placeholder="Nombre completo"
              value={form.full_name}
              onChange={handleChange}
              required
              className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.full_name ? "border-red-300" : ""}`}
              aria-invalid={!!fieldErrors.full_name}
              aria-describedby={
                fieldErrors.full_name ? "err-full_name" : undefined
              }
            />
            {fieldErrors.full_name && (
              <div id="err-full_name" className="mt-1 text-xs text-red-600">
                {fieldErrors.full_name}
              </div>
            )}
          </div>

          <div>
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.email ? "border-red-300" : ""}`}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "err-email" : undefined}
            />
            {fieldErrors.email && (
              <div id="err-email" className="mt-1 text-xs text-red-600">
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div>
            <input
              name="username"
              placeholder="Usuario"
              value={form.username}
              onChange={handleChange}
              required
              className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.username ? "border-red-300" : ""}`}
              aria-invalid={!!fieldErrors.username}
              aria-describedby={
                fieldErrors.username ? "err-username" : undefined
              }
            />
            {fieldErrors.username && (
              <div id="err-username" className="mt-1 text-xs text-red-600">
                {fieldErrors.username}
              </div>
            )}
          </div>

          <div>
            <input
              name="password"
              type="password"
              placeholder={
                isEdit ? "Dejar vacía para no cambiar" : "Contraseña"
              }
              value={form.password}
              onChange={handleChange}
              className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.password ? "border-red-300" : ""}`}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={
                fieldErrors.password ? "err-password" : undefined
              }
            />
            {fieldErrors.password && (
              <div id="err-password" className="mt-1 text-xs text-red-600">
                {fieldErrors.password}
              </div>
            )}
          </div>

          <div>
            <input
              name="phone"
              placeholder="Teléfono"
              value={form.phone}
              onChange={handleChange}
              className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.phone ? "border-red-300" : ""}`}
              aria-invalid={!!fieldErrors.phone}
              aria-describedby={fieldErrors.phone ? "err-phone" : undefined}
            />
            {fieldErrors.phone && (
              <div id="err-phone" className="mt-1 text-xs text-red-600">
                {fieldErrors.phone}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
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

          <div className="flex justify-end gap-3 pt-4">
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
        </form>
      </div>
    </div>
  );
}
