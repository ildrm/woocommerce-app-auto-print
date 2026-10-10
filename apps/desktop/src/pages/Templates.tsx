import { useRef, useState } from "react";
import { FileText, Plus, Upload, Copy } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { api, exportFile, native } from "../api";
import { useWorkspace } from "../workspace";
import { id, newNode, type Template } from "../contracts";
import { Button, PageHeader, Preview } from "../components/ui";
import { Designer } from "./Designer";
export function TemplatesPage() {
  const { t, data, act } = useWorkspace();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Template | null>(null);
  const [preview, setPreview] = useState<Template | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const saveImported = async (value: unknown) => {
    const imported = value as Template;
    if (!imported || !Array.isArray(imported.nodes))
      throw new Error("Invalid template package");
    const template = {
      ...imported,
      id: id(),
      name: `${imported.name} (${t("import")})`,
      version: 1,
      published: false,
    };
    await api(`/configs/templates/${template.id}`, "PUT", template);
    setEditing(template);
  };
  return editing ? (
    <Designer initial={editing} onClose={() => setEditing(null)} />
  ) : (
    <>
      <PageHeader title={t("templates")}>
        <Button
          secondary
          onClick={() => {
            if (native())
              void act(async () =>
                saveImported(await invoke("import_template")),
              );
            else input.current?.click();
          }}
        >
          <Upload size={17} />
          {t("import")}
        </Button>
        <Button
          onClick={() =>
            setEditing({
              id: id(),
              name: t("newTemplate"),
              schema_version: 1,
              version: 1,
              locale: "en",
              direction: "ltr",
              nodes: [
                {
                  ...newNode("dynamic_field"),
                  binding: "store.name",
                  font_size: 16,
                  bold: true,
                  align: "center",
                },
              ],
              archived: false,
              published: false,
            })
          }
        >
          <Plus size={18} />
          {t("newTemplate")}
        </Button>
      </PageHeader>
      <input
        ref={input}
        hidden
        type="file"
        accept=".autoprint-template,.json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file)
            void act(async () => {
              if (file.size > 2 * 1024 * 1024)
                throw new Error("Template exceeds 2 MB");
              await saveImported(JSON.parse(await file.text()));
            });
          e.target.value = "";
        }}
      />
      <input
        className="search"
        placeholder={t("search")}
        aria-label={t("search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="template-grid">
        {data.templates
          .filter((template) =>
            template.name.toLowerCase().includes(query.toLowerCase()),
          )
          .map((template) => (
            <article
              className={`template-card ${template.archived ? "archived" : ""}`}
              key={template.id}
            >
              <button
                className="template-thumbnail"
                onClick={() => setPreview(template)}
                aria-label={`${t("preview")} ${template.name}`}
              >
                <div className="mini-document" dir={template.direction}>
                  <FileText size={28} strokeWidth={1} />
                  <strong>{template.name}</strong>
                  {template.nodes.slice(0, 7).map((n) => (
                    <span
                      className={
                        n.kind === "divider" ? "mini-divider" : "mini-line"
                      }
                      key={n.id}
                    >
                      {n.kind === "text" ? n.text : n.binding}
                    </span>
                  ))}
                </div>
              </button>
              <div className="template-card-content">
                <h2>{template.name}</h2>
                <p>
                  {template.locale} · {t("version")} {template.version} ·{" "}
                  {t(template.published ? "published" : "draft")}
                </p>
                <div className="row-actions">
                  <Button
                    secondary
                    onClick={() =>
                      setEditing(
                        data.drafts.find((d) => d.id === template.id) ??
                          template,
                      )
                    }
                  >
                    {t("edit")}
                  </Button>
                  <button
                    className="icon-button"
                    aria-label={t("duplicate")}
                    onClick={() =>
                      setEditing({
                        ...template,
                        id: id(),
                        name: `${template.name} (${t("duplicate")})`,
                        version: 1,
                        published: false,
                      })
                    }
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="text-button"
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
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      void act(() =>
                        api(`/configs/templates/${template.id}`, "PUT", {
                          ...template,
                          archived: !template.archived,
                        }),
                      )
                    }
                  >
                    {t(template.archived ? "restore" : "archive")}
                  </button>
                </div>
              </div>
            </article>
          ))}
      </div>
      {preview && (
        <Preview template={preview} onClose={() => setPreview(null)} />
      )}
    </>
  );
}
