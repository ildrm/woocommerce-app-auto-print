import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
await mkdir(resolve(root, ".data"), { recursive: true });
const directory = await mkdtemp(resolve(root, ".data/e2e-"));
const env = {
  ...process.env,
  AUTOPRINT_DATA_DIR: directory,
  AUTOPRINT_DEV_PORT: "5183",
  AUTOPRINT_TEST_URL: "http://127.0.0.1:5183",
};
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const agent = spawn(
  resolve(
    root,
    "target/debug/autoprint-agent" +
      (process.platform === "win32" ? ".exe" : ""),
  ),
  ["--data-dir", directory],
  { env, cwd: root, stdio: ["ignore", "ignore", "inherit"] },
);
const server = spawn(
  process.execPath,
  [resolve(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1"],
  {
    env,
    cwd: resolve(root, "apps/desktop"),
    stdio: ["ignore", "ignore", "inherit"],
  },
);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(`${env.AUTOPRINT_TEST_URL}/api/health`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await wait(250);
  }
  if (!ready)
    throw new Error("Isolated test agent or frontend failed to start");
  const test = spawn(npm, ["exec", "--", "playwright", "test"], {
    env,
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  const code = await new Promise((resolve) => test.on("exit", resolve));
  process.exitCode = code ?? 1;
} finally {
  try {
    const endpoint = JSON.parse(
      await readFile(resolve(directory, "ipc.json"), "utf8"),
    );
    await fetch(`http://127.0.0.1:${endpoint.port}/shutdown`, {
      method: "POST",
      headers: { authorization: `Bearer ${endpoint.token}` },
    });
  } catch {}
  await wait(1000);
  server.kill("SIGTERM");
  if (agent.exitCode === null) agent.kill("SIGTERM");
  await rm(directory, { recursive: true, force: true });
}
