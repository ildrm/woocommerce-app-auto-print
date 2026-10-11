import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  copyFileSync,
  existsSync,
  renameSync,
  rmSync,
  chmodSync,
} from "node:fs";
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
const nativeTriple = triples[process.platform]?.[process.arch];
const triple =
  process.env.AUTOPRINT_BUILD_TARGET === "x86_64-pc-windows-msvc"
    ? process.env.AUTOPRINT_BUILD_TARGET
    : nativeTriple;
if (!triple)
  throw new Error("No verified renderer package for this OS and architecture");
const downloads = resolve(root, ".tools/downloads");
const bin = resolve(root, ".tools/bin");
mkdirSync(downloads, { recursive: true });
mkdirSync(bin, { recursive: true });
const win = triple.endsWith("windows-msvc");
const archive = `typst-${triple}.${win ? "zip" : "tar.xz"}`;
const path = resolve(downloads, archive);
if (!existsSync(path)) {
  const partial = path + ".partial";
  try {
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
        partial,
      ],
      { stdio: "inherit" },
    );
    renameSync(partial, path);
  } finally {
    rmSync(partial, { force: true });
  }
}
if (win && process.platform !== "win32") {
  execFileSync("unzip", ["-o", path, "-d", downloads], { stdio: "inherit" });
} else {
  execFileSync("tar", ["-xf", path, "-C", downloads], { stdio: "inherit" });
}
copyFileSync(
  resolve(downloads, `typst-${triple}`, `typst${win ? ".exe" : ""}`),
  resolve(bin, `typst${win ? ".exe" : ""}`),
);
if (!win) chmodSync(resolve(bin, "typst"), 0o755);
if (triple === nativeTriple) {
  const version = execFileSync(
    resolve(bin, `typst${win ? ".exe" : ""}`),
    ["--version"],
    { encoding: "utf8" },
  );
  if (!version.startsWith("typst 0.15.1"))
    throw new Error("Unexpected renderer version");
}
console.log(
  "Renderer installed. Fetch pinned fonts with python3 scripts/fetch-fonts.py.",
);
