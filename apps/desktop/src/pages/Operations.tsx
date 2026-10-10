import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Pause, Play, Download, Activity, RefreshCw } from "lucide-react";
import { api, exportFile, native } from "../api";
import { useWorkspace } from "../workspace";
import { csvCell } from "../geometry";
import {
  languages,
  translationCoverage,
  type Locale,
  type Message,
} from "../i18n";
import {
  Button,
  Empty,
  Field,
  Modal,
  PageHeader,
  Preview,
  Status,
  Toggle,
} from "../components/ui";
import type { Job } from "../contracts";
export function QueuePage({ history = false }: { history?: boolean }) {
  const { t, data, act } = useWorkspace();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Job | null>(null);
  const [preview, setPreview] = useState<Job | null>(null);
  const [attempts, setAttempts] = useState<unknown[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const paused = data.settings.find((s) => s.id === "engine")?.paused === true;
  const jobs = data.jobs.filter(
    (j) =>
      (history
        ? [
            "submitted",
            "completed",
            "failed",
            "outcome_uncertain",
            "canceled",
          ].includes(j.state)
        : !["completed", "submitted", "canceled"].includes(j.state)) &&
      (!status || j.state === status) &&
      `${j.snapshot.order.number} ${j.snapshot.printer.name} ${j.snapshot.store_name} ${j.id}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title={t(history ? "history" : "queue")}
        description={t("submittedHelp")}
      >
        {!history && (
          <Button
            secondary
            onClick={() =>
              void act(() =>
                api("/configs/settings/engine", "PUT", { paused: !paused }),
              )
            }
          >
            {paused ? <Play size={17} /> : <Pause size={17} />}{" "}
            {t(paused ? "resume" : "pause")}
          </Button>
        )}
      </PageHeader>
      <div className="filter-bar">
        <input
          className="search"
          aria-label={t("search")}
          placeholder={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label={t("status")}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{t("allStatuses")}</option>
          {[
            "queued",
            "rendering",
            "ready",
            "submitting",
            "submitted",
            "completed",
            "retry_scheduled",
            "failed",
            "outcome_uncertain",
            "canceled",
          ].map((s) => (
            <option key={s} value={s}>
              {t(s as Message)}
            </option>
          ))}
        </select>
      </div>
      {!jobs.length ? (
        <Empty
          title={t(history ? "noHistory" : "noJobs")}
          help={t("noJobsHelp")}
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {(
                  [
                    "order",
                    "printer",
                    "template",
                    "paper",
                    "status",
                    "attempts",
                    "created",
                    "actions",
                  ] as Message[]
                ).map((k) => (
                  <th key={k}>{t(k)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>
                    <strong>#{j.snapshot.order.number}</strong>
                    <small>{j.snapshot.store_name}</small>
                  </td>
                  <td>{j.snapshot.printer.name}</td>
                  <td>{j.snapshot.template.name}</td>
                  <td>{j.snapshot.printer.paper.name}</td>
                  <td>
                    <Status state={j.state} />
                  </td>
                  <td>{j.attempts}</td>
                  <td>{new Date(j.created_at).toLocaleTimeString()}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => {
                        setSelected(j);
                        setConfirmed(false);
                        void api<{ attempts: unknown[] }>(
                          `/jobs/${j.id}/attempts`,
                        ).then((v) => setAttempts(v.attempts));
                      }}
                    >
                      {t("actions")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <Modal
          title={`${t("order")} #${selected.snapshot.order.number}`}
          onClose={() => setSelected(null)}
        >
          <Status state={selected.state} />
          <p>
            {selected.snapshot.printer.name} · {selected.snapshot.template.name}
          </p>
          {selected.error && <p className="alert">{selected.error}</p>}
          {selected.state === "outcome_uncertain" && (
            <p className="warning">{t("outcomeWarning")}</p>
          )}
          <div className="attempt-list">
            {attempts.map((a, i) => (
              <pre key={i}>{JSON.stringify(a, null, 2)}</pre>
            ))}
          </div>
          <Toggle
            label={t("reprintConfirm")}
            checked={confirmed}
            onChange={setConfirmed}
          />
          <div className="form-actions">
            <Button secondary onClick={() => setPreview(selected)}>
              {t("preview")}
            </Button>
            {["failed", "retry_scheduled"].includes(selected.state) && (
              <Button
                secondary
                onClick={() =>
                  void act(() =>
                    api(`/jobs/${selected.id}/retry`, "POST"),
                  ).then((ok) => {
                    if (ok) setSelected(null);
                  })
                }
              >
                {t("retry")}
              </Button>
            )}
            {["queued", "retry_scheduled"].includes(selected.state) && (
              <Button
                secondary
                onClick={() =>
                  void act(() =>
                    api(`/jobs/${selected.id}/cancel`, "POST"),
                  ).then((ok) => {
                    if (ok) setSelected(null);
                  })
                }
              >
                {t("cancel")}
              </Button>
            )}
            <Button
              disabled={!confirmed}
              onClick={() =>
                void act(() =>
                  api(`/jobs/${selected.id}/reprint`, "POST", undefined, true),
                ).then((ok) => {
                  if (ok) setSelected(null);
                })
              }
            >
              {t("reprint")}
            </Button>
          </div>
        </Modal>
      )}
      {preview && (
        <Preview
          template={preview.snapshot.template}
          printer={preview.snapshot.printer}
          order={preview.snapshot.order}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
export function ReportsPage() {
  const { t, data, act } = useWorkspace();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const jobs = data.jobs.filter(
    (j) =>
      (!from || j.created_at >= from) &&
      (!to || j.created_at <= `${to}T23:59:59.999Z`),
  );
  const exportCsv = () =>
    exportFile(
      [
        [
          "Job",
          "Order",
          "Store",
          "Printer",
          "Template",
          "State",
          "Attempts",
          "Created",
        ]
          .map(csvCell)
          .join(","),
        ...jobs.map((j) =>
          [
            j.id,
            j.snapshot.order.number,
            j.snapshot.store_name,
            j.snapshot.printer.name,
            j.snapshot.template.name,
            j.state,
            j.attempts,
            j.created_at,
          ]
            .map(csvCell)
            .join(","),
        ),
      ].join("\r\n"),
      "autoprint-report.csv",
    );
  return (
    <>
      <PageHeader title={t("reports")} description={t("reportsHelp")}>
        <Button secondary onClick={() => void act(exportCsv)}>
          <Download size={17} />
          {t("exportCsv")}
        </Button>
      </PageHeader>
      <div className="filter-bar">
        <Field label={t("dateFrom")}>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label={t("dateTo")}>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
      </div>
      <div className="metrics">
        {(["submitted", "failed", "outcome_uncertain"] as const).map(
          (state) => (
            <div className="metric" key={state}>
              <Activity />
              <div>
                <span>{t(state)}</span>
                <strong>{jobs.filter((j) => j.state === state).length}</strong>
              </div>
            </div>
          ),
        )}
      </div>
      <section className="panel">
        <h2>{t("printers")}</h2>
        <table>
          <thead>
            <tr>
              <th>{t("printer")}</th>
              <th>{t("total")}</th>
              <th>{t("failures")}</th>
              <th>{t("attempts")}</th>
            </tr>
          </thead>
          <tbody>
            {data.printers.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>
                  {jobs.filter((j) => j.snapshot.printer.id === p.id).length}
                </td>
                <td>
                  {
                    jobs.filter(
                      (j) =>
                        j.snapshot.printer.id === p.id && j.state === "failed",
                    ).length
                  }
                </td>
                <td>
                  {jobs
                    .filter((j) => j.snapshot.printer.id === p.id)
                    .reduce((sum, j) => sum + j.attempts, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
export function DiagnosticsPage() {
  const { t, act } = useWorkspace();
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const run = () => act(async () => setResult(await api("/diagnostics")));
  return (
    <>
      <PageHeader title={t("diagnostics")} description={t("diagnosticHelp")}>
        <Button onClick={() => void run()}>
          <RefreshCw size={17} />
          {t("runDiagnostics")}
        </Button>
      </PageHeader>
      <section className="panel diagnostics-panel">
        <div className="row-actions">
          <Button
            secondary
            disabled={!native()}
            onClick={() => void act(() => invoke("start_agent"))}
          >
            {t("startAgent")}
          </Button>
          <Button
            secondary
            onClick={() => void act(() => api("/shutdown", "POST"))}
          >
            {t("stopAgent")}
          </Button>
          <Button
            secondary
            onClick={() =>
              void act(async () => {
                const result = await api<{ path: string }>("/backup", "POST");
                setResult({ backup: result.path });
              })
            }
          >
            {t("backup")}
          </Button>
        </div>
        <p className="hint">{t("backupHelp")}</p>
        {result && (
          <>
            <dl className="diagnostic-results">
              {Object.entries(result).map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replaceAll("_", " ")}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
            <Button
              secondary
              onClick={() =>
                void act(() =>
                  exportFile(
                    JSON.stringify(result, null, 2),
                    "autoprint-diagnostics.json",
                  ),
                )
              }
            >
              {t("export")}
            </Button>
          </>
        )}
      </section>
    </>
  );
}
export function SettingsPage() {
  const { t, locale, setLocale, theme, setTheme, act, data } = useWorkspace();
  const [startup, setStartup] = useState(false);
  const coverage = translationCoverage(locale);
  return (
    <>
      <PageHeader title={t("settings")} />
      <section className="settings-section">
        <h2>{t("uiLanguage")}</h2>
        <Field label={t("uiLanguage")}>
          <select
            value={locale}
            onChange={(e) => {
              const next = e.target.value as Locale;
              setLocale(next);
              void act(() =>
                api("/configs/settings/ui", "PUT", { locale: next, theme }),
              );
            }}
          >
            {Object.entries(languages).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        {locale !== "en" && (
          <p className="warning">
            {t("translationNotice")} ({coverage.translated}/{coverage.total})
          </p>
        )}
        <h2>{t("theme")}</h2>
        <div className="segmented">
          {(["light", "dark", "system"] as const).map((option) => (
            <button
              className={theme === option ? "selected" : ""}
              key={option}
              onClick={() => {
                setTheme(option);
                void act(() =>
                  api("/configs/settings/ui", "PUT", { locale, theme: option }),
                );
              }}
            >
              {t(option)}
            </button>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <h2>{t("automation")}</h2>
        <p>{t("backgroundHelp")}</p>
        <Toggle
          label={t("startup")}
          checked={startup}
          onChange={(enabled) =>
            void act(async () => {
              if (!native()) throw new Error(t("notAvailable"));
              const { enable, disable } =
                await import("@tauri-apps/plugin-autostart");
              if (enabled) await enable();
              else await disable();
              setStartup(enabled);
            })
          }
          hint={t("startupHelp")}
        />
        <Toggle
          label={t("pause")}
          checked={
            data.settings.find((s) => s.id === "engine")?.paused === true
          }
          onChange={(paused) =>
            void act(() => api("/configs/settings/engine", "PUT", { paused }))
          }
        />
      </section>
    </>
  );
}
