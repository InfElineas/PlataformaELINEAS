"use client";

import { useEffect, useState } from "react";
import UserFormModal from "@/components/users/UserFormModal";
import Swal from "sweetalert2";

/* ---------- helpers para keys ---------- */
function userKey(u) {
  return u?.id ?? u?._id ?? u?.email ?? u?.username ?? u?.__tmpId ?? null;
}

function ensureUserHasTmpId(u) {
  if (!userKey(u)) {
    u.__tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return u;
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  /* ---------- Fetch usuarios ---------- */
  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("No se pudieron cargar los usuarios");
      const json = await res.json();
      const list = json.data || json || [];
      setUsers(list.map((u) => ensureUserHasTmpId({ ...u })));
    } catch (err) {
      setError(err.message || "Error al obtener usuarios");
    } finally {
      setLoading(false);
    }
  }
  function toggleMenu(id) {
    setOpenMenuId((prev) => (prev === id ? null : id));
  }

  function closeMenu() {
    setOpenMenuId(null);
  }

  useEffect(() => {
    function handleClickOutside() {
      setOpenMenuId(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  /* ---------- Abrir modal ---------- */
  function handleAdd() {
    setSelectedUser(null);
    setModalOpen(true);
  }

  function handleEdit(user) {
    setSelectedUser(user);
    setModalOpen(true);
  }

  /* ---------- Eliminar usuario ---------- */
  async function handleDelete(user) {
    if (!user) return;

    const id = user.id ?? user._id;
    if (!id) {
      alert("No se pudo identificar el usuario.");
      return;
    }

    const confirmation = window.confirm(
      `⚠️ Esta acción es irreversible.\n\n¿Eliminar definitivamente al usuario "${user.full_name || user.username}"?`,
    );

    if (!confirmation) return;

    // Optimistic UI
    const prevUsers = users;
    setUsers((u) => u.filter((item) => userKey(item) !== userKey(user)));

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
    } catch (err) {
      setUsers(prevUsers);
      console.error("[handleDelete]", err);
      alert("No se pudo eliminar el usuario.");
    }
  }

  /* ---------- Desactivar usuario ---------- */
  async function handleDeactivate(user) {
    if (!user) return;
    const id = user.id ?? user._id ?? user.__tmpId;
    if (!id) return;

    const confirmation = await Swal.fire({
      icon: "warning",
      title: `Desactivar usuario`,
      text: `¿Seguro que quieres desactivar a "${user.full_name || user.username}"?`,
      showCancelButton: true,
      confirmButtonText: "Sí, desactivar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmation.isConfirmed) return;

    const prevUsers = users;
    setUsers((u) =>
      u.map((item) =>
        userKey(item) === userKey(user) ? { ...item, is_active: false } : item,
      ),
    );

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);
      Swal.fire({
        icon: "success",
        title: "Usuario desactivado",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchUsers();
    } catch (err) {
      setUsers(prevUsers);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "No se pudo desactivar",
      });
    }
  }

  /* ---------- Activar usuario ---------- */
  async function handleActivate(user) {
    if (!user) return;
    const id = user.id ?? user._id ?? user.__tmpId;
    if (!id) return;

    const confirmation = await Swal.fire({
      icon: "question",
      title: `Activar usuario`,
      text: `¿Quieres activar a "${user.full_name || user.username}"?`,
      showCancelButton: true,
      confirmButtonText: "Sí, activar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmation.isConfirmed) return;

    const prevUsers = users;
    setUsers((u) =>
      u.map((item) =>
        userKey(item) === userKey(user) ? { ...item, is_active: true } : item,
      ),
    );

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);
      Swal.fire({
        icon: "success",
        title: "Usuario activado",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchUsers();
    } catch (err) {
      setUsers(prevUsers);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "No se pudo activar",
      });
    }
  }

  /* ---------- Eliminar usuario ---------- */
  async function handleDelete(user) {
    if (!user) return;
    const id = user.id ?? user._id ?? user.__tmpId;
    if (!id) return;

    const confirmation = await Swal.fire({
      icon: "warning",
      title: `Eliminar usuario`,
      text: `¿Seguro que quieres eliminar a "${user.full_name || user.username}"? Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmation.isConfirmed) return;

    const prevUsers = users;
    setUsers((u) => u.filter((item) => userKey(item) !== userKey(user)));

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      Swal.fire({
        icon: "success",
        title: "Usuario eliminado",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchUsers();
    } catch (err) {
      setUsers(prevUsers);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "No se pudo eliminar",
      });
    }
  }

  /* ---------- Callback modal ---------- */
  function handleSaved(userFromModal) {
    if (!userFromModal) {
      setModalOpen(false);
      return;
    }

    const saved = ensureUserHasTmpId({ ...userFromModal });

    setUsers((prev) => {
      const exists = prev.some(
        (u) => userKey(u) && userKey(u) === userKey(saved),
      );
      if (exists) {
        return prev.map((u) => (userKey(u) === userKey(saved) ? saved : u));
      } else {
        return [saved, ...prev];
      }
    });

    setModalOpen(false);
    setSelectedUser(null);

    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: `Usuario "${saved.full_name || saved.username}" ${
        selectedUser ? "actualizado" : "creado"
      } correctamente.`,
      timer: 2000,
      showConfirmButton: false,
    });

    fetchUsers();
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500">
            Gestión de usuarios del sistema
          </p>
        </div>

        <button
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={handleAdd}
        >
          Agregar usuario
        </button>
      </div>

      {/* Content */}
      <div className="rounded-lg border bg-white">
        {loading && (
          <div className="p-6 text-sm text-gray-500">Cargando usuarios…</div>
        )}
        {error && <div className="p-6 text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {users.map((user, idx) => (
                <tr key={userKey(user) ?? `user-fallback-${idx}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {user.full_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      @{user.username}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700">
                    {user.email}
                  </td>

                  <td className="px-4 py-3">
                    {user.is_active ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                        Inactivo
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right text-sm">
                    <div
                      className="relative inline-block text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="inline-flex items-center justify-center rounded-md bg-gray-100 px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
                        onClick={() => toggleMenu(userKey(user))}
                      >
                        ⋮
                      </button>

                      {openMenuId === userKey(user) && (
                        <div className="absolute right-0 z-20 mt-2 w-40 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                          <div className="py-1">
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleEdit(user);
                                setOpenMenuId(null);
                              }}
                              className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                            >
                              Editar
                            </button>

                            {user.is_active ? (
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  handleDeactivate(user);
                                  setOpenMenuId(null);
                                }}
                                className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600"
                              >
                                Desactivar
                              </button>
                            ) : (
                              <button
                                className="block w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-gray-100"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  handleActivate(user);
                                  setOpenMenuId(null);
                                }}
                              >
                                Activar
                              </button>
                            )}

                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleDelete(user);
                                setOpenMenuId(null);
                              }}
                              className="block w-full px-4 py-2 text-left text-red-700 hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-gray-500"
                  >
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de usuario */}
      <UserFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSaved={handleSaved}
      />
    </div>
  );
}
