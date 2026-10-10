import { useState, type ComponentType } from "react";
import {
  Printer,
  House,
  Store,
  FileText,
  Layers,
  Route,
  List,
  History,
  ChartNoAxesColumn,
  Activity,
  Settings,
  Plus,
  ArrowRight,
  Check,
  Menu,
  RefreshCw,
} from "lucide-react";
import { useWorkspace } from "./workspace";
import { PageHeader, Button, Empty } from "./components/ui";
import { StoresPage, OrdersPage } from "./pages/Commerce";
import { PrintersPage, PaperPage } from "./pages/Printers";
import { TemplatesPage } from "./pages/Templates";
import { RulesPage } from "./pages/Rules";
import {
  QueuePage,
  ReportsPage,
  DiagnosticsPage,
  SettingsPage,
} from "./pages/Operations";
import type { Message } from "./i18n";
export const navigation: {
  key: Message;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}[] = [
  { key: "dashboard", icon: House },
  { key: "stores", icon: Store },
  { key: "orders", icon: FileText },
  { key: "printers", icon: Printer },
  { key: "papers", icon: FileText },
  { key: "templates", icon: Layers },
  { key: "rules", icon: Route },
  { key: "queue", icon: List },
  { key: "history", icon: History },
  { key: "reports", icon: ChartNoAxesColumn },
  { key: "diagnostics", icon: Activity },
  { key: "settings", icon: Settings },
];
export default function App() {
  const { t, page, navigate, data, error, busy, notice, refresh } =
    useWorkspace();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`app ${expanded ? "nav-expanded" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <Printer size={38} strokeWidth={1.7} />
          <div>
            <strong>AutoPrint</strong>
            <small>for WooCommerce</small>
          </div>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map(({ key, icon: Icon }) => (
            <button
              key={key}
              className={page === key ? "nav-item active" : "nav-item"}
              onClick={() => {
                navigate(key);
                setExpanded(false);
              }}
              aria-current={page === key ? "page" : undefined}
            >
              <Icon size={21} strokeWidth={1.65} />
              <span>{t(key)}</span>
            </button>
          ))}
        </nav>
        <div className="agent-indicator">
          <span
            className={
              data.agent.status === "online" ? "online-dot" : "offline-dot"
            }
          />
          <span>
            {t(data.agent.status === "online" ? "agentOnline" : "agentOffline")}
          </span>
          <small>v{data.agent.version}</small>
        </div>
      </aside>
      <main>
        <div className="mobile-bar">
          <button
            aria-label="Navigation"
            className="icon-button"
            onClick={() => setExpanded(!expanded)}
          >
            <Menu />
          </button>
          <strong>AutoPrint</strong>
        </div>
        {error && (
          <div className="alert" role="alert">
            {error}
            <button onClick={() => void refresh()} className="text-button">
              <RefreshCw size={16} />
              {t("retryConnection")}
            </button>
          </div>
        )}
        {page === "dashboard" ? (
          <Dashboard />
        ) : page === "stores" ? (
          <StoresPage />
        ) : page === "orders" ? (
          <OrdersPage />
        ) : page === "printers" ? (
          <PrintersPage />
        ) : page === "papers" ? (
          <PaperPage />
        ) : page === "templates" ? (
          <TemplatesPage />
        ) : page === "rules" ? (
          <RulesPage />
        ) : page === "queue" ? (
          <QueuePage />
        ) : page === "history" ? (
          <QueuePage history />
        ) : page === "reports" ? (
          <ReportsPage />
        ) : page === "diagnostics" ? (
          <DiagnosticsPage />
        ) : (
          <SettingsPage />
        )}
      </main>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
      {busy && (
        <div className="busy-bar" role="status" aria-label={t("working")} />
      )}
    </div>
  );
}
function Dashboard() {
  const { t, data, navigate } = useWorkspace();
  const queue = data.jobs.filter((j) =>
    ["queued", "rendering", "ready", "retry_scheduled", "submitting"].includes(
      j.state,
    ),
  );
  const today = new Date().toDateString();
  const sent = data.jobs.filter(
    (j) =>
      ["submitted", "completed"].includes(j.state) &&
      new Date(j.updated_at).toDateString() === today,
  ).length;
  const checklist = [
    {
      title: "connectStore",
      help: "connectHelp",
      target: "stores",
      done: data.stores.length > 0,
      icon: Store,
    },
    {
      title: "addPrinter",
      help: "printerHelp",
      target: "printers",
      done: data.printers.length > 0,
      icon: Printer,
    },
    {
      title: "choosePaper",
      help: "paperHelp",
      target: "papers",
      done: data.printers.length > 0,
      icon: FileText,
    },
    {
      title: "assignTemplate",
      help: "templateHelp",
      target: "templates",
      done: data.printers.some((p) => Boolean(p.template_id)),
      icon: FileText,
    },
    {
      title: "enableAutomation",
      help: "automationHelp",
      target: "rules",
      done:
        data.stores.some((s) => s.automation) &&
        data.rules.some((r) => r.enabled),
      icon: Route,
    },
  ] as const;
  return (
    <>
      <PageHeader title={t("dashboard")} description={t("workspace")}>
        <Button onClick={() => navigate("stores")}>
          <Plus size={18} />
          {t("connectStore")}
        </Button>
      </PageHeader>
      <div className="metrics">
        {[
          [Store, "connectedStores", data.stores.length],
          [
            Printer,
            "availablePrinters",
            data.printers.filter((p) => p.enabled).length,
          ],
          [FileText, "queuedJobs", queue.length],
          [ChartNoAxesColumn, "submittedToday", sent],
        ].map(([Icon, key, count]) => {
          const I = Icon as typeof Printer;
          return (
            <div className="metric" key={String(key)}>
              <I size={32} strokeWidth={1.5} />
              <div>
                <span>{t(key as Message)}</span>
                <strong>{String(count)}</strong>
              </div>
            </div>
          );
        })}
      </div>
      <section className="setup-band">
        <Printer size={48} strokeWidth={1.5} />
        <div>
          <h2>{t("firstPrint")}</h2>
          <p>{t("firstPrintHelp")}</p>
          <div className="setup-steps">
            {(["connectWoo", "choosePrinter", "printTest"] as Message[]).map(
              (key, i) => (
                <button
                  key={key}
                  onClick={() => navigate(i === 0 ? "stores" : "printers")}
                >
                  <span className="step-number">{i + 1}</span>
                  <div>
                    <strong>{t(key)}</strong>
                    <small>
                      {t(
                        (
                          [
                            "linkStore",
                            "setupPrinter",
                            "confirmPrint",
                          ] as Message[]
                        )[i],
                      )}
                    </small>
                  </div>
                  {i < 2 && <ArrowRight size={19} />}
                </button>
              ),
            )}
          </div>
        </div>
      </section>
      <div className="dashboard-columns">
        <section className="panel queue-panel">
          <div className="panel-heading">
            <h2>{t("queue")}</h2>
            <button className="text-button" onClick={() => navigate("queue")}>
              {t("viewQueue")}
              <ArrowRight size={18} />
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {(
                    ["order", "printer", "document", "status"] as Message[]
                  ).map((k) => (
                    <th key={k}>{t(k)}</th>
                  ))}
                </tr>
              </thead>
              {queue.length > 0 && (
                <tbody>
                  {queue.slice(0, 5).map((j) => (
                    <tr key={j.id}>
                      <td>#{j.snapshot.order.number}</td>
                      <td>{j.snapshot.printer.name}</td>
                      <td>{j.snapshot.template.name}</td>
                      <td>{t(j.state as Message)}</td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
          {!queue.length && (
            <Empty title={t("noJobs")} help={t("noJobsHelp")} />
          )}
        </section>
        <section className="panel checklist">
          <h2>{t("checklist")}</h2>
          {checklist.map(({ title, help, target, done, icon: Icon }) => (
            <button key={title} onClick={() => navigate(target)}>
              <span className={done ? "check checked" : "check"}>
                {done && <Check size={15} />}
              </span>
              <Icon size={24} strokeWidth={1.5} />
              <div>
                <strong>{t(title)}</strong>
                <small>{t(help)}</small>
              </div>
            </button>
          ))}
        </section>
      </div>
      <section className="activity-strip">
        <History size={21} />
        <strong>{t("recentActivity")}</strong>
        <span />
        <p>
          {data.jobs[0]
            ? `#${data.jobs[0].snapshot.order.number} · ${t(data.jobs[0].state as Message)}`
            : t("agentRunning")}
        </p>
      </section>
    </>
  );
}
