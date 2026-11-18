import type { RefObject } from "react";

/** 与设备显示 1:1 的预览画布（CSS 等比缩放，不改内部像素）。 */
export function PreviewCanvas({
  canvasRef,
  label,
  note,
}: {
  canvasRef: RefObject<HTMLCanvasElement>;
  label: string;
  note: string;
}) {
  return (
    <section className="ai-preview" aria-label={label}>
      <div className="ai-card__head">
        <span className="eyebrow">{label}</span>
        <span className="ai-preview__note">{note}</span>
      </div>
      <div className="ai-preview__frame">
        <canvas
          ref={canvasRef}
          className="ai-preview__canvas"
          width={428}
          height={142}
        />
      </div>
    </section>
  );
}
