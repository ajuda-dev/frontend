/// <reference types="vitest/config" />
import http from "node:http";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const API_HOST = "127.0.0.1";
const API_PORT = 8080;
const STREAM_PATH = "/v1/notifications/stream";

// http-proxy do Vite trata SSE como HTTP curto: no primeiro frame de notificação
// o socket com o backend cai com ECONNRESET e o overlay do dev server dispara.
function proxyNotificationStream(): Plugin {
  return {
    name: "proxy-notification-stream",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith(STREAM_PATH)) {
          next();
          return;
        }

        const headers = { ...req.headers, host: `${API_HOST}:${API_PORT}` };
        delete headers["accept-encoding"];

        const proxyReq = http.request(
          {
            hostname: API_HOST,
            port: API_PORT,
            path: url,
            method: req.method,
            headers,
          },
          (proxyRes) => {
            const responseHeaders = { ...proxyRes.headers };
            responseHeaders["cache-control"] = "no-cache";
            responseHeaders["x-accel-buffering"] = "no";
            delete responseHeaders["content-length"];
            res.writeHead(proxyRes.statusCode ?? 200, responseHeaders);
            proxyRes.pipe(res);
          },
        );

        proxyReq.setTimeout(0);
        req.socket.setTimeout(0);

        proxyReq.on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "ECONNRESET" || err.code === "EPIPE") return;
          if (!res.headersSent) {
            res.writeHead(502);
            res.end();
          }
        });

        res.on("close", () => {
          if (!res.writableEnded) proxyReq.destroy();
        });
        req.pipe(proxyReq);
      });
    },
  };
}

export default defineConfig({
  plugins: [proxyNotificationStream(), react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    proxy: {
      "/v1": {
        target: `http://${API_HOST}:${API_PORT}`,
        changeOrigin: false,
        timeout: 0,
        proxyTimeout: 0,
        agent: new http.Agent({ keepAlive: true, family: 4 }),
        configure(proxy) {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            if (!req.url?.includes("/notifications/stream")) return;
            res.on("close", () => {
              if (!res.writableEnded) proxyReq.destroy();
            });
          });
          proxy.on("proxyRes", (proxyRes, req, res) => {
            if (!req.url?.includes("/notifications/stream")) return;
            proxyRes.headers["cache-control"] = "no-cache";
            proxyRes.headers["x-accel-buffering"] = "no";
            delete proxyRes.headers["content-length"];
            req.socket.setTimeout(0);
            res.socket?.setTimeout(0);
          });
          proxy.on("error", (err, _req, res) => {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === "ECONNRESET" || code === "EPIPE") return;
            if (res && "writeHead" in res && !res.headersSent) {
              res.writeHead(502);
              res.end();
            }
          });
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: false,
  },
});
