// Explicit user-run service registration. No system-wide service or printer permissions are requested.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, dirname } from "node:path";
const [action, binary, data, renderer, fonts] = process.argv.slice(2);
if (!["install", "remove", "status"].includes(action))
  throw new Error(
    "Usage: node scripts/service.mjs install|remove|status [agent data renderer fonts]",
  );
if (
  action === "install" &&
  ![binary, data, renderer, fonts].every((p) => p && existsSync(p))
)
  throw new Error(
    "Supply existing absolute agent, data, renderer and fonts paths",
  );
const xml = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const label = "org.autoprint.agent";
if (process.platform === "darwin") {
  const file = resolve(homedir(), "Library/LaunchAgents", `${label}.plist`);
  const domain = `gui/${process.getuid()}`;
  if (action === "install") {
    mkdirSync(dirname(file), { recursive: true });
    const args = [
      resolve(binary),
      "--data-dir",
      resolve(data),
      "--renderer",
      resolve(renderer),
      "--fonts",
      resolve(fonts),
    ];
    writeFileSync(
      file,
      `<?xml version="1.0"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array>${args.map((a) => `<string>${xml(a)}</string>`).join("")}</array><key>RunAtLoad</key><true/><key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict><key>WorkingDirectory</key><string>${xml(resolve(data))}</string></dict></plist>`,
      { mode: 0o600 },
    );
    execFileSync("launchctl", ["bootstrap", domain, file], {
      stdio: "inherit",
    });
  } else if (action === "remove") {
    execFileSync("launchctl", ["bootout", `${domain}/${label}`], {
      stdio: "inherit",
    });
    if (existsSync(file)) unlinkSync(file);
  } else
    execFileSync("launchctl", ["print", `${domain}/${label}`], {
      stdio: "inherit",
    });
} else if (process.platform === "linux") {
  const file = resolve(
    homedir(),
    ".config/systemd/user/autoprint-agent.service",
  );
  const quote = (s) =>
    '"' +
    resolve(s)
      .replaceAll("\\", "\\\\")
      .replaceAll('"', '\\"')
      .replaceAll("%", "%%") +
    '"';
  if (action === "install") {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
      file,
      `[Unit]\nDescription=AutoPrint user printing engine\nAfter=network-online.target\n[Service]\nExecStart=${quote(binary)} --data-dir ${quote(data)} --renderer ${quote(renderer)} --fonts ${quote(fonts)}\nRestart=on-failure\nRestartSec=10\nUMask=0077\n[Install]\nWantedBy=default.target\n`,
      { mode: 0o600 },
    );
    execFileSync("systemctl", ["--user", "daemon-reload"], {
      stdio: "inherit",
    });
    execFileSync(
      "systemctl",
      ["--user", "enable", "--now", "autoprint-agent"],
      { stdio: "inherit" },
    );
  } else if (action === "remove") {
    execFileSync(
      "systemctl",
      ["--user", "disable", "--now", "autoprint-agent"],
      { stdio: "inherit" },
    );
    if (existsSync(file)) unlinkSync(file);
    execFileSync("systemctl", ["--user", "daemon-reload"], {
      stdio: "inherit",
    });
  } else
    execFileSync("systemctl", ["--user", "status", "autoprint-agent"], {
      stdio: "inherit",
    });
} else if (process.platform === "win32") {
  const name = "WooCommerce AutoPrint Agent";
  if (action === "install") {
    const command = `"${resolve(binary)}" --data-dir "${resolve(data)}" --renderer "${resolve(renderer)}" --fonts "${resolve(fonts)}"`;
    execFileSync(
      "schtasks.exe",
      [
        "/Create",
        "/TN",
        name,
        "/SC",
        "ONLOGON",
        "/TR",
        command,
        "/RL",
        "LIMITED",
        "/F",
      ],
      { stdio: "inherit" },
    );
  } else
    execFileSync(
      "schtasks.exe",
      action === "remove"
        ? ["/Delete", "/TN", name, "/F"]
        : ["/Query", "/TN", name],
      { stdio: "inherit" },
    );
} else
  throw new Error(
    "User-service registration unsupported. Launch the agent manually.",
  );
