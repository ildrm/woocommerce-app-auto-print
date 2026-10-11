// Optional helper bootstrap for the Windows cross-build, pinned to official 3.6.1.
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { root, run } from "./build-common.mjs";

const downloads = resolve(root, ".tools/downloads");
const bin = resolve(root, ".tools/bin");
mkdirSync(downloads, { recursive: true });
mkdirSync(bin, { recursive: true });
function download(url, destination) {
  if (existsSync(destination)) return;
  const partial = destination + ".partial";
  try {
    run("curl", [
      "--proto",
      "=https",
      "--tlsv1.2",
      "-fL",
      "--connect-timeout",
      "15",
      "--max-time",
      "180",
      url,
      "-o",
      partial,
    ]);
    renameSync(partial, destination);
  } finally {
    rmSync(partial, { force: true });
  }
}
const archive = resolve(downloads, "SumatraPDF-3.6.1-64.zip");
const url =
  "https://www.sumatrapdfreader.org/dl/rel/3.6.1/SumatraPDF-3.6.1-64.zip";
download(url, archive);
const expected =
  "98b33a518d42986856d225064b0cd2d3643ecf78cbf84ab873d26cc51877a544";
const actual = createHash("sha256").update(readFileSync(archive)).digest("hex");
if (actual !== expected)
  throw new Error("SumatraPDF archive checksum mismatch");
run("unzip", ["-o", archive, "-d", downloads]);
copyFileSync(
  resolve(downloads, "SumatraPDF-3.6.1-64.exe"),
  resolve(bin, "SumatraPDF.exe"),
);
const source = resolve(downloads, "SumatraPDF-3.6.1-source.tar.gz");
const sourceUrl =
  "https://codeload.github.com/sumatrapdfreader/sumatrapdf/tar.gz/16c59fde8b824ab54c56f23aef910a6fdd874ad0";
download(sourceUrl, source);
const license = resolve(downloads, "SumatraPDF-COPYING.txt");
download(
  "https://raw.githubusercontent.com/sumatrapdfreader/sumatrapdf/16c59fde8b824ab54c56f23aef910a6fdd874ad0/COPYING",
  license,
);
writeFileSync(
  resolve(downloads, "SumatraPDF-provenance.json"),
  JSON.stringify(
    {
      version: "3.6.1",
      url,
      sha256: actual,
      sourceUrl,
      sourceCommit: "16c59fde8b824ab54c56f23aef910a6fdd874ad0",
      verification:
        "Archive digest recorded from official HTTPS download; Windows runtime behavior not verified.",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Prepared official SumatraPDF 3.6.1 helper and source/license archive",
);
