import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, resolve } from "node:path";

export const root = resolve(import.meta.dirname, "..");
const executable = (name) =>
  name + (process.platform === "win32" ? ".exe" : "");
const localBin = resolve(root, ".tools/cargo/bin");
export const env = {
  ...process.env,
  ...(process.env.CARGO_TARGET_DIR
    ? { CARGO_TARGET_DIR: resolve(root, process.env.CARGO_TARGET_DIR) }
    : {}),
  ...(existsSync(resolve(localBin, executable("cargo")))
    ? {
        CARGO_HOME: resolve(root, ".tools/cargo"),
        RUSTUP_HOME: resolve(root, ".tools/rustup"),
        PATH: localBin + delimiter + process.env.PATH,
      }
    : {}),
};
export const cargo = existsSync(resolve(localBin, executable("cargo")))
  ? resolve(localBin, executable("cargo"))
  : "cargo";
export const rustc = existsSync(resolve(localBin, executable("rustc")))
  ? resolve(localBin, executable("rustc"))
  : "rustc";
export function run(command, args = [], options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    env,
    stdio: "inherit",
    ...options,
  });
}
// Only fixed, internally generated npm arguments reach the Windows command shell.
export function npm(args) {
  run(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    shell: process.platform === "win32",
  });
}
export function tauri(args) {
  run(
    process.execPath,
    [resolve(root, "node_modules/@tauri-apps/cli/tauri.js"), ...args],
    { cwd: resolve(root, "apps/desktop") },
  );
}
export function hostTuple() {
  const output = run(rustc, ["-vV"], { encoding: "utf8", stdio: "pipe" });
  const host = /^host: (.+)$/m.exec(output)?.[1];
  if (!host) throw new Error("Cannot determine the Rust host target");
  return host;
}
