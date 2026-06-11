import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import type { Database } from "@appTypes/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const memoryStorage = new Map<string, string>();

function getBrowserStorage() {
  if (
    typeof localStorage === "undefined" ||
    typeof localStorage.getItem !== "function" ||
    typeof localStorage.setItem !== "function" ||
    typeof localStorage.removeItem !== "function"
  ) {
    return null;
  }

  return localStorage;
}

const webStorageAdapter = {
  getItem: (key: string) => {
    const storage = getBrowserStorage();

    if (!storage) {
      return memoryStorage.get(key) ?? null;
    }

    return storage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    const storage = getBrowserStorage();

    if (!storage) {
      memoryStorage.set(key, value);
      return;
    }

    storage.setItem(key, value);
  },
  removeItem: (key: string) => {
    const storage = getBrowserStorage();

    if (!storage) {
      memoryStorage.delete(key);
      return;
    }

    storage.removeItem(key);
  },
};

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: Platform.OS === "web" ? webStorageAdapter : secureStoreAdapter,
      },
    })
  : null;
