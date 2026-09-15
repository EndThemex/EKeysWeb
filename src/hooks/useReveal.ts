import { useEffect, useState } from "react";

/**
 * useReveal — observes every `[data-reveal]` descendant of `root` and adds
 * `is-revealed` once it enters the viewport. Runs once per element.
 *
 * Returns a callback ref that should be attached to the root element.
 *
 * 旧实现依赖「切换路由时 <main key={pathname}> 重 mount」来重新收集
 * `[data-reveal]` 目标。现在 <main> 常驻、改由 <Outlet /> 内部替换，
 * 旧实现只会在首次挂载时跑一次，后续路由切换新增的 reveal 目标永远
 * 是 opacity:0、不会被观察到，导致文字不显示。
 *
 * 新增：用一个 MutationObserver 监听 root 的子树，碰到新增的
 * `[data-reveal]` 节点立即观察；并支持重新传入 pathname 等外部 key
 * 来强制重置 observer（防止热重载 / 路由异常下 stale 状态）。
 *
 * Falls back to immediate reveal when the user prefers reduced motion or
 * when IntersectionObserver isn't available, so content is never left hidden.
 */
export function useReveal(resetKey?: unknown): (node: HTMLElement | null) => void {
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!root) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || typeof IntersectionObserver === "undefined") {
      // 立即全部可见
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) =>
        el.classList.add("is-revealed"),
      );
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );

    const setup = (el: HTMLElement, index: number) => {
      if (el.classList.contains("is-revealed")) return;
      // Cap the cascade so a 20-item grid doesn't wait 2 seconds for the
      // last row. Use a small per-element stagger (40ms) for rhythm.
      const delay = Math.min(index, 8) * 40;
      el.style.setProperty("--reveal-delay", `${delay}ms`);
      observer.observe(el);
    };

    // 1) 处理已经存在的目标
    const initial = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    initial.forEach(setup);

    // 2) 监听后续新增的 [data-reveal]（路由切换 / Outlet 替换时）
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches("[data-reveal]")) setup(node, 0);
          node.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => setup(el, 0));
        });
      }
    });
    mo.observe(root, { childList: true, subtree: true });

    // Safety net: 1.2s 内没观察到交集则强制全部可见，避免极端情况下
    // 内容永远 hidden。
    const fallback = window.setTimeout(() => {
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) =>
        el.classList.add("is-revealed"),
      );
    }, 1200);

    return () => {
      observer.disconnect();
      mo.disconnect();
      window.clearTimeout(fallback);
    };
  }, [root, resetKey]);

  // Returned callback ref re-renders the component (via setRoot) each time
  // a new root node is attached, which re-runs the effect above.
  return setRoot;
}
