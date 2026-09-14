import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DICT, type Dict, type Lang } from "./dict";

/* ============================================================
   useI18n — React 适配层
   - 主题 / 语言 写入 localStorage
   - 初始化时读取 index.html head 中已同步好的 data-theme / data-lang
   - 通过 Context 暴露给所有组件，保证切换时整站同步更新
   ============================================================ */

const STORAGE_KEY_LANG = "ek_lang";
const STORAGE_KEY_THEME = "ek_theme";

export type Theme = "light" | "dark";

export interface I18nContextValue {
  lang: Lang;
  theme: Theme;
  t: (key: string) => string;
  tag: (key: string) => string[];
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

function detectLang(): Lang {
  if (typeof document !== "undefined") {
    const fromAttr = document.documentElement.getAttribute("data-lang");
    if (fromAttr === "en" || fromAttr === "zh") return fromAttr;
  }
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(STORAGE_KEY_LANG);
    if (stored === "en" || stored === "zh") return stored;
  }
  if (typeof navigator !== "undefined") {
    return (navigator.language || "en").toLowerCase().startsWith("zh")
      ? "zh"
      : "en";
  }
  return "en";
}

function detectTheme(): Theme {
  if (typeof document !== "undefined") {
    const fromAttr = document.documentElement.getAttribute("data-theme");
    if (fromAttr === "light" || fromAttr === "dark") return fromAttr;
  }
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(STORAGE_KEY_THEME);
    if (stored === "light" || stored === "dark") return stored;
  }
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export interface I18nProviderProps {
  children: ReactNode;
  /** 自定义初始值；测试或 storybook 使用 */
  initialLang?: Lang;
  initialTheme?: Theme;
}

export function I18nProvider({
  children,
  initialLang,
  initialTheme,
}: I18nProviderProps) {
  const [lang, setLangState] = useState<Lang>(initialLang ?? detectLang());
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? detectTheme());

  // 初始化完成后再显示内容，避免英文兜底闪现
  useEffect(() => {
    document.documentElement.setAttribute("data-lang", lang);
    document.documentElement.setAttribute(
      "lang",
      lang === "zh" ? "zh-CN" : "en",
    );
    document.documentElement.setAttribute("data-lang-ready", "true");
  }, [lang]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch (_) {
      /* ignore */
    }
    // Tag the body for one frame so CSS can apply a unified theme-switch
    // transition across the entire tree (rather than every element
    // animating on its own start time).
    if (typeof document !== "undefined") {
      document.body.classList.add("is-theme-switching");
      const id = window.setTimeout(
        () => document.body.classList.remove("is-theme-switching"),
        350,
      );
      return () => window.clearTimeout(id);
    }
  }, [theme]);

  const setLang = useCallback((next: Lang) => {
    try {
      window.localStorage.setItem(STORAGE_KEY_LANG, next);
    } catch (_) {
      /* ignore */
    }
    setLangState(next);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "zh" ? "en" : "zh");
  }, [lang, setLang]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const dict: Dict = DICT[lang];

  const t = useCallback(
    (key: string) => {
      const v = dict[key];
      return typeof v === "string" ? v : key;
    },
    [dict],
  );

  const tag = useCallback(
    (key: string) => {
      const v = dict[key];
      return Array.isArray(v) ? v : [];
    },
    [dict],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      theme,
      t,
      tag,
      setLang,
      toggleLang,
      setTheme,
      toggleTheme,
    }),
    [lang, theme, t, tag, setLang, toggleLang, setTheme, toggleTheme],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return ctx;
}

/** 简化 hook：直接拿 t() 函数 */
export function useT(): (key: string) => string {
  return useI18n().t;
}