import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const triples = {
  darwin: { arm64: "aarch64-apple-darwin", x64: "x86_64-apple-darwin" },
  linux: {
    arm64: "aarch64-unknown-linux-musl",
    x64: "x86_64-unknown-linux-musl",
  },
  win32: { x64: "x86_64-pc-windows-msvc" },
};
const triple = triples[process.platform]?.[process.arch];
if (!triple)
  throw new Error("No verified renderer package for this OS and architecture");
const downloads = resolve(root, ".tools/downloads");
const bin = resolve(root, ".tools/bin");
mkdirSync(downloads, { recursive: true });
mkdirSync(bin, { recursive: true });
const win = process.platform === "win32";
const archive = `typst-${triple}.${win ? "zip" : "tar.xz"}`;
const path = resolve(downloads, archive);
if (!existsSync(path))
  execFileSync(
    "curl",
    [
      "--proto",
      "=https",
      "--tlsv1.2",
      "-fL",
      "--connect-timeout",
      "15",
      "--max-time",
      "180",
      `https://github.com/typst/typst/releases/download/v0.15.1/${archive}`,
      "-o",
      path,
    ],
    { stdio: "inherit" },
  );
execFileSync("tar", ["-xf", path, "-C", downloads], { stdio: "inherit" });
copyFileSync(
  resolve(downloads, `typst-${triple}`, `typst${win ? ".exe" : ""}`),
  resolve(bin, `typst${win ? ".exe" : ""}`),
);
console.log(
  "Renderer installed. Fetch pinned fonts with python3 scripts/fetch-fonts.py.",
);
