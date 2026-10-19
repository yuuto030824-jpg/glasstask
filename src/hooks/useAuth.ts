import { useCallback, useEffect, useState } from "react";
import type { MeResponse, User } from "@shared/types";
import { api } from "../lib/api";

export type AuthState = {
  status: "loading" | "ready";
  user: User | null;
  devLogin: boolean;
  googleEnabled: boolean;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    devLogin: false,
    googleEnabled: false,
  });

  const apply = (me: MeResponse) =>
    setState({ status: "ready", user: me.user, devLogin: me.devLogin, googleEnabled: me.googleEnabled });

  const refresh = useCallback(async () => {
    try {
      apply(await api.me());
    } catch {
      setState((s) => ({ ...s, status: "ready", user: null }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loginGoogle = useCallback(() => {
    window.location.assign("/api/auth/google");
  }, []);

  const loginDev = useCallback(async () => {
    await api.devLogin();
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.logout();
    setState((s) => ({ ...s, user: null }));
  }, []);

  return { ...state, refresh, loginGoogle, loginDev, logout };
}
