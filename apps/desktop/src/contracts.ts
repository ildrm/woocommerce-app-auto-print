export interface Paper {
  id: string;
  name: string;
  width_um: number;
  height_um: number | null;
  margins_um: [number, number, number, number];
  dpi: number;
  landscape: boolean;
  scaling: string;
  offset_um: [number, number];
  scale_percent: number;
}
export type Transport =
  | { type: "pdf" }
  | { type: "os"; queue: string }
  | { type: "escpos"; host: string; port: number; cut: boolean }
  | { type: "ipp"; url: string };
export interface Printer {
  id: string;
  name: string;
  transport: Transport;
  paper: Paper;
  template_id: string;
  enabled: boolean;
  locale: string;
  copies: number;
}
export interface Store {
  id: string;
  name: string;
  url: string;
  poll_seconds: number;
  automation: boolean;
  locale: string;
  timezone: string;
}
export type Condition =
  | { type: "all" | "any"; conditions: Condition[] }
  | { type: "compare"; field: string; op: string; value: unknown };
export interface Rule {
  id: string;
  name: string;
  store_id: string;
  printer_id: string;
  template_id: string;
  condition: Condition;
  item_condition: Condition | null;
  enabled: boolean;
  allow_unpaid: boolean;
  priority: number;
  stop: boolean;
  copies: number;
}
export interface TemplateNode {
  id: string;
  kind: string;
  text: string;
  binding: string;
  children: TemplateNode[];
  condition: Condition | null;
  font_size: number;
  bold: boolean;
  align: string;
  locked: boolean;
  width_um: number | null;
  height_um: number | null;
  border: boolean;
}
export interface Template {
  id: string;
  name: string;
  schema_version: number;
  version: number;
  locale: string;
  direction: string;
  nodes: TemplateNode[];
  archived: boolean;
  published: boolean;
}
export interface Order {
  id: number;
  number: string;
  status: string;
  currency: string;
  total: string;
  discount_total: string;
  shipping_total: string;
  total_tax: string;
  date_created_gmt: string;
  date_modified_gmt: string;
  date_paid_gmt: string | null;
  billing: Record<string, string>;
  shipping: Record<string, string>;
  line_items: Record<string, unknown>[];
  shipping_lines: Record<string, unknown>[];
  customer_note: string;
  payment_method_title: string;
  payment_method: string;
  refunds: unknown[];
}
export interface Snapshot {
  order: Order;
  printer: Printer;
  template: Template;
  store_name: string;
  store_id: string;
  copies: number;
  reprint: boolean;
}
export interface Job {
  id: string;
  identity: string;
  state: string;
  snapshot: Snapshot;
  created_at: string;
  updated_at: string;
  attempts: number;
  next_attempt: string;
  error: string | null;
  submission_ref: string | null;
}
export interface EngineData {
  stores: Store[];
  printers: Printer[];
  templates: Template[];
  drafts: Template[];
  papers: Paper[];
  rules: Rule[];
  orders: { store_id: string; order: Order }[];
  jobs: Job[];
  settings: Record<string, unknown>[];
  health: Record<
    string,
    { status: string; message?: string; last_sync?: string }
  >;
  agent: { status: string; version: string };
}
export const emptyData: EngineData = {
  stores: [],
  printers: [],
  templates: [],
  drafts: [],
  papers: [],
  rules: [],
  orders: [],
  jobs: [],
  settings: [],
  health: {},
  agent: { status: "offline", version: "0.1.0" },
};
export const defaultPaper: Paper = {
  id: "80 mm roll",
  name: "80 mm roll",
  width_um: 80000,
  height_um: null,
  margins_um: [2000, 2000, 2000, 2000],
  dpi: 203,
  landscape: false,
  scaling: "actual",
  offset_um: [0, 0],
  scale_percent: 100,
};
export const id = () => crypto.randomUUID();
export function newNode(kind: string): TemplateNode {
  return {
    id: id(),
    kind,
    text: kind === "text" ? "New text" : "",
    binding:
      kind === "table" || kind === "repeater"
        ? "items"
        : kind === "barcode"
          ? "order.number"
          : "",
    children: [],
    condition: null,
    font_size: 10,
    bold: false,
    align: "start",
    locked: false,
    width_um: null,
    height_um: null,
    border: false,
  };
}
