import {
  useEffect,
  useRef,
  useState,
  useId,
  Children,
  isValidElement,
  cloneElement,
  type ReactElement,
  type ReactNode,
  type FormEvent,
} from "react";
import { X, Printer as PrinterIcon, LoaderCircle } from "lucide-react";
import { api, artifactUrl } from "../api";
import { useWorkspace } from "../workspace";
import {
  defaultPaper,
  type Printer,
  type Template,
  type Order,
} from "../contracts";
import { languages, type Locale } from "../i18n";
export function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  return (
    <button
      className={secondary ? "button secondary" : "button"}
      onClick={onClick}
      disabled={disabled}
      type={type}
      title={title}
    >
      {children}
    </button>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const labelId = useId();
  return (
    <label className="field">
      <span id={labelId}>{label}</span>
      {Children.map(children, (child) =>
        isValidElement(child) &&
        (["input", "select", "textarea"].includes(String(child.type)) ||
          child.type === LocaleSelect)
          ? cloneElement(child as ReactElement<Record<string, unknown>>, {
              "aria-labelledby": labelId,
            })
          : child,
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}
export function LocaleSelect({
  value,
  onChange,
  "aria-labelledby": labelledBy,
}: {
  value: string;
  onChange: (l: string) => void;
  "aria-labelledby"?: string;
}) {
  return (
    <select
      aria-labelledby={labelledBy}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {Object.entries(languages).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const dialog = ref.current;
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <div className="modal-title">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Form({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}
export function Empty({
  title,
  help,
  action,
}: {
  title: string;
  help?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <PrinterIcon size={52} strokeWidth={1.25} />
      <h3>{title}</h3>
      {help && <p>{help}</p>}
      {action}
    </div>
  );
}
export function Status({ state }: { state: string }) {
  const { t } = useWorkspace();
  return (
    <span className={`status ${state}`}>
      <span className="status-dot" />
      {state in
      {
        queued: 1,
        rendering: 1,
        ready: 1,
        submitting: 1,
        submitted: 1,
        completed: 1,
        retry_scheduled: 1,
        failed: 1,
        outcome_uncertain: 1,
        canceled: 1,
      }
        ? t(state as Parameters<typeof t>[0])
        : state}
    </span>
  );
}
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="header-actions">{children}</div>
    </header>
  );
}
export function Preview({
  template,
  printer,
  order,
  onClose,
}: {
  template: Template;
  printer?: Printer;
  order?: Order;
  onClose: () => void;
}) {
  const { t } = useWorkspace();
  const [pages, setPages] = useState<string[]>([]);
  const [pdf, setPdf] = useState("");
  const [error, setError] = useState("");
  const urls = useRef<string[]>([]);
  useEffect(() => {
    let canceled = false;
    void (async () => {
      try {
        const result = await api<{ pages: string[]; pdf: string }>(
          "/preview",
          "POST",
          {
            template,
            printer: printer ?? {
              id: "preview",
              name: "Preview",
              transport: { type: "pdf" },
              paper: defaultPaper,
              template_id: template.id,
              enabled: true,
              locale: template.locale,
              copies: 1,
            },
            order,
          },
        );
        const loaded = await Promise.all(result.pages.map(artifactUrl));
        urls.current.push(...loaded);
        const document = await artifactUrl(result.pdf);
        urls.current.push(document);
        if (!canceled) {
          setPages(loaded);
          setPdf(document);
        }
      } catch (e) {
        if (!canceled) setError((e as Error).message);
      }
    })();
    return () => {
      canceled = true;
      urls.current.forEach((u) => {
        if (u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
    };
  }, [template, printer, order]);
  return (
    <Modal
      title={order ? t("preview") : t("samplePreview")}
      onClose={onClose}
      wide
    >
      <div className="preview-bar">
        <p>
          {template.name} · {printer?.paper.name ?? defaultPaper.name}
        </p>
        {pdf && (
          <a
            className="button secondary"
            href={pdf}
            download={`${template.name}.pdf`}
          >
            {t("downloadPdf")}
          </a>
        )}
      </div>
      {error ? (
        <div role="alert" className="alert">
          {error}
        </div>
      ) : pages.length ? (
        <div className="artifact-pages">
          {pages.map((url, i) => (
            <img key={i} src={url} alt={`${t("document")} ${i + 1}`} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <LoaderCircle className="spin" />
          {t("working")}
        </div>
      )}
    </Modal>
  );
}
export function Confirm({
  message,
  onConfirm,
  onClose,
}: {
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useWorkspace();
  return (
    <Modal title={t("validation")} onClose={onClose}>
      <p>{message}</p>
      <div className="form-actions">
        <Button secondary onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button onClick={onConfirm}>{t("print")}</Button>
      </div>
    </Modal>
  );
}
export const localeCast = (value: string) => value as Locale;
