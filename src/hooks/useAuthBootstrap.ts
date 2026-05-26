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
    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session?.user) {
        await refreshProfile(session.user.id).catch(() => undefined);
      } else {
        clearProfile();
      }

      setInitialized(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clearProfile, initialize, refreshProfile, setInitialized, setSession]);
}
