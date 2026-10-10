import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const localCargo = resolve(
  root,
  ".tools/cargo/bin/cargo" + (process.platform === "win32" ? ".exe" : ""),
);
const cargo = existsSync(localCargo) ? localCargo : "cargo";
const env = {
  ...process.env,
  ...(existsSync(localCargo)
    ? {
        CARGO_HOME: resolve(root, ".tools/cargo"),
        RUSTUP_HOME: resolve(root, ".tools/rustup"),
        PATH:
          resolve(root, ".tools/cargo/bin") +
          (process.platform === "win32" ? ";" : ":") +
          process.env.PATH,
      }
    : {}),
};
const rustc = existsSync(localCargo)
  ? resolve(
      root,
      ".tools/cargo/bin/rustc" + (process.platform === "win32" ? ".exe" : ""),
    )
  : "rustc";
const host = execFileSync(rustc, ["--print", "host-tuple"], {
  env,
  encoding: "utf8",
}).trim();
execFileSync(
  cargo,
  ["build", "--release", "-p", "autoprint-agent", "-p", "autoprint-relay"],
  { cwd: root, env, stdio: "inherit" },
);
execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["exec", "-w", "apps/desktop", "--", "tauri", "icon", "../../assets/app-icon.svg"], {cwd:root,env,stdio:"inherit",shell:process.platform === "win32"});
const dir = resolve(root, "apps/desktop/src-tauri/binaries");
mkdirSync(dir, { recursive: true });
const ext = process.platform === "win32" ? ".exe" : "";
copyFileSync(
  resolve(root, "target/release/autoprint-agent" + ext),
  resolve(dir, `autoprint-agent-${host}${ext}`),
);
const typst = resolve(root, ".tools/bin/typst" + ext);
if (!existsSync(typst)) throw new Error("Run scripts/fetch-runtime.mjs first");
copyFileSync(typst, resolve(dir, `autoprint-typst-${host}${ext}`));
if (process.platform === "win32") {
  const helper = process.env.AUTOPRINT_SUMATRA;
  if (!helper || !existsSync(helper))
    throw new Error(
      "Set AUTOPRINT_SUMATRA to the verified official portable SumatraPDF executable. Its GPL source and license must accompany distribution.",
    );
  copyFileSync(helper, resolve(dir, `autoprint-sumatra-${host}.exe`));
}
writeFileSync(
  resolve(root, ".tools/bundle-manifest.json"),
  JSON.stringify(
    {
      host,
      renderer: "Typst 0.15.1",
      agent: "0.1.0",
      fonts: "assets/fonts/manifest.json",
    },
    null,
    2,
  ),
);
console.log(`Prepared ${host} release sidecars`);
