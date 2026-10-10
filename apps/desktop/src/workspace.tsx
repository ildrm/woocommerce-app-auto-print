import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { api } from "./api";
import { emptyData, type EngineData } from "./contracts";
import { translate, type Locale, type Message, rtl } from "./i18n";
interface Workspace {
  data: EngineData;
  locale: Locale;
  setLocale: (v: Locale) => void;
  theme: string;
  setTheme: (v: string) => void;
  t: (k: Message) => string;
  error: string;
  busy: boolean;
  notice: string;
  refresh: () => Promise<void>;
  act: (fn: () => Promise<unknown>, message?: string) => Promise<boolean>;
  navigate: (v: Message) => void;
  page: Message;
}
const Context = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(emptyData);
  const [locale, setLocale] = useState<Locale>(
    (localStorage.getItem("locale") as Locale) || "en",
  );
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "system");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [page, navigate] = useState<Message>("dashboard");
  const refresh = useCallback(async () => {
    try {
      setData(await api<EngineData>("/state"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Engine unavailable");
      setData((prev) => ({
        ...prev,
        agent: { ...prev.agent, status: "offline" },
      }));
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = rtl(locale) ? "rtl" : "ltr";
    localStorage.setItem("locale", locale);
  }, [locale]);
  useEffect(() => {
    localStorage.setItem("theme", theme);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  const act = async (fn: () => Promise<unknown>, message?: string) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
      setNotice(message || translate(locale, "saved"));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : translate(locale, "error"));
      return false;
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const t = useCallback((k: Message) => translate(locale, k), [locale]);
  return (
    <Context.Provider
      value={{
        data,
        locale,
        setLocale,
        theme,
        setTheme,
        t,
        error,
        busy,
        notice,
        refresh,
        act,
        navigate,
        page,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const c = useContext(Context);
  if (!c) throw new Error("Workspace provider missing");
  return c;
}
