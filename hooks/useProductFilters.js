"use client";

import { useEffect, useMemo, useState } from "react";

export const ALL = "__ALL__";

const DEFAULT_FILTERS = {
  existencia: ALL,
  almacen: ALL,
  suministrador: ALL,
  categoria: ALL,
  marca: ALL,
  habilitado: ALL,
  activado: ALL,
};

const STORAGE_KEY = "products_filters_state";

function withDefaults(candidate) {
  return { ...DEFAULT_FILTERS, ...(candidate || {}) };
}

export function useProductFilters() {
  const [pendingFilters, setPendingFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
  }));
  const [appliedFilters, setAppliedFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
  }));
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      setPendingFilters(withDefaults(parsed?.pendingFilters));
      setAppliedFilters(withDefaults(parsed?.appliedFilters));
      setSearch(parsed?.search ?? "");
    } catch (e) {
      console.error("No se pudo leer el estado global de filtros", e);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const payload = JSON.stringify({ pendingFilters, appliedFilters, search });
    window.localStorage.setItem(STORAGE_KEY, payload);
  }, [pendingFilters, appliedFilters, search]);

  const setPendingFilter = (key, value) => {
    setPendingFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters(pendingFilters);
  };

  const resetFilters = () => {
    setPendingFilters({ ...DEFAULT_FILTERS });
    setAppliedFilters({ ...DEFAULT_FILTERS });
    setSearch("");
  };

  return useMemo(
    () => ({
      pendingFilters,
      appliedFilters,
      search,
      setSearch,
      setPendingFilter,
      applyFilters,
      resetFilters,
    }),
    [pendingFilters, appliedFilters, search],
  );
}
