import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const systemChrome =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  use: {
    baseURL: process.env.AUTOPRINT_TEST_URL ?? "http://127.0.0.1:5173",
    viewport: { width: 1536, height: 1024 },
    launchOptions: {
      executablePath:
        process.env.AUTOPRINT_CHROME ??
        (existsSync(systemChrome) ? systemChrome : undefined),
    },
    trace: "retain-on-failure",
  },
  reporter: "list",
});
