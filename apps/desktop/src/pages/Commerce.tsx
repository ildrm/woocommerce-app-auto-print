import { useState } from "react";
import { Plus, RefreshCw, ExternalLink } from "lucide-react";
import { api } from "../api";
import { useWorkspace } from "../workspace";
import { id, type Store, type Order } from "../contracts";
import {
  Button,
  Empty,
  Field,
  Form,
  LocaleSelect,
  Modal,
  PageHeader,
  Preview,
  Toggle,
} from "../components/ui";
export function StoresPage() {
  const { t, data, act, busy } = useWorkspace();
  const [editing, setEditing] = useState<Store | null>(null);
  const [creating, setCreating] = useState(false);
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const open = (s?: Store) => {
    setKey("");
    setSecret("");
    setCreating(!s);
    setEditing(
      s ?? {
        id: id(),
        name: "",
        url: "",
        poll_seconds: 30,
        automation: false,
        locale: "en",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    );
  };
  const save = async () => {
    if (!editing) return;
    const ok = await act(() =>
      creating || key
        ? api("/stores/connect", "POST", {
            store: editing,
            credentials: { key, secret },
          })
        : api(`/configs/stores/${editing.id}`, "PUT", editing),
    );
    if (ok) {
      setEditing(null);
      setKey("");
      setSecret("");
    }
  };
  return (
    <>
      <PageHeader title={t("stores")} description={t("noStoresHelp")}>
        <Button secondary onClick={() => void act(() => api("/sync", "POST"))}>
          <RefreshCw size={17} />
          {t("sync")}
        </Button>
        <Button onClick={() => open()}>
          <Plus size={18} />
          {t("connectStore")}
        </Button>
      </PageHeader>
      {!data.stores.length ? (
        <Empty
          title={t("noStores")}
          help={t("noStoresHelp")}
          action={<Button onClick={() => open()}>{t("connectStore")}</Button>}
        />
      ) : (
        <div className="profile-list">
          {data.stores.map((s) => (
            <article className="profile-row" key={s.id}>
              <div>
                <h2>{s.name}</h2>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.url}
                  <ExternalLink size={13} />
                </a>
                <small>
                  {data.health[s.id]?.last_sync
                    ? new Date(data.health[s.id].last_sync!).toLocaleString()
                    : (data.health[s.id]?.message ?? t("loading"))}
                </small>
              </div>
              <span className="status">
                {t(s.automation ? "enabled" : "disabled")}
              </span>
              <Button secondary onClick={() => open(s)}>
                {t("edit")}
              </Button>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <Modal
          title={t(creating ? "connectStore" : "edit")}
          onClose={() => {
            setEditing(null);
            setKey("");
            setSecret("");
          }}
        >
          <Form onSubmit={() => void save()}>
            <Field label={t("name")}>
              <input
                required
                maxLength={120}
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </Field>
            <Field label={t("url")}>
              <input
                required
                type="url"
                dir="ltr"
                placeholder="https://your-store.example"
                value={editing.url}
                onChange={(e) =>
                  setEditing({ ...editing, url: e.target.value })
                }
              />
            </Field>
            <Field label={t("consumerKey")} hint={t("readOnlyHelp")}>
              <input
                required={creating}
                autoComplete="off"
                dir="ltr"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </Field>
            <Field label={t("consumerSecret")}>
              <input
                required={creating || Boolean(key)}
                autoComplete="new-password"
                dir="ltr"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
            </Field>
            <div className="form-grid">
              <Field label={t("pollInterval")}>
                <input
                  type="number"
                  min={10}
                  max={3600}
                  value={editing.poll_seconds}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      poll_seconds: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label={t("locale")}>
                <LocaleSelect
                  value={editing.locale}
                  onChange={(locale) => setEditing({ ...editing, locale })}
                />
              </Field>
            </div>
            <Field label={t("timezone")}>
              <input
                value={editing.timezone}
                onChange={(e) =>
                  setEditing({ ...editing, timezone: e.target.value })
                }
              />
            </Field>
            <Toggle
              label={t("automation")}
              checked={editing.automation}
              onChange={(automation) => setEditing({ ...editing, automation })}
              hint={t("allowUnpaidHelp")}
            />
            <div className="form-actions">
              <Button secondary onClick={() => setEditing(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {t(creating || key ? "connect" : "save")}
              </Button>
            </div>
          </Form>
        </Modal>
      )}
    </>
  );
}
export function OrdersPage() {
  const { t, data, act } = useWorkspace();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{
    store_id: string;
    order: Order;
  } | null>(null);
  const [printerId, setPrinterId] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const orders = data.orders.filter(({ order }) =>
    `${order.number} ${order.billing.first_name} ${order.billing.last_name} ${order.status}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const printer =
    data.printers.find((p) => p.id === printerId) ?? data.printers[0];
  const template = data.templates.find((t) => t.id === printer?.template_id);
  return (
    <>
      <PageHeader title={t("orders")}>
        <Button secondary onClick={() => void act(() => api("/sync", "POST"))}>
          {t("sync")}
        </Button>
      </PageHeader>
      <input
        className="search"
        aria-label={t("search")}
        placeholder={t("search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {!orders.length ? (
        <Empty title={t("noOrders")} help={t("noOrdersHelp")} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("order")}</th>
                <th>{t("customer")}</th>
                <th>{t("status")}</th>
                <th>{t("total")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((record) => (
                <tr key={`${record.store_id}-${record.order.id}`}>
                  <td>#{record.order.number}</td>
                  <td>
                    {record.order.billing.first_name}{" "}
                    {record.order.billing.last_name}
                  </td>
                  <td>{record.order.status}</td>
                  <td>
                    <bdi>
                      {record.order.total} {record.order.currency}
                    </bdi>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => setSelected(record)}
                    >
                      {t("preview")}
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
          title={`${t("order")} #${selected.order.number}`}
          onClose={() => setSelected(null)}
          wide
        >
          <div className="order-details">
            <div>
              <h3>{t("customer")}</h3>
              <p>
                {selected.order.billing.first_name}{" "}
                {selected.order.billing.last_name}
              </p>
              <p>
                {Object.values(selected.order.shipping)
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
            <div>
              <h3>{t("payment")}</h3>
              <p>{selected.order.payment_method_title}</p>
              <p>
                {selected.order.total} {selected.order.currency}
              </p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>{t("items")}</th>
                <th>{t("quantity")}</th>
                <th>{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {selected.order.line_items.map((item, i) => (
                <tr key={i}>
                  <td>{String(item.name)}</td>
                  <td>{String(item.quantity)}</td>
                  <td>{String(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>{selected.order.customer_note}</p>
          <Field label={t("printer")}>
            <select
              value={printer?.id ?? ""}
              onChange={(e) => setPrinterId(e.target.value)}
            >
              {data.printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-actions">
            <Button
              secondary
              disabled={!template}
              onClick={() => setShowPreview(true)}
            >
              {t("preview")}
            </Button>
            <Button
              disabled={!template || !printer}
              onClick={() =>
                void act(() =>
                  api("/test-print", "POST", {
                    template,
                    printer,
                    order: selected.order,
                    store_id: selected.store_id,
                  }),
                )
              }
            >
              {t("print")}
            </Button>
          </div>
        </Modal>
      )}
      {showPreview && selected && template && (
        <Preview
          template={template}
          printer={printer}
          order={selected.order}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
