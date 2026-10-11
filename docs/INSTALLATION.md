# Installation and startup

Build prerequisites and platform commands are in [BUILDING.md](BUILDING.md). The macOS arm64 .app/DMG, Debian arm64 .deb, Fedora arm64 .rpm, and Windows x64 NSIS installer are collected under `artifacts/`. These are unsigned review builds; macOS notarization and native Windows/Linux GUI and physical printer acceptance remain pending. See [build evidence](BUILD_REPORT.md).

Core runtime includes the independent agent, Typst and licensed Noto fonts. Tauri packages target-named sidecars with resources. Windows printing additionally needs a verified SumatraPDF helper and its applicable license/source distribution. There is no mandatory proprietary hosted runtime.

The desktop starts the agent, and closing the window hides it to the tray. Quit-window leaves the engine active. Diagnostics can start or explicitly stop the engine. Engine shutdown preserves queued work. The OS-user vault must be accessible to the configured session.

For autonomous user login startup, run the explicit registration script:

```sh
node scripts/service.mjs install /absolute/agent /absolute/data /absolute/typst /absolute/fonts
node scripts/service.mjs status
node scripts/service.mjs remove
```

It uses macOS LaunchAgent, Linux systemd user unit, or a limited Windows logon task. These registration paths are implemented but were not installed into the user's OS during verification. If policy prevents registration, launch the same agent command manually. Do not install a system-level Windows service expecting access to user printers.

Removing service registration does not delete customer data or vault credentials. Stop the engine first; retain a backup or deliberately remove data through your approved local process. Atomic installer/updater rollback and comprehensive uninstall tooling remain incomplete.
