"use client";

import {
  Dispatch,
  SetStateAction,
  createContext,
  useEffect,
  useState,
} from "react";

export interface StoreInterface {
  business: string;
  from_date?: Date | number;
  to_date?: Date | number;
}

export const StoreContext = createContext<{
  store: Partial<StoreInterface>;
  setStore: Dispatch<SetStateAction<Partial<StoreInterface>>>;
}>({
  store: {},
  setStore: () => null,
});

const StoreProvider = ({ children }: { children: any }) => {
  /**
   * state
   */
  const [store, setStore] = useState<Partial<StoreInterface>>(() => {
    if (typeof window !== "undefined") {
      const store = window.localStorage.getItem(
        process.env["NEXT_PUBLIC_STORAGE_KEY"]!
      );

      if (store) {
        return JSON.parse(store);
      }
    }

    return null;
  });

  /**
   * effect
   */
  useEffect(() => {
    if (store) {
      window.localStorage.setItem(
        process.env["NEXT_PUBLIC_STORAGE_KEY"]!,
        JSON.stringify(store)
      );
    }
  }, [store]);

  return (
    <StoreContext.Provider value={{ store, setStore }}>
      {children}
    </StoreContext.Provider>
  );
};

export default StoreProvider;
