import { useEffect } from "react";

import { supabase } from "@lib/supabase";
import { useAuthStore } from "@store/index";

export function useAuthBootstrap() {
  const initialize = useAuthStore((state) => state.initialize);
  const setSession = useAuthStore((state) => state.setSession);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const clearProfile = useAuthStore((state) => state.clearProfile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      setInitialized(true);
    }, 4000);

    void initialize().finally(() => {
      clearTimeout(safetyTimeout);
    });

    if (!supabase) {
      setInitialized(true);
      clearTimeout(safetyTimeout);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await refreshProfile(session.user.id).catch(() => undefined);
        setSession(session);
      } else {
        setSession(null);
        clearProfile();
      }

      setInitialized(true);
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [clearProfile, initialize, refreshProfile, setInitialized, setSession]);
}
