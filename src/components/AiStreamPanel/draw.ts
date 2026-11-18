/**
 * AI Tab 的 Canvas 绘制管线。
 *
 * 所有内容源统一渲染到 428×142（高画质 856×284）画布：
 * 图片 / 屏幕捕获按 cover 居中裁剪，文字按对齐方式换行绘制。
 */

export type AiSourceMode = "file" | "text" | "screen";
export type TextAlign = "left" | "center" | "right";

export interface DrawState {
  mode: AiSourceMode;
  image: HTMLImageElement | null;
  video: HTMLVideoElement | null;
  text: string;
  textBg: string;
  textFg: string;
  textSize: number;
  textAlign: TextAlign;
}

const PLACEHOLDER_BG = "#0a0a0a";
const PLACEHOLDER_FG = "rgba(244, 243, 238, 0.55)";
const PLACEHOLDER_BORDER = "rgba(244, 243, 238, 0.22)";

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: HTMLImageElement | HTMLVideoElement,
  w: number,
  h: number,
) {
  const sw =
    source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const sh =
    source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!sw || !sh) return;
  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(source, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const px = Math.max(8, Math.round(12 * (h / 142)));
  ctx.fillStyle = PLACEHOLDER_BG;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = PLACEHOLDER_BORDER;
  ctx.lineWidth = Math.max(1, h / 142);
  ctx.strokeRect(px, px, w - px * 2, h - px * 2);
  ctx.fillStyle = PLACEHOLDER_FG;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(18 * (h / 142))}px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.fillText("NO SOURCE", w / 2, h / 2);
}

/** 按字符换行（对中文友好），同时保留显式 \n。 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph === "") {
      lines.push("");
      continue;
    }
    let line = "";
    for (const ch of paragraph) {
      const candidate = line + ch;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawText(ctx: CanvasRenderingContext2D, w: number, h: number, s: DrawState) {
  ctx.fillStyle = s.textBg;
  ctx.fillRect(0, 0, w, h);

  const scale = h / 142;
  const size = Math.max(10, Math.round(s.textSize * scale));
  const pad = Math.round(12 * scale);
  const lineHeight = Math.round(size * 1.28);

  const text = s.text.trim();
  if (!text) {
    drawPlaceholder(ctx, w, h);
    return;
  }

  ctx.font = `600 ${size}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Inter", sans-serif`;
  ctx.fillStyle = s.textFg;
  ctx.textBaseline = "top";
  ctx.textAlign = s.textAlign === "left" ? "left" : s.textAlign === "right" ? "right" : "center";

  const lines = wrapText(ctx, text, w - pad * 2);
  const maxLines = Math.max(1, Math.floor((h - pad * 2) / lineHeight));
  const visible = lines.slice(0, maxLines);

  const totalHeight = visible.length * lineHeight;
  let y = Math.max(pad, (h - totalHeight) / 2);
  const x = s.textAlign === "left" ? pad : s.textAlign === "right" ? w - pad : w / 2;

  for (const line of visible) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
}

/** 把当前内容源绘制到画布，并按需调整画布尺寸。 */
export function drawPreview(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  state: DrawState,
): void {
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = PLACEHOLDER_BG;
  ctx.fillRect(0, 0, w, h);

  if (state.mode === "file" && state.image) {
    drawCover(ctx, state.image, w, h);
  } else if (
    state.mode === "screen" &&
    state.video &&
    state.video.readyState >= 2
  ) {
    drawCover(ctx, state.video, w, h);
  } else if (state.mode === "text") {
    drawText(ctx, w, h, state);
  } else {
    drawPlaceholder(ctx, w, h);
  }
  ctx.restore();
}
