import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

const profileStore = {
  profile: null,
  loading: true,
  error: "",
  initialized: false,
  request: null,
  listeners: new Set(),
};

const notify = () => {
  profileStore.listeners.forEach((listener) => listener());
};

const runFetch = async () => {
  if (profileStore.request) return profileStore.request;

  profileStore.loading = true;
  profileStore.error = "";
  notify();

  profileStore.request = api
    .get("/profile/me")
    .then(({ data }) => {
      profileStore.profile = data?.item ?? data?.data ?? null;
      profileStore.error = "";
    })
    .catch((err) => {
      profileStore.error = err?.response?.data?.message || "Failed to load profile";
    })
    .finally(() => {
      profileStore.loading = false;
      profileStore.initialized = true;
      profileStore.request = null;
      notify();
    });

  return profileStore.request;
};

export const useProfile = (enabled = true) => {
  const [state, setState] = useState({
    profile: profileStore.profile,
    loading: profileStore.loading,
    error: profileStore.error,
  });

  useEffect(() => {
    const sync = () => {
      setState({
        profile: profileStore.profile,
        loading: profileStore.loading,
        error: profileStore.error,
      });
    };

    profileStore.listeners.add(sync);
    sync();

    if (enabled && !profileStore.initialized && !profileStore.request) {
      runFetch();
    }

    return () => {
      profileStore.listeners.delete(sync);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    await runFetch();
  }, [enabled]);

  return { ...state, refresh };
};

export const usePublicProfile = (token, enabled = true) => {
  const [state, setState] = useState({
    profile: null,
    loading: true,
    error: "",
  });

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    if (!token) {
      setState({ profile: null, loading: false, error: "Invalid inquiry link" });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const { data } = await api.get(`/inquiries/access/${token}/profile`);
      setState({
        profile: data?.item ?? data?.data ?? null,
        loading: false,
        error: "",
      });
    } catch (err) {
      setState({
        profile: null,
        loading: false,
        error: err?.response?.data?.message || "Failed to load profile",
      });
    }
  }, [enabled, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
};
