import { useState } from "react";

/**
 * CodeBlock — 美观的命令行代码展示组件。
 *
 * - 顶部 macOS 风格的窗口指示灯 + 文件名/标签
 * - 行号
 * - 复制到剪贴板
 * - 自动识别命令行，渲染前加 "$" 提示符
 */
export type CodeBlockProps = {
  /** 原始代码内容，按 \n 分行 */
  code: string;
  /** 窗口头部显示的文件名/语言标签 */
  label?: string;
  /** 是否给每行加上 "$" 命令提示符（shell 风格） */
  prompt?: boolean;
};

export default function CodeBlock({
  code,
  label = "bash",
  prompt = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const lines = code.replace(/\n$/, "").split("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用时静默忽略
    }
  };

  return (
    <div className="codeblock" data-reveal>
      <div className="codeblock__bar">
        <span className="codeblock__dots" aria-hidden="true">
          <i /> <i /> <i />
        </span>
        <span className="codeblock__label">{label}</span>
        <button
          type="button"
          className="codeblock__copy"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="codeblock__pre">
        <code>
          {lines.map((line, i) => (
            <span className="codeblock__line" key={i}>
              <span className="codeblock__lineno">{i + 1}</span>
              {prompt ? (
                <span className="codeblock__line-body">
                  <span className="codeblock__prompt" aria-hidden="true">
                    $
                  </span>
                  {line || "\u00A0"}
                </span>
              ) : (
                <span className="codeblock__line-body">
                  {line || "\u00A0"}
                </span>
              )}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
