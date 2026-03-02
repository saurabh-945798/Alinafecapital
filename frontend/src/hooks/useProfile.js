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

export const useProfile = () => {
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

    if (!profileStore.initialized && !profileStore.request) {
      runFetch();
    }

    return () => {
      profileStore.listeners.delete(sync);
    };
  }, []);

  const refresh = useCallback(async () => {
    await runFetch();
  }, []);

  return { ...state, refresh };
};
