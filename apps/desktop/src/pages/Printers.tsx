import { useState } from "react";
import { Plus, Printer as PrinterIcon, Search, Copy } from "lucide-react";
import { api } from "../api";
import { useWorkspace } from "../workspace";
import {
  defaultPaper,
  id,
  type Paper,
  type Printer,
  type Transport,
} from "../contracts";
import { physicalUm } from "../geometry";
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
export function PrintersPage() {
  const { t, data, act, busy } = useWorkspace();
  const [editing, setEditing] = useState<Printer | null>(null);
  const [found, setFound] = useState<
    { id: string; name: string; status: string }[] | null
  >(null);
  const [preview, setPreview] = useState<Printer | null>(null);
  const open = (printer?: Printer) =>
    setEditing(
      printer ?? {
        id: id(),
        name: "",
        transport: { type: "pdf" },
        paper: defaultPaper,
        template_id:
          data.templates.find((t) => t.id === "builtin-2")?.id ??
          data.templates[0]?.id ??
          "",
        enabled: true,
        locale: "en",
        copies: 1,
      },
    );
  const changeType = (type: Transport["type"]) => {
    if (editing)
      setEditing({
        ...editing,
        transport:
          type === "pdf"
            ? { type }
            : type === "os"
              ? { type, queue: "" }
              : type === "ipp"
                ? { type, url: "ipps://" }
                : { type, host: "", port: 9100, cut: false },
      });
  };
  const template = data.templates.find(
    (t) => t.id === (preview ?? editing)?.template_id,
  );
  return (
    <>
      <PageHeader title={t("printers")} description={t("noPrintersHelp")}>
        <Button
          secondary
          onClick={() =>
            void act(async () =>
              setFound(
                (
                  await api<{
                    printers: { id: string; name: string; status: string }[];
                  }>("/discovery")
                ).printers,
              ),
            )
          }
        >
          <Search size={17} />
          {t("discover")}
        </Button>
        <Button onClick={() => open()}>
          <Plus size={18} />
          {t("addPrinter")}
        </Button>
      </PageHeader>
      {!data.printers.length ? (
        <Empty
          title={t("noPrinters")}
          help={t("noPrintersHelp")}
          action={<Button onClick={() => open()}>{t("addPrinter")}</Button>}
        />
      ) : (
        <div className="printer-grid">
          {data.printers.map((p) => (
            <article className="printer-card" key={p.id}>
              <div className="printer-card-top">
                <PrinterIcon size={36} strokeWidth={1.4} />
                <span className="status">
                  {t(p.enabled ? "enabled" : "disabled")}
                </span>
              </div>
              <h2>{p.name}</h2>
              <p>
                {p.transport.type === "pdf"
                  ? t("pdfOutput")
                  : p.transport.type === "os"
                    ? p.transport.queue
                    : p.transport.type === "ipp"
                      ? p.transport.url
                      : `${p.transport.host}:${p.transport.port}`}
              </p>
              <dl>
                <dt>{t("paper")}</dt>
                <dd>{p.paper.name}</dd>
                <dt>{t("template")}</dt>
                <dd>
                  {data.templates.find((t) => t.id === p.template_id)?.name}
                </dd>
              </dl>
              <div className="row-actions">
                <Button secondary onClick={() => open(p)}>
                  {t("edit")}
                </Button>
                <button
                  className="icon-button"
                  aria-label={t("duplicate")}
                  onClick={() =>
                    open({
                      ...p,
                      id: id(),
                      name: `${p.name} ${t("duplicate")}`,
                    })
                  }
                >
                  <Copy size={17} />
                </button>
                <button className="text-button" onClick={() => setPreview(p)}>
                  {t("preview")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {found && (
        <Modal title={t("discover")} onClose={() => setFound(null)}>
          {found.length ? (
            found.map((p) => (
              <button
                className="discovered-printer"
                key={p.id}
                onClick={() => {
                  open({
                    id: id(),
                    name: p.name,
                    transport: { type: "os", queue: p.id },
                    paper: {
                      ...defaultPaper,
                      id: "A4",
                      name: "A4",
                      width_um: 210000,
                      height_um: 297000,
                      margins_um: [10000, 10000, 10000, 10000],
                      dpi: 300,
                    },
                    template_id: "builtin-4",
                    locale: "en",
                    copies: 1,
                    enabled: true,
                  });
                  setFound(null);
                }}
              >
                <PrinterIcon size={24} />
                <span>
                  {p.name}
                  <small>{p.status}</small>
                </span>
                <Plus size={18} />
              </button>
            ))
          ) : (
            <Empty title={t("empty")} help={t("noPrintersHelp")} />
          )}
        </Modal>
      )}
      {editing && (
        <Modal title={t("printer")} onClose={() => setEditing(null)}>
          <Form
            onSubmit={() =>
              void act(() =>
                api(`/configs/printers/${editing.id}`, "PUT", editing),
              ).then((ok) => {
                if (ok) setEditing(null);
              })
            }
          >
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
            <Field label={t("connection")}>
              <select
                value={editing.transport.type}
                onChange={(e) =>
                  changeType(e.target.value as Transport["type"])
                }
              >
                <option value="pdf">{t("pdfOutput")}</option>
                <option value="os">{t("osQueue")}</option>
                <option value="escpos">{t("thermal")}</option>
                <option value="ipp">{t("ipp")}</option>
              </select>
            </Field>
            {editing.transport.type === "os" && (
              <Field label={t("queueName")}>
                <input
                  required
                  value={editing.transport.queue}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      transport: { type: "os", queue: e.target.value },
                    })
                  }
                />
              </Field>
            )}
            {editing.transport.type === "ipp" && (
              <Field label={t("endpoint")} hint={t("capabilities")}>
                <input
                  required
                  dir="ltr"
                  value={editing.transport.url}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      transport: { type: "ipp", url: e.target.value },
                    })
                  }
                />
              </Field>
            )}
            {editing.transport.type === "escpos" && (
              <>
                <div className="form-grid">
                  <Field label={t("host")}>
                    <input
                      required
                      value={editing.transport.host}
                      onChange={(e) => {
                        if (editing.transport.type === "escpos")
                          setEditing({
                            ...editing,
                            transport: {
                              ...editing.transport,
                              host: e.target.value,
                            },
                          });
                      }}
                    />
                  </Field>
                  <Field label={t("port")}>
                    <input
                      type="number"
                      min={1}
                      max={65535}
                      value={editing.transport.port}
                      onChange={(e) => {
                        if (editing.transport.type === "escpos")
                          setEditing({
                            ...editing,
                            transport: {
                              ...editing.transport,
                              port: Number(e.target.value),
                            },
                          });
                      }}
                    />
                  </Field>
                </div>
                <Toggle
                  label={t("cut")}
                  checked={editing.transport.cut}
                  onChange={(cut) => {
                    if (editing.transport.type === "escpos")
                      setEditing({
                        ...editing,
                        transport: { ...editing.transport, cut },
                      });
                  }}
                  hint={t("capabilities")}
                />
              </>
            )}
            <Field label={t("paper")}>
              <select
                value={editing.paper.id}
                onChange={(e) => {
                  const paper = data.papers.find(
                    (p) => p.id === e.target.value,
                  );
                  if (paper) setEditing({ ...editing, paper });
                }}
              >
                {data.papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("template")}>
              <select
                value={editing.template_id}
                onChange={(e) =>
                  setEditing({ ...editing, template_id: e.target.value })
                }
              >
                {data.templates
                  .filter((t) => t.published && !t.archived)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · v{t.version}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="form-grid">
              <Field label={t("copies")}>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editing.copies}
                  onChange={(e) =>
                    setEditing({ ...editing, copies: Number(e.target.value) })
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
            <Toggle
              label={t("enabled")}
              checked={editing.enabled}
              onChange={(enabled) => setEditing({ ...editing, enabled })}
            />
            <p className="hint">{t("capabilities")}</p>
            <div className="form-actions">
              <Button
                secondary
                onClick={() => setPreview(editing)}
                disabled={!template}
              >
                {t("preview")}
              </Button>
              <Button
                secondary
                disabled={!template}
                onClick={() =>
                  void act(() =>
                    api("/test-print", "POST", { printer: editing, template }),
                  )
                }
              >
                {t("printTest")}
              </Button>
              <Button type="submit" disabled={busy}>
                {t("save")}
              </Button>
            </div>
          </Form>
        </Modal>
      )}
      {preview && template && (
        <Preview
          printer={preview}
          template={template}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
export function PaperPage() {
  const { t, data, act, busy } = useWorkspace();
  const [query, setQuery] = useState("");
  const [paper, setPaper] = useState<Paper | null>(null);
  const [unit, setUnit] = useState("mm");
  const [validation, setValidation] = useState("");
  const factor = unit === "in" ? 25400 : unit === "cm" ? 10000 : 1000;
  const dimension = (value: string, update: (n: number) => void) => {
    try {
      update(physicalUm(value, unit));
      setValidation("");
    } catch (e) {
      setValidation((e as Error).message);
    }
  };
  return (
    <>
      <PageHeader title={t("papers")} description={t("paperHelp2")}>
        <Button
          onClick={() =>
            setPaper({ ...defaultPaper, id: id(), name: t("newPaper") })
          }
        >
          <Plus size={18} />
          {t("newPaper")}
        </Button>
      </PageHeader>
      <input
        className="search"
        aria-label={t("search")}
        placeholder={t("search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="paper-catalog">
        {data.papers
          .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
          .map((p) => (
            <button
              key={p.id}
              className="paper-preset"
              onClick={() => setPaper(p)}
            >
              <div
                className={`paper-icon ${p.height_um === null ? "roll" : ""}`}
                style={{
                  aspectRatio: `${p.width_um}/${p.height_um ?? p.width_um * 1.4}`,
                }}
              />
              <strong>{p.name}</strong>
              <small>
                {p.width_um / 1000} ×{" "}
                {p.height_um === null ? "∞" : p.height_um / 1000} mm
              </small>
            </button>
          ))}
      </div>
      {paper && (
        <Modal title={t("papers")} onClose={() => setPaper(null)} wide>
          <div className="paper-editor">
            <Form
              onSubmit={() =>
                void act(() =>
                  api(`/configs/papers/${paper.id}`, "PUT", paper),
                ).then((ok) => {
                  if (ok) setPaper(null);
                })
              }
            >
              <Field label={t("name")}>
                <input
                  required
                  value={paper.name}
                  onChange={(e) => setPaper({ ...paper, name: e.target.value })}
                />
              </Field>
              <Field label={t("unit")}>
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                </select>
              </Field>
              <div className="form-grid">
                <Field label={t("width")}>
                  <input
                    type="number"
                    step="any"
                    value={paper.width_um / factor}
                    onChange={(e) =>
                      dimension(e.target.value, (width_um) =>
                        setPaper({ ...paper, width_um }),
                      )
                    }
                  />
                </Field>
                <Field label={t("height")}>
                  <input
                    type="number"
                    step="any"
                    disabled={paper.height_um === null}
                    value={
                      paper.height_um === null ? "" : paper.height_um / factor
                    }
                    onChange={(e) =>
                      dimension(e.target.value, (height_um) =>
                        setPaper({ ...paper, height_um }),
                      )
                    }
                  />
                </Field>
              </div>
              <Toggle
                label={t("continuous")}
                checked={paper.height_um === null}
                onChange={(continuous) =>
                  setPaper({
                    ...paper,
                    height_um: continuous ? null : 150000,
                    landscape: false,
                  })
                }
              />
              <div className="form-grid">
                <Field label={t("orientation")}>
                  <select
                    disabled={paper.height_um === null}
                    value={paper.landscape ? "landscape" : "portrait"}
                    onChange={(e) =>
                      setPaper({
                        ...paper,
                        landscape: e.target.value === "landscape",
                      })
                    }
                  >
                    <option value="portrait">{t("portrait")}</option>
                    <option value="landscape">{t("landscape")}</option>
                  </select>
                </Field>
                <Field label={t("dpi")}>
                  <input
                    type="number"
                    min={72}
                    max={1200}
                    value={paper.dpi}
                    onChange={(e) =>
                      setPaper({ ...paper, dpi: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
              <h3>{t("margins")}</h3>
              <div className="form-grid">
                {(["top", "right", "bottom", "left"] as const).map(
                  (side, index) => (
                    <Field key={side} label={t(side)}>
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={paper.margins_um[index] / factor}
                        onChange={(e) =>
                          dimension(e.target.value, (n) => {
                            const margins = [
                              ...paper.margins_um,
                            ] as Paper["margins_um"];
                            margins[index] = n;
                            setPaper({ ...paper, margins_um: margins });
                          })
                        }
                      />
                    </Field>
                  ),
                )}
              </div>
              <h3>{t("calibration")}</h3>
              <div className="form-grid">
                {["X", "Y"].map((axis, index) => (
                  <Field key={axis} label={`${axis} (mm)`}>
                    <input
                      type="number"
                      step="0.1"
                      min={-50}
                      max={50}
                      value={paper.offset_um[index] / 1000}
                      onChange={(e) => {
                        const offset = [
                          ...paper.offset_um,
                        ] as Paper["offset_um"];
                        offset[index] = physicalUm(e.target.value, "mm");
                        setPaper({ ...paper, offset_um: offset });
                      }}
                    />
                  </Field>
                ))}
              </div>
              {validation && <p role="alert">{validation}</p>}
              <div className="form-actions">
                <Button secondary onClick={() => setPaper(null)}>
                  {t("cancel")}
                </Button>
                <Button disabled={busy || Boolean(validation)} type="submit">
                  {t("save")}
                </Button>
              </div>
            </Form>
            <div className="paper-diagram">
              <div className="dimension-label">
                ↔ {paper.width_um / 1000} mm
              </div>
              <div
                className="physical-sheet"
                style={{
                  aspectRatio: `${paper.landscape ? (paper.height_um ?? paper.width_um) : paper.width_um}/${paper.landscape ? paper.width_um : (paper.height_um ?? paper.width_um * 1.7)}`,
                }}
              >
                <div
                  className="printable-overlay"
                  style={{
                    inset: `${(paper.margins_um[0] / (paper.height_um ?? paper.width_um * 1.7)) * 100}% ${(paper.margins_um[1] / paper.width_um) * 100}% ${(paper.margins_um[2] / (paper.height_um ?? paper.width_um * 1.7)) * 100}% ${(paper.margins_um[3] / paper.width_um) * 100}%`,
                  }}
                >
                  <PrinterIcon size={36} />
                  <span>{t("printableArea")}</span>
                </div>
              </div>
              <div className="dimension-label">
                ↕{" "}
                {paper.height_um === null
                  ? t("continuous")
                  : `${paper.height_um / 1000} mm`}
              </div>
              <p>{t("paperHelp2")}</p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
