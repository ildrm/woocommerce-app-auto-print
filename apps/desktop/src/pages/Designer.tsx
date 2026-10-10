import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Copy,
  Lock,
  Plus,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";
import { api, exportFile } from "../api";
import { useWorkspace } from "../workspace";
import {
  defaultPaper,
  id,
  newNode,
  type Template,
  type TemplateNode,
  type Condition,
} from "../contracts";
import { Button, Field, LocaleSelect, Preview, Toggle } from "../components/ui";
import type { Message } from "../i18n";
const components: [string, Message][] = [
  ["text", "text"],
  ["dynamic_field", "binding"],
  ["table", "table"],
  ["barcode", "barcode"],
  ["qr_code", "qrCode"],
  ["divider", "divider"],
  ["spacer", "spacer"],
  ["section", "section"],
  ["row", "row"],
  ["repeater", "repeater"],
  ["shape", "shape"],
  ["page_break", "pageBreak"],
  ["page_number", "pageNumber"],
  ["reprint_marker", "reprintMarker"],
];
const flatten = (nodes: TemplateNode[]): TemplateNode[] =>
  nodes.flatMap((n) => [n, ...flatten(n.children)]);
function updateNode(
  nodes: TemplateNode[],
  target: string,
  patch: Partial<TemplateNode>,
): TemplateNode[] {
  return nodes.map((n) =>
    n.id === target
      ? { ...n, ...patch }
      : { ...n, children: updateNode(n.children, target, patch) },
  );
}
function duplicateNode(node: TemplateNode): TemplateNode {
  return {
    ...structuredClone(node),
    id: id(),
    locked: false,
    children: node.children.map(duplicateNode),
  };
}
export function Designer({
  initial,
  onClose,
}: {
  initial: Template;
  onClose: () => void;
}) {
  const { t, data, act } = useWorkspace();
  const [template, setTemplate] = useState(initial);
  const [past, setPast] = useState<Template[]>([]);
  const [future, setFuture] = useState<Template[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [paperId, setPaperId] = useState("80 mm roll");
  const [preview, setPreview] = useState(false);
  const [saveState, setSaveState] = useState("");
  const clipboard = useRef<TemplateNode[]>([]);
  const drag = useRef<string | null>(null);
  const paper = data.papers.find((p) => p.id === paperId) ?? defaultPaper;
  const nodes = flatten(template.nodes);
  const selection = nodes.find((n) => n.id === selected[0]);
  const change = useCallback(
    (next: Template) => {
      setPast((p) => [...p, template].slice(-100));
      setFuture([]);
      setTemplate({ ...next, published: false });
    },
    [template],
  );
  const undo = useCallback(() => {
    if (past.length) {
      setFuture((f) => [template, ...f]);
      setTemplate(past[past.length - 1]);
      setPast((p) => p.slice(0, -1));
    }
  }, [past, template]);
  const redo = useCallback(() => {
    if (future.length) {
      setPast((p) => [...p, template]);
      setTemplate(future[0]);
      setFuture((f) => f.slice(1));
    }
  }, [future, template]);
  const remove = useCallback(() => {
    const strip = (ns: TemplateNode[]): TemplateNode[] =>
      ns
        .filter((n) => !selected.includes(n.id) || n.locked)
        .map((n) => ({ ...n, children: strip(n.children) }));
    change({ ...template, nodes: strip(template.nodes) });
    setSelected([]);
  }, [change, selected, template]);
  const paste = useCallback(() => {
    const copies = clipboard.current.map(duplicateNode);
    change({ ...template, nodes: [...template.nodes, ...copies] });
    setSelected(copies.map((n) => n.id));
  }, [change, template]);
  useEffect(() => {
    if (template === initial) return;
    const timer = setTimeout(() => {
      void api(`/configs/templates/${template.id}`, "PUT", {
        ...template,
        published: false,
      })
        .then(() => setSaveState(t("draft")))
        .catch((e) => setSaveState((e as Error).message));
    }, 1200);
    return () => clearTimeout(timer);
  }, [template, initial, t]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.key === "Delete") {
        e.preventDefault();
        remove();
      }
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
        if (e.key === "c") {
          e.preventDefault();
          clipboard.current = nodes.filter((n) => selected.includes(n.id));
        }
        if (e.key === "v") {
          e.preventDefault();
          paste();
        }
        if (e.key === "a") {
          e.preventDefault();
          setSelected(template.nodes.map((n) => n.id));
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [nodes, selected, template, remove, paste, undo, redo]);
  const add = (kind: string, parent?: string) => {
    const node = newNode(kind);
    if (kind === "repeater")
      node.children = [{ ...newNode("dynamic_field"), binding: "item.name" }];
    change({
      ...template,
      nodes: parent
        ? updateNode(template.nodes, parent, {
            children: [
              ...(nodes.find((n) => n.id === parent)?.children ?? []),
              node,
            ],
          })
        : [...template.nodes, node],
    });
    setSelected([node.id]);
  };
  const patch = (patch: Partial<TemplateNode>) => {
    if (selection && !selection.locked)
      change({
        ...template,
        nodes: updateNode(template.nodes, selection.id, patch),
      });
  };
  const reorder = (target: string, step: number) => {
    const recurse = (ns: TemplateNode[]): TemplateNode[] => {
      const list = ns.map((n) => ({ ...n, children: recurse(n.children) }));
      const i = list.findIndex((n) => n.id === target);
      if (i >= 0 && i + step >= 0 && i + step < list.length) {
        [list[i], list[i + step]] = [list[i + step], list[i]];
      }
      return list;
    };
    change({ ...template, nodes: recurse(template.nodes) });
  };
  const group = () => {
    const chosen = template.nodes.filter((n) => selected.includes(n.id));
    if (chosen.length < 2) return;
    const section = { ...newNode("section"), children: chosen };
    change({
      ...template,
      nodes: [
        ...template.nodes.filter((n) => !selected.includes(n.id)),
        section,
      ],
    });
    setSelected([section.id]);
  };
  const ungroup = () => {
    if (selection?.children.length) {
      change({
        ...template,
        nodes: template.nodes.flatMap((n) =>
          n.id === selection.id ? n.children : [n],
        ),
      });
      setSelected(selection.children.map((n) => n.id));
    }
  };
  const canvasNode = (node: TemplateNode): React.ReactNode => (
    <div
      key={node.id}
      tabIndex={0}
      role="button"
      aria-label={`${node.kind} ${node.text || node.binding}`}
      className={`canvas-element ${selected.includes(node.id) ? "selected" : ""} ${node.border ? "bordered" : ""}`}
      draggable={!node.locked}
      onDragStart={(e) => {
        e.stopPropagation();
        drag.current = node.id;
        e.dataTransfer.setData("node", node.id);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const kind = e.dataTransfer.getData("kind");
        if (kind && ["section", "row", "repeater"].includes(node.kind)) {
          add(kind, node.id);
          return;
        }
        const moving = e.dataTransfer.getData("node");
        if (moving !== node.id) {
          const from = template.nodes.findIndex((n) => n.id === moving);
          const to = template.nodes.findIndex((n) => n.id === node.id);
          if (from >= 0 && to >= 0) reorder(moving, to - from);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(
          e.shiftKey ? [...new Set([...selected, node.id])] : [node.id],
        );
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSelected([node.id]);
        }
      }}
      style={{
        fontSize: `${node.font_size}pt`,
        fontWeight: node.bold ? 700 : 400,
        textAlign:
          node.align === "start"
            ? "start"
            : node.align === "end"
              ? "end"
              : "center",
        width: node.width_um ? `${node.width_um / 1000}mm` : undefined,
        minHeight: node.height_um ? `${node.height_um / 1000}mm` : undefined,
      }}
    >
      {node.kind === "divider" ? (
        <hr />
      ) : node.kind === "spacer" ? (
        <div className="spacer-guide" />
      ) : node.kind === "table" ? (
        <table>
          <thead>
            <tr>
              <th>{t("items")}</th>
              <th>{t("quantity")}</th>
              <th>{t("total")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{"{{item.name}}"}</td>
              <td>{"{{item.quantity}}"}</td>
              <td>{"{{item.total}}"}</td>
            </tr>
          </tbody>
        </table>
      ) : node.kind === "barcode" ? (
        <div className="barcode-guide">
          ▌▌▏▎▌▏▌▎▏▌▌▏▎<small>{`{{${node.binding}}}`}</small>
        </div>
      ) : node.kind === "qr_code" ? (
        <div className="qr-guide">QR</div>
      ) : node.children.length ? (
        <div className={node.kind === "row" ? "canvas-row" : ""}>
          {node.children.map(canvasNode)}
        </div>
      ) : node.kind === "shape" ? (
        <div className="shape-guide" />
      ) : (
        <span>
          {node.binding ? `{{${node.binding}}}` : node.text || node.kind}
        </span>
      )}
      {node.locked && <Lock className="element-lock" size={12} />}
    </div>
  );
  return (
    <div className="designer">
      <header className="designer-toolbar">
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={t("back")}
        >
          <ArrowLeft size={20} />
        </button>
        <input
          className="template-name"
          aria-label={t("name")}
          value={template.name}
          onChange={(e) => change({ ...template, name: e.target.value })}
        />
        <span className="save-state" role="status">
          {saveState}
        </span>
        <button
          className="icon-button"
          disabled={!past.length}
          onClick={undo}
          aria-label={t("undo")}
        >
          <Undo2 size={19} />
        </button>
        <button
          className="icon-button"
          disabled={!future.length}
          onClick={redo}
          aria-label={t("redo")}
        >
          <Redo2 size={19} />
        </button>
        <Button secondary onClick={() => setPreview(true)}>
          {t("preview")}
        </Button>
        <Button
          secondary
          onClick={() =>
            void act(() =>
              exportFile(
                JSON.stringify(template, null, 2),
                `${template.name}.autoprint-template`,
              ),
            )
          }
        >
          {t("export")}
        </Button>
        <Button
          onClick={() =>
            void act(() =>
              api(`/configs/templates/${template.id}`, "PUT", {
                ...template,
                published: true,
              }),
            ).then((ok) => {
              if (ok) {
                setSaveState(t("published"));
                onClose();
              }
            })
          }
        >
          {t("publish")}
        </Button>
      </header>
      <div className="designer-layout">
        <aside className="designer-library">
          <h3>{t("components")}</h3>
          <div className="component-buttons">
            {components.map(([kind, label]) => (
              <button
                key={kind}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("kind", kind)}
                onClick={() => add(kind)}
              >
                <Plus size={14} />
                {t(label)}
              </button>
            ))}
          </div>
          <h3>{t("layers")}</h3>
          <div className="layer-list">
            {nodes.map((n) => (
              <button
                key={n.id}
                className={selected.includes(n.id) ? "selected" : ""}
                onClick={(e) =>
                  setSelected(
                    e.shiftKey ? [...new Set([...selected, n.id])] : [n.id],
                  )
                }
              >
                <span>{n.text || n.binding || n.kind}</span>
                {n.locked && <Lock size={12} />}
              </button>
            ))}
          </div>
          <div className="row-actions">
            <Button secondary disabled={selected.length < 2} onClick={group}>
              {t("group")}
            </Button>
            <Button
              secondary
              disabled={!selection?.children.length}
              onClick={ungroup}
            >
              {t("ungroup")}
            </Button>
          </div>
        </aside>
        <section className="designer-stage">
          <div className="canvas-toolbar">
            <select
              value={paperId}
              aria-label={t("paper")}
              onChange={(e) => setPaperId(e.target.value)}
            >
              {data.papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <label>
              {t("zoom")}
              <input
                type="range"
                min={0.35}
                max={1.5}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
              {Math.round(zoom * 100)}%
            </label>
          </div>
          <div className="canvas-scroll">
            <div className="canvas-ruler">
              0 ── 10 ── 20 ── 30 ── 40 ── 50 ── 60 ── 70 mm
            </div>
            <div
              className="document-canvas"
              dir={template.direction}
              style={{
                width: `${paper.width_um / 1000}mm`,
                minHeight: `${(paper.height_um ?? 180000) / 1000}mm`,
                padding: paper.margins_um.map((n) => `${n / 1000}mm`).join(" "),
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const kind = e.dataTransfer.getData("kind");
                if (kind) add(kind);
              }}
            >
              {template.nodes.length ? (
                template.nodes.map(canvasNode)
              ) : (
                <p>{t("addElement")}</p>
              )}
            </div>
          </div>
          <div className="canvas-footer">
            {t("samplePreview")} · {paper.width_um / 1000} mm · v
            {template.version}
          </div>
        </section>
        <aside className="designer-properties">
          <h3>{t("properties")}</h3>
          <Field label={t("locale")}>
            <LocaleSelect
              value={template.locale}
              onChange={(locale) =>
                change({
                  ...template,
                  locale,
                  direction: ["fa", "ar"].includes(locale) ? "rtl" : "ltr",
                })
              }
            />
          </Field>
          {selection ? (
            <>
              <div className="row-actions">
                <button
                  className="icon-button"
                  aria-label={t("moveUp")}
                  onClick={() => reorder(selection.id, -1)}
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label={t("moveDown")}
                  onClick={() => reorder(selection.id, 1)}
                >
                  <ChevronDown size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label={t("duplicate")}
                  onClick={() => {
                    clipboard.current = [selection];
                    paste();
                  }}
                >
                  <Copy size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label={t("deleteElement")}
                  onClick={remove}
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <Toggle
                label={t("locked")}
                checked={selection.locked}
                onChange={(locked) =>
                  change({
                    ...template,
                    nodes: updateNode(template.nodes, selection.id, { locked }),
                  })
                }
              />
              <fieldset disabled={selection.locked}>
                <Field label={t("text")}>
                  <textarea
                    value={selection.text}
                    onChange={(e) => patch({ text: e.target.value })}
                  />
                </Field>
                <Field label={t("binding")}>
                  <input
                    list="bindings"
                    value={selection.binding}
                    onChange={(e) => patch({ binding: e.target.value })}
                  />
                  <datalist id="bindings">
                    {[
                      "store.name",
                      "order.number",
                      "order.status",
                      "order.date_created_gmt",
                      "customer.full_name",
                      "customer.phone",
                      "shipping.address",
                      "items",
                      "item.name",
                      "item.sku",
                      "item.quantity",
                      "totals.grand_total",
                      "totals.discount",
                      "totals.shipping",
                      "order.customer_note",
                    ].map((field) => (
                      <option key={field}>{field}</option>
                    ))}
                  </datalist>
                </Field>
                <Field label={t("fontSize")}>
                  <input
                    type="number"
                    min={4}
                    max={96}
                    value={selection.font_size}
                    onChange={(e) =>
                      patch({ font_size: Number(e.target.value) })
                    }
                  />
                </Field>
                <Toggle
                  label={t("bold")}
                  checked={selection.bold}
                  onChange={(bold) => patch({ bold })}
                />
                <Toggle
                  label={t("border")}
                  checked={selection.border}
                  onChange={(border) => patch({ border })}
                />
                <Field label={t("align")}>
                  <select
                    value={selection.align}
                    onChange={(e) => patch({ align: e.target.value })}
                  >
                    {(["start", "center", "end"] as const).map((a) => (
                      <option key={a} value={a}>
                        {t(a)}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="form-grid">
                  {(["width_um", "height_um"] as const).map((key, i) => (
                    <Field
                      key={key}
                      label={`${t(i === 0 ? "width" : "height")} (mm)`}
                    >
                      <input
                        type="number"
                        step="1"
                        min={0}
                        value={
                          selection[key] === null ? "" : selection[key]! / 1000
                        }
                        onChange={(e) =>
                          patch({
                            [key]: e.target.value
                              ? Math.round(Number(e.target.value)) * 1000
                              : null,
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
                <Toggle
                  label={t("condition")}
                  checked={Boolean(selection.condition)}
                  onChange={(enabled) =>
                    patch({
                      condition: enabled
                        ? {
                            type: "compare",
                            field: "order.status",
                            op: "eq",
                            value: "processing",
                          }
                        : null,
                    })
                  }
                />
                {selection.condition?.type === "compare" && (
                  <>
                    <Field label={t("field")}>
                      <input
                        value={selection.condition.field}
                        onChange={(e) =>
                          patch({
                            condition: {
                              ...selection.condition,
                              field: e.target.value,
                            } as Condition,
                          })
                        }
                      />
                    </Field>
                    <Field label={t("value")}>
                      <input
                        value={String(selection.condition.value)}
                        onChange={(e) =>
                          patch({
                            condition: {
                              ...selection.condition,
                              value: e.target.value,
                            } as Condition,
                          })
                        }
                      />
                    </Field>
                  </>
                )}
              </fieldset>
            </>
          ) : (
            <p className="hint">{t("noSelection")}</p>
          )}
        </aside>
      </div>
      {preview && (
        <Preview
          template={template}
          printer={{
            id: "preview",
            name: "Preview",
            transport: { type: "pdf" },
            paper,
            template_id: template.id,
            enabled: true,
            locale: template.locale,
            copies: 1,
          }}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}
