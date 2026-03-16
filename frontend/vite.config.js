import { defineConfig, loadEnv } from "vite";

function extractOrigin(urlValue) {
  if (!urlValue) return null;
  try {
    const parsed = new URL(urlValue);
    const port = parsed.port ? `:${parsed.port}` : "";
    return `${parsed.protocol}//${parsed.hostname}${port}`;
  } catch {
    return null;
  }
}

function resolveProxyTarget(env) {
  const candidates = [env.VITE_PROXY_TARGET, env.VITE_API_BASE_URL, env.VITE_SOCKET_URL];
  for (const value of candidates) {
    const origin = extractOrigin(value);
    if (origin) return origin;
  }
  return "http://localhost:4000";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const proxyTarget = resolveProxyTarget(env);

  return {
    esbuild: {
      jsx: "automatic"
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/socket.io": {
          target: proxyTarget,
          ws: true,
          changeOrigin: true
        }
      }
    }
  };
});
