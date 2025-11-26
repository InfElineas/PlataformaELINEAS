"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const SessionContext = createContext({
  user: null,
  permissions: [],
  roleKeys: [],
  refresh: async () => {},
});

export function AuthSessionProvider({ initialSession, children }) {
  const [session, setSession] = useState(
    initialSession ?? { user: null, permissions: [], roleKeys: [] },
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      if (!res.ok) {
        setSession({ user: null, permissions: [], roleKeys: [] });
        return;
      }
      const data = await res.json();
      setSession(data);
    } catch (error) {
      console.error("Failed to refresh session", error);
    }
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      permissions: session?.permissions ?? [],
      roleKeys: session?.roleKeys ?? [],
      refresh,
    }),
    [session, refresh],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useAuthSession() {
  return useContext(SessionContext);
}
