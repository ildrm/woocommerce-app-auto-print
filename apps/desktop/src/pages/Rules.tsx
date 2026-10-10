import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, exportFile } from "../api";
import { useWorkspace } from "../workspace";
import { id, type Condition, type Rule } from "../contracts";
import {
  Button,
  Empty,
  Field,
  Form,
  Modal,
  PageHeader,
  Toggle,
} from "../components/ui";
export function ConditionEditor({
  condition,
  onChange,
  depth = 0,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
  depth?: number;
}) {
  const { t } = useWorkspace();
  if (condition.type === "compare")
    return (
      <div className="condition-row">
        <Field label={t("field")}>
          <input
            list="rule-fields"
            value={condition.field}
            onChange={(e) => onChange({ ...condition, field: e.target.value })}
          />
          <datalist id="rule-fields">
            {[
              "order.status",
              "order.total",
              "order.payment_method",
              "order.shipping_lines",
              "customer.full_name",
              "shipping.address",
              "item.sku",
              "item.product_id",
              "item.quantity",
            ].map((field) => (
              <option key={field}>{field}</option>
            ))}
          </datalist>
        </Field>
        <Field label={t("operator")}>
          <select
            value={condition.op}
            onChange={(e) => onChange({ ...condition, op: e.target.value })}
          >
            {["eq", "ne", "contains", "gt", "gte", "lt", "lte", "exists"].map(
              (op) => (
                <option key={op}>{op}</option>
              ),
            )}
          </select>
        </Field>
        <Field label={t("value")}>
          <input
            value={String(condition.value ?? "")}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
          />
        </Field>
      </div>
    );
  return (
    <fieldset className="condition-group">
      <legend>
        <select
          value={condition.type}
          onChange={(e) =>
            onChange({ ...condition, type: e.target.value as "all" | "any" })
          }
        >
          <option value="all">{t("all")}</option>
          <option value="any">{t("any")}</option>
        </select>
      </legend>
      {condition.conditions.map((c, index) => (
        <div className="condition-item" key={index}>
          <ConditionEditor
            condition={c}
            depth={depth + 1}
            onChange={(value) =>
              onChange({
                ...condition,
                conditions: condition.conditions.map((other, i) =>
                  i === index ? value : other,
                ),
              })
            }
          />
          <button
            type="button"
            className="icon-button"
            aria-label={t("remove")}
            onClick={() =>
              onChange({
                ...condition,
                conditions: condition.conditions.filter((_, i) => i !== index),
              })
            }
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <div className="row-actions">
        <Button
          secondary
          onClick={() =>
            onChange({
              ...condition,
              conditions: [
                ...condition.conditions,
                {
                  type: "compare",
                  field: "order.status",
                  op: "eq",
                  value: "processing",
                },
              ],
            })
          }
        >
          {t("addCondition")}
        </Button>
        {depth < 7 && (
          <Button
            secondary
            onClick={() =>
              onChange({
                ...condition,
                conditions: [
                  ...condition.conditions,
                  { type: "any", conditions: [] },
                ],
              })
            }
          >
            {t("addGroup")}
          </Button>
        )}
      </div>
    </fieldset>
  );
}
export function RulesPage() {
  const { t, data, act, busy } = useWorkspace();
  const [rule, setRule] = useState<Rule | null>(null);
  const [simulation, setSimulation] = useState<string | null>(null);
  const available =
    data.stores.length && data.printers.length && data.templates.length;
  const newRule = () =>
    setRule({
      id: id(),
      name: t("newRule"),
      store_id: data.stores[0]?.id ?? "",
      printer_id: data.printers[0]?.id ?? "",
      template_id: data.printers[0]?.template_id ?? data.templates[0]?.id ?? "",
      condition: {
        type: "all",
        conditions: [
          {
            type: "compare",
            field: "order.status",
            op: "eq",
            value: "processing",
          },
        ],
      },
      item_condition: null,
      enabled: true,
      allow_unpaid: false,
      priority: 0,
      stop: false,
      copies: 1,
    });
  return (
    <>
      <PageHeader title={t("rules")} description={t("noRulesHelp")}>
        <Button disabled={!available} onClick={newRule}>
          <Plus size={18} />
          {t("newRule")}
        </Button>
      </PageHeader>
      {!data.rules.length ? (
        <Empty title={t("noRules")} help={t("noRulesHelp")} />
      ) : (
        <div className="profile-list">
          {data.rules.map((r) => (
            <article className="profile-row" key={r.id}>
              <div>
                <h2>{r.name}</h2>
                <p>
                  {data.stores.find((s) => s.id === r.store_id)?.name} →{" "}
                  {data.printers.find((p) => p.id === r.printer_id)?.name}
                </p>
                <small>
                  {data.templates.find((t) => t.id === r.template_id)?.name} ·{" "}
                  {r.copies} ×
                </small>
              </div>
              <Toggle
                label={t("enabled")}
                checked={r.enabled}
                onChange={(enabled) =>
                  void act(() =>
                    api(`/configs/rules/${r.id}`, "PUT", { ...r, enabled }),
                  )
                }
              />
              <Button secondary onClick={() => setRule(r)}>
                {t("edit")}
              </Button>
              <button
                className="text-button"
                onClick={() =>
                  setRule({
                    ...r,
                    id: id(),
                    name: `${r.name} (${t("duplicate")})`,
                  })
                }
              >
                {t("duplicate")}
              </button>
              <button
                className="text-button"
                onClick={() =>
                  void act(() =>
                    exportFile(JSON.stringify(r, null, 2), `${r.name}.json`),
                  )
                }
              >
                {t("export")}
              </button>
              <button
                className="icon-button"
                aria-label={t("remove")}
                onClick={() =>
                  void act(() => api(`/configs/rules/${r.id}`, "DELETE"))
                }
              >
                <Trash2 size={17} />
              </button>
            </article>
          ))}
        </div>
      )}
      {rule && (
        <Modal title={t("rules")} onClose={() => setRule(null)} wide>
          <Form
            onSubmit={() =>
              void act(() =>
                api(`/configs/rules/${rule.id}`, "PUT", rule),
              ).then((ok) => {
                if (ok) setRule(null);
              })
            }
          >
            <Field label={t("name")}>
              <input
                required
                value={rule.name}
                onChange={(e) => setRule({ ...rule, name: e.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label={t("stores")}>
                <select
                  value={rule.store_id}
                  onChange={(e) =>
                    setRule({ ...rule, store_id: e.target.value })
                  }
                >
                  {data.stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("printer")}>
                <select
                  value={rule.printer_id}
                  onChange={(e) =>
                    setRule({ ...rule, printer_id: e.target.value })
                  }
                >
                  {data.printers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={t("template")}>
              <select
                value={rule.template_id}
                onChange={(e) =>
                  setRule({ ...rule, template_id: e.target.value })
                }
              >
                {data.templates
                  .filter((t) => t.published)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </Field>
            <h3>{t("conditions")}</h3>
            <ConditionEditor
              condition={rule.condition}
              onChange={(condition) => setRule({ ...rule, condition })}
            />
            <Toggle
              label={t("itemFilter")}
              checked={Boolean(rule.item_condition)}
              onChange={(filter) =>
                setRule({
                  ...rule,
                  item_condition: filter
                    ? {
                        type: "all",
                        conditions: [
                          {
                            type: "compare",
                            field: "item.sku",
                            op: "contains",
                            value: "",
                          },
                        ],
                      }
                    : null,
                })
              }
            />
            {rule.item_condition && (
              <ConditionEditor
                condition={rule.item_condition}
                onChange={(item_condition) =>
                  setRule({ ...rule, item_condition })
                }
              />
            )}
            <div className="form-grid">
              <Field label={t("copies")}>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={rule.copies}
                  onChange={(e) =>
                    setRule({ ...rule, copies: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label={t("priority")}>
                <input
                  type="number"
                  value={rule.priority}
                  onChange={(e) =>
                    setRule({ ...rule, priority: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <Toggle
              label={t("allowUnpaid")}
              checked={rule.allow_unpaid}
              onChange={(allow_unpaid) => setRule({ ...rule, allow_unpaid })}
              hint={t("allowUnpaidHelp")}
            />
            <Toggle
              label={t("stopProcessing")}
              checked={rule.stop}
              onChange={(stop) => setRule({ ...rule, stop })}
            />
            <Toggle
              label={t("enabled")}
              checked={rule.enabled}
              onChange={(enabled) => setRule({ ...rule, enabled })}
            />
            <div className="form-actions">
              <Button
                secondary
                disabled={!data.orders.length}
                onClick={() =>
                  void act(async () => {
                    const order = data.orders.find(
                      (o) => o.store_id === rule.store_id,
                    )?.order;
                    if (!order) throw new Error(t("noOrders"));
                    const result = await api("/rules/simulate", "POST", {
                      store_id: rule.store_id,
                      order,
                      rule,
                    });
                    setSimulation(JSON.stringify(result, null, 2));
                  })
                }
              >
                {t("simulate")}
              </Button>
              <Button type="submit" disabled={busy}>
                {t("save")}
              </Button>
            </div>
          </Form>
        </Modal>
      )}
      {simulation && (
        <Modal title={t("simulate")} onClose={() => setSimulation(null)} wide>
          <pre>{simulation}</pre>
        </Modal>
      )}
    </>
  );
}
