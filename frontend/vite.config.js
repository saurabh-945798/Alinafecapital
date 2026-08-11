import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = (env.VITE_DEV_PROXY_TARGET || "http://localhost:5000").trim();

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      ...(command === "serve" && proxyTarget
        ? {
            proxy: {
              "/api": {
                target: proxyTarget,
                changeOrigin: true,
                secure: false,
              },
            },
          }
        : {}),
    },
  };
});
