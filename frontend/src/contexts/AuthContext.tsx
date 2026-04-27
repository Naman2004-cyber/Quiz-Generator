"use client";

/* ══════════════════════════════════════════════════════
   Aura Learn — Auth Context
   Provides auth state to the entire app via React Context.
   Sets the storage namespace when user changes.
   ══════════════════════════════════════════════════════ */

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthChange, type User } from "@/lib/auth";
import { setCurrentUserId } from "@/lib/storage";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const unsubscribe = onAuthChange((firebaseUser) => {
        setUser(firebaseUser);
        setCurrentUserId(firebaseUser?.uid || null);
        setLoading(false);
      });
      return unsubscribe;
    } catch (err) {
      console.error("AuthContext: ERROR in onAuthChange setup:", err);
      // Ensure setState is not synchronous with the effect execution to avoid React/eslint errors
      setTimeout(() => setLoading(false), 0);
      return () => {};
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
