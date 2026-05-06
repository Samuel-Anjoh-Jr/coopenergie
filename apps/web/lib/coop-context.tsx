"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

const STORAGE_KEY = "coopenergie-active-coop";

interface CoopContextType {
  activeCoopId: string | null;
  hasHydrated: boolean;
  setActiveCoopId: (id: string) => void;
}

const CoopContext = createContext<CoopContextType>({
  activeCoopId: null,
  hasHydrated: false,
  setActiveCoopId: () => {},
});

export function CoopProvider({ children }: { children: ReactNode }) {
  const [activeCoopId, setActiveCoopIdState] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setActiveCoopIdState(stored);
      }
    }

    setHasHydrated(true);
  }, []);

  const setActiveCoopId = (id: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }

    setActiveCoopIdState(id);
  };

  return (
    <CoopContext.Provider
      value={{ activeCoopId, hasHydrated, setActiveCoopId }}
    >
      {children}
    </CoopContext.Provider>
  );
}

export function useActiveCoop() {
  return useContext(CoopContext);
}
