import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const port = Number(process.env.AUTOPRINT_DEV_PORT ?? 5173);
export default defineConfig({
  plugins: [
    react(),
    tailwind(),
    {
      name: "local-agent-development-bridge",
      configureServer(server) {
        server.middlewares.use("/api", async (req, res) => {
          try {
            const host = req.headers.host ?? "";
            const origin = req.headers.origin;
            if (
              ![`127.0.0.1:${port}`, `localhost:${port}`].includes(host) ||
              (origin &&
                ![
                  `http://127.0.0.1:${port}`,
                  `http://localhost:${port}`,
                ].includes(origin))
            ) {
              res.statusCode = 403;
              res.end("Local development access only");
              return;
            }
            const path = req.url ?? "/";
            const decoded = decodeURIComponent(path);
            if (
              !/^\/[a-zA-Z0-9/_ .-]+$/.test(decoded) ||
              decoded.includes("..")
            )
              throw new Error("Invalid engine path");
            const data =
              process.env.AUTOPRINT_DATA_DIR ?? resolve("../../.data/dev");
            const endpoint = JSON.parse(
              await readFile(resolve(data, "ipc.json"), "utf8"),
            ) as { port: number; token: string };
            if (
              !Number.isInteger(endpoint.port) ||
              endpoint.port < 1 ||
              endpoint.port > 65535
            )
              throw new Error("Invalid endpoint");
            const chunks: Buffer[] = [];
            let size = 0;
            for await (const chunk of req) {
              size += chunk.length;
              if (size > 2 * 1024 * 1024) throw new Error("Request too large");
              chunks.push(Buffer.from(chunk));
            }
            const response = await fetch(
              `http://127.0.0.1:${endpoint.port}${path}`,
              {
                method: req.method,
                headers: {
                  authorization: `Bearer ${endpoint.token}`,
                  "content-type": "application/json",
                  ...(req.headers["x-confirm-reprint"] === "yes"
                    ? { "x-confirm-reprint": "yes" }
                    : {}),
                },
                body: ["GET", "HEAD"].includes(req.method ?? "GET")
                  ? undefined
                  : Buffer.concat(chunks),
                signal: AbortSignal.timeout(70000),
                redirect: "error",
              },
            );
            res.statusCode = response.status;
            res.setHeader(
              "Content-Type",
              response.headers.get("content-type") ?? "application/json",
            );
            res.setHeader("Cache-Control", "no-store");
            res.end(Buffer.from(await response.arrayBuffer()));
          } catch {
            res.statusCode = 503;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error:
                  "Printing engine is offline. Start the agent with the development data directory.",
              }),
            );
          }
        });
      },
    },
  ],
  server: { port, strictPort: true },
  clearScreen: false,
});
