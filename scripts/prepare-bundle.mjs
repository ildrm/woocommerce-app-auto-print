import {
  mkdirSync,
  copyFileSync,
  existsSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { root, env, cargo, run, tauri, hostTuple } from "./build-common.mjs";

const nativeHost = hostTuple();
const host = env.AUTOPRINT_BUILD_TARGET || nativeHost;
if (host !== nativeHost && host !== "x86_64-pc-windows-msvc")
  throw new Error("Only Windows x64 cross-compilation is supported");
const windows = host.endsWith("windows-msvc");
const cross = host !== nativeHost;
const ext = windows ? ".exe" : "";
const typst = resolve(root, ".tools/bin/typst" + ext);
if (!existsSync(typst))
  throw new Error("Run node scripts/fetch-runtime.mjs first");
const helper = env.AUTOPRINT_SUMATRA;
if (windows && (!helper || !existsSync(helper))) {
  throw new Error(
    "Set AUTOPRINT_SUMATRA to the verified official portable SumatraPDF executable. Its GPL source and license must accompany distribution.",
  );
}
run(cross ? "cargo-xwin" : cargo, [
  "build",
  "--locked",
  "--release",
  "-p",
  "autoprint-agent",
  "-p",
  "autoprint-relay",
  ...(cross ? ["--target", host] : []),
]);
tauri(["icon", "../../assets/app-icon.svg"]);
const dir = resolve(root, "apps/desktop/src-tauri/binaries");
mkdirSync(dir, { recursive: true });
const release = resolve(
  root,
  env.CARGO_TARGET_DIR || "target",
  ...(cross ? [host] : []),
  "release",
);
copyFileSync(
  resolve(release, "autoprint-agent" + ext),
  resolve(dir, `autoprint-agent-${host}${ext}`),
);
copyFileSync(typst, resolve(dir, `autoprint-typst-${host}${ext}`));
if (windows)
  copyFileSync(helper, resolve(dir, `autoprint-sumatra-${host}.exe`));
const version = JSON.parse(
  readFileSync(resolve(root, "apps/desktop/src-tauri/tauri.conf.json")),
).version;
mkdirSync(resolve(root, ".tools"), { recursive: true });
writeFileSync(
  resolve(root, ".tools/bundle-manifest.json"),
  JSON.stringify(
    {
      host,
      renderer: "Typst 0.15.1",
      agent: version,
      fonts: "assets/fonts/manifest.json",
    },
    null,
    2,
  ) + "\n",
);
console.log(`Prepared ${host} release sidecars`);
