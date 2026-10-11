import { createHash } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { root, env, run, npm, tauri, hostTuple } from "./build-common.mjs";

const [platform, ...options] = process.argv.slice(2);
const platforms = {
  macos: "darwin",
  debian: "linux",
  redhat: "linux",
  windows: "win32",
};
if (
  !Object.hasOwn(platforms, platform) ||
  options.some(
    (arg) => !["--check", "--skip-bootstrap", "--cross-windows"].includes(arg),
  )
) {
  console.error(
    "Usage: node scripts/build-desktop.mjs macos|debian|redhat|windows [--check] [--skip-bootstrap]",
  );
  process.exit(2);
}
try {
  const cross = options.includes("--cross-windows");
  if (
    cross &&
    (platform !== "windows" || !["linux", "darwin"].includes(process.platform))
  )
    throw new Error(
      "--cross-windows is only supported for Windows builds from Linux/macOS",
    );
  if (cross) env.AUTOPRINT_BUILD_TARGET = "x86_64-pc-windows-msvc";
  if (!cross && process.platform !== platforms[platform])
    throw new Error(
      `${platform} requires a ${platforms[platform]} host; this host is ${process.platform}. ${platform === "windows" ? "For experimental NSIS cross-compilation use scripts/build-windows-cross.sh or scripts/build-windows-container.sh." : "For Linux on macOS/Windows use scripts/build-linux-container.sh."}`,
    );
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error("Node.js 24 or later is required");
  const nativeHost = hostTuple();
  const host = cross ? "x86_64-pc-windows-msvc" : nativeHost;
  const nativeArch = { arm64: "aarch64", x64: "x86_64" }[process.arch];
  if (!cross && (!nativeArch || !host.startsWith(nativeArch + "-")))
    throw new Error(
      "Use matching x64 or arm64 Node.js and Rust toolchains so the renderer and agent have the same architecture",
    );
  const config = JSON.parse(
    readFileSync(resolve(root, "apps/desktop/src-tauri/tauri.conf.json")),
  );
  if (platform === "macos") run("xcode-select", ["-p"]);
  if (["debian", "redhat"].includes(platform)) {
    const osRelease = readFileSync("/etc/os-release", "utf8");
    const family = [...osRelease.matchAll(/^(?:ID|ID_LIKE)=(.+)$/gm)]
      .map((match) => match[1])
      .join(" ")
      .replaceAll('"', "");
    const expected =
      platform === "debian"
        ? /\b(debian|ubuntu)\b/
        : /\b(fedora|rhel|centos|rocky|almalinux)\b/;
    if (!expected.test(family))
      throw new Error(`Use a ${platform} family build host (found ${family})`);
    run("pkg-config", [
      "--exists",
      "webkit2gtk-4.1",
      "gtk+-3.0",
      "dbus-1",
      "openssl",
    ]);
    if (!existsSync("/usr/include/xdo.h"))
      throw new Error(
        "Install the libxdo development headers with scripts/install-linux-deps.sh",
      );
    try {
      run("pkg-config", ["--exists", "ayatana-appindicator3-0.1"]);
    } catch {
      run("pkg-config", ["--exists", "appindicator3-0.1"]);
    }
  }
  if (platform === "windows") {
    if (!cross && (host !== "x86_64-pc-windows-msvc" || process.arch !== "x64"))
      throw new Error(
        "Windows packaging currently requires x86_64-pc-windows-msvc Rust and an x64 Node.js runtime",
      );
    if (cross) {
      run("cargo-xwin", ["--version"]);
      run("makensis", ["-VERSION"]);
      run("clang", ["--version"]);
    }
    if (!env.AUTOPRINT_SUMATRA || !existsSync(env.AUTOPRINT_SUMATRA))
      throw new Error(
        "Set AUTOPRINT_SUMATRA to an existing, verified portable SumatraPDF.exe before building Windows",
      );
  }
  console.log(`Prerequisites checked: ${platform}, ${host}`);
  if (options.includes("--check")) process.exit(0);
  if (!options.includes("--skip-bootstrap")) {
    console.log("Installing locked frontend build dependencies...");
    npm([
      "ci",
      "--include=dev",
      "--include=optional",
      "--no-audit",
      "--no-fund",
    ]);
    run(process.execPath, ["scripts/fetch-runtime.mjs"]);
    run(process.platform === "win32" ? "python" : "python3", [
      "scripts/fetch-fonts.py",
    ]);
  }
  run(process.execPath, ["scripts/prepare-bundle.mjs"]);
  const bundles = {
    macos: "app",
    debian: "deb",
    redhat: "rpm",
    windows: "nsis,msi",
  };
  tauri([
    "build",
    "--ci",
    ...(cross
      ? ["--config", JSON.stringify({ bundle: { targets: ["nsis"] } })]
      : ["--bundles", bundles[platform]]),
    "--no-sign",
    ...(cross ? ["--runner", "cargo-xwin", "--target", host] : []),
    "--",
    "--locked",
  ]);
  const release = resolve(
    root,
    env.CARGO_TARGET_DIR || "target",
    ...(cross ? [host] : []),
    "release",
  );
  const output = resolve(root, "artifacts", `${platform}-${host}`);
  mkdirSync(output, { recursive: true });
  const packaged = [];
  if (platform === "macos") {
    const app = `${config.productName}.app`;
    cpSync(join(release, "bundle/macos", app), join(output, app), {
      recursive: true,
    });
    const stage = mkdtempSync(join(tmpdir(), "autoprint-dmg-"));
    const dmg = `${config.productName}_${config.version}_${process.arch}.dmg`;
    try {
      run("ditto", [join(output, app), join(stage, app)]);
      run("ln", ["-s", "/Applications", join(stage, "Applications")]);
      const dmgDir = join(release, "bundle/dmg");
      mkdirSync(dmgDir, { recursive: true });
      run("hdiutil", [
        "create",
        "-ov",
        "-volname",
        config.productName,
        "-srcfolder",
        stage,
        "-format",
        "UDZO",
        join(dmgDir, dmg),
      ]);
      run("hdiutil", ["verify", join(dmgDir, dmg)]);
      copyFileSync(join(dmgDir, dmg), join(output, dmg));
      packaged.push(dmg);
    } finally {
      rmSync(stage, { recursive: true, force: true });
    }
  } else {
    const directories =
      platform === "windows"
        ? cross
          ? ["nsis"]
          : ["nsis", "msi"]
        : [bundles[platform]];
    for (const directory of directories) {
      const extension = { deb: ".deb", rpm: ".rpm", nsis: ".exe", msi: ".msi" }[
        directory
      ];
      const source = join(release, "bundle", directory);
      const files = readdirSync(source).filter((file) =>
        file.endsWith(extension),
      );
      if (!files.length)
        throw new Error(`No ${extension} installer produced in ${source}`);
      for (const file of files) {
        copyFileSync(join(source, file), join(output, file));
        packaged.push(file);
      }
    }
  }
  for (const name of ["autoprint-agent", "autoprint-relay"]) {
    const file = name + (platform === "windows" ? ".exe" : "");
    copyFileSync(join(release, file), join(output, file));
    packaged.push(file);
  }
  if (cross) {
    for (const file of [
      "SumatraPDF-3.6.1-source.tar.gz",
      "SumatraPDF-COPYING.txt",
      "SumatraPDF-provenance.json",
    ]) {
      const source = resolve(root, ".tools/downloads", file);
      if (existsSync(source)) {
        copyFileSync(source, join(output, file));
        packaged.push(file);
      }
    }
  }
  writeFileSync(
    join(output, "SHA256SUMS"),
    packaged
      .map(
        (file) =>
          `${createHash("sha256")
            .update(readFileSync(join(output, file)))
            .digest("hex")}  ${basename(file)}`,
      )
      .join("\n") + "\n",
  );
  writeFileSync(
    join(output, "build-manifest.json"),
    JSON.stringify(
      {
        platform,
        host,
        buildHost: nativeHost,
        crossCompiled: cross,
        version: config.version,
        node: process.version,
        builtAt: new Date().toISOString(),
        signed: false,
        files: packaged,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Build complete: ${output}`);
} catch (error) {
  console.error(`Build failed: ${error.message}`);
  process.exit(1);
}
