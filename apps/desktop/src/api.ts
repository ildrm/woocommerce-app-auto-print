import { invoke } from "@tauri-apps/api/core";
export const native = () =>
  Boolean(
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
  );
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  confirm = false,
): Promise<T> {
  if (native())
    return invoke<T>("agent_request", {
      path,
      method,
      body: body ?? null,
      confirm,
    });
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(confirm ? { "x-confirm-reprint": "yes" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Engine request failed");
  return result as T;
}
export async function artifactUrl(path: string): Promise<string> {
  if (native()) return invoke<string>("artifact_data", { path });
  const response = await fetch(`/api${path}`);
  if (!response.ok) throw new Error("Artifact unavailable");
  return URL.createObjectURL(await response.blob());
}
export async function exportFile(content: string, filename: string) {
  if (native()) {
    await invoke("export_file", { content, filename });
    return;
  }
  const url = URL.createObjectURL(
    new Blob([content], {
      type: filename.endsWith(".csv") ? "text/csv" : "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
