"use client";

import { createContext, useContext } from "react";
import { useProductFilters } from "@/hooks/useProductFilters";

const ProductFiltersContext = createContext(null);

export function ProductFiltersProvider({ children }) {
  const filters = useProductFilters();
  return (
    <ProductFiltersContext.Provider value={filters}>
      {children}
    </ProductFiltersContext.Provider>
  );
}

export function useGlobalProductFilters() {
  const ctx = useContext(ProductFiltersContext);
  if (!ctx) {
    throw new Error(
      "useGlobalProductFilters debe usarse dentro de <ProductFiltersProvider>",
    );
  }
  return ctx;
}
