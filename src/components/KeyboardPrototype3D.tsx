import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useI18n } from "../i18n/useI18n.tsx";

/* ============================================================
   KeyboardPrototype3D — EKeys 原型版键盘模型

   设计灵感来自原型 HTML 的 CSS 透视效果,但这里是真正的
   Three.js 3D 渲染:
   - 整体:80cm(W) × 93cm(H) × 18cm(D) 的圆角外壳
   - 顶部:428:124 LCD 屏(占满顶段,带打字机效果文本)
   - 主体:3 行 × 4 列按键矩阵(右下角为旋钮 ENC)
   - 按键可点击 → 屏幕文字实时更新
   - 旋钮可点击 → 切换"功能模式"(PROFILE / KEY MAP / RGB / VOICE / APP LINK)
   - 鼠标拖拽旋转 + 滚轮缩放
   - 亮/暗主题切换:整体配色与主站 design tokens 保持一致
   ============================================================ */

const KEYBOARD_W = 80;
const KEYBOARD_H = 93;
const KEYBOARD_D = 18;

const SCREEN_W = KEYBOARD_W - 8;
const SCREEN_H = (SCREEN_W * 124) / 428;

const KEYS_TOP_OFFSET = 6;
const KEYS_BOTTOM_OFFSET = 6;
const KEYS_SIDE_OFFSET = 6;
const KEYS_AREA_LEFT = KEYS_SIDE_OFFSET;
const KEYS_AREA_RIGHT = KEYBOARD_W - KEYS_SIDE_OFFSET;
const KEYS_AREA_W = KEYS_AREA_RIGHT - KEYS_AREA_LEFT;
const KEYS_AREA_H =
  KEYBOARD_H - SCREEN_H - KEYS_TOP_OFFSET * 2 - KEYS_BOTTOM_OFFSET;

const COLS = 4;
const ROWS = 3;
const KEY_GAP = 2.2;
const KEY_W = (KEYS_AREA_W - KEY_GAP * (COLS - 1)) / COLS;
const KEY_H = (KEYS_AREA_H - KEY_GAP * (ROWS - 1)) / ROWS;
const KEY_HEIGHT = 5.5;

const KNOB_RADIUS = Math.min(KEY_W, KEY_H) * 0.42;
const KNOB_HEIGHT = 6;

/** 按键标签布局(空格位置:1·R1C4 是旋钮,所以 11 键 + 1 旋钮 = 12 格) */
const KEY_LABELS: Array<Array<string | null>> = [
  ["1", "2", "3", "ENC"],
  ["4", "5", "6", "7"],
  ["8", "9", "10", "11"],
];

/** 5 个功能模式的元数据 */
type FeatureId = 0 | 1 | 2 | 3 | 4;
interface Feature {
  id: FeatureId;
  subtitle: string;
  title: string;
  points: string[];
  screenText: string;
  /** 旋钮指示器角度(度) */
  knobAngle: number;
}
const FEATURES: Feature[] = [
  {
    id: 0,
    subtitle: "PROFILE",
    title: "一键切换 · 8 种工作人格",
    points: [
      "8 套键映射 / 灯光 / 主题",
      "旋钮一转即换,PC 状态联动",
      "办公 / 游戏 / 剪辑 瞬间切换",
    ],
    screenText: "PROFILE 3 · OFFICE",
    knobAngle: 0,
  },
  {
    id: 1,
    subtitle: "KEY MAPPING",
    title: "一个键 · 三种命运",
    points: [
      "功能键 / 普通键序列 / 宏",
      "FUN1 / FUN2 组合层",
      "每键独立配置,随 Profile 切换",
    ],
    screenText: "KEY 7 -> CTRL + C",
    knobAngle: 90,
  },
  {
    id: 2,
    subtitle: "RGB LIGHTING",
    title: "11 颗灯珠 · 9 种情绪",
    points: [
      "彩虹波 / 火焰 / 拾音律动",
      "点击高亮,亮度可调",
      "音乐屏自动避让",
    ],
    screenText: "RAINBOW WAVE 80%",
    knobAngle: 180,
  },
  {
    id: 3,
    subtitle: "VOICE ASR",
    title: "按住即说 · 松开出字",
    points: [
      "腾讯云 ASR 识别",
      "HID 直出,无需驱动",
      "音乐屏自动避让",
    ],
    screenText: "* REC LISTENING",
    knobAngle: 270,
  },
  {
    id: 4,
    subtitle: "APP LINK",
    title: "和桌面 App 说同一种语言",
    points: [
      "23 条协议 / PC 状态 / 音乐控制",
      "HA 聚合 / OTA 升级",
      "TCP 30000 端口直连",
    ],
    screenText: "TCP 30000 LINK OK",
    knobAngle: 360,
  },
];

/* ============================================================
 * Theme palettes
 *
 * 与主站 design tokens 保持一致:亮色主题(--bg #f4f3ee + 黑色面板)
 *   暗色主题(--bg #0a0a0a + 深灰面板)
 * 这里集中所有材质用到的 hex 颜色,亮暗切换时一次性套用。
 * ============================================================ */
interface ThemePalette {
  /** 全屏背景径向渐变(内 / 外) */
  bgInner: string;
  bgOuter: string;
  /** 屏幕底色 / 文字 / 发光 */
  screenBg: string;
  screenText: string;
  screenGlowCenter: string;
  screenGlowEdge: string;
  screenShadow: string;
  screenRecColor: string;
  /** 外壳 */
  shell: number;
  shellEmissive: string;
  shellEmissiveIntensity: number;
  shellEdge: number;
  shellHighlight: number;
  shellHighlightOpacity: number;
  /** 屏外蓝色 halo */
  haloColor: number;
  haloOpacity: number;
  /** 屏 bezel */
  bezel: number;
  bezelEmissive: string;
  bezelEmissiveIntensity: number;
  /** 按键槽 */
  slot: number;
  /** 普通按键(底色 + emissive) */
  key: number;
  keyEmissive: string;
  keyEmissiveIntensity: number;
  /** 按键标签数字 */
  label: string;
  /** RGB 高亮 */
  rgbColor: number;
  /** 旋钮 — 底环 / 主体 / 顶面 / 滚花 / 虚线圈 / 高光 / 指示条 */
  knobRing: number;
  knobBody: number;
  knobBodyEmissive: string;
  knobBodyEmissiveIntensity: number;
  knobTop: number;
  knobKnurl: number;
  knobDashed: number;
  knobDashedOpacity: number;
  knobHighlightOpacity: number;
  knobIndicatorColor: number;
  knobIndicatorEmissive: string;
  /** 提示文字色 */
  hintColor: string;
  /** 顶部白光的填充光色调 */
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  keyLightColor: number;
  rimColor: number;
  fillWarmColor: number;
  fillWarmIntensity: number;
  topFillColor: number;
}

const DARK_PALETTE: ThemePalette = {
  bgInner: "#1a1e24",
  bgOuter: "#0a0c0f",
  screenBg: "#0c0f14",
  screenText: "#d0e4ff",
  screenGlowCenter: "rgba(80, 160, 255, 0.18)",
  screenGlowEdge: "rgba(12, 15, 20, 0)",
  screenShadow: "rgba(100, 180, 255, 0.6)",
  screenRecColor: "#ff5f56",
  shell: 0x252932,
  shellEmissive: "#0a0c12",
  shellEmissiveIntensity: 0.4,
  shellEdge: 0x5a6478,
  shellHighlight: 0x4a5260,
  shellHighlightOpacity: 0.35,
  haloColor: 0x4a8aff,
  haloOpacity: 0.18,
  bezel: 0x05080c,
  bezelEmissive: "#0a1a2a",
  bezelEmissiveIntensity: 0.25,
  slot: 0x0e1116,
  key: 0x262b34,
  keyEmissive: "#080a10",
  keyEmissiveIntensity: 0.5,
  label: "#d0e4ff",
  rgbColor: 0x4a8aff,
  knobRing: 0x0c0f12,
  knobBody: 0x2a2e35,
  knobBodyEmissive: "#10131a",
  knobBodyEmissiveIntensity: 0.6,
  knobTop: 0x1f242b,
  knobKnurl: 0x14171c,
  knobDashed: 0xb4c8ff,
  knobDashedOpacity: 0.35,
  knobHighlightOpacity: 0.12,
  knobIndicatorColor: 0xb0d0ff,
  knobIndicatorEmissive: "#4a8aff",
  hintColor: "rgba(160, 180, 200, 0.4)",
  hemiSky: 0xa8c0e0,
  hemiGround: 0x2a2030,
  hemiIntensity: 0.45,
  keyLightColor: 0xffe8d0,
  rimColor: 0x4a8aff,
  fillWarmColor: 0xff8a5b,
  fillWarmIntensity: 0.25,
  topFillColor: 0xb0c8e0,
};

/* 亮色主题:外壳使用与主站一致的 #f4f3ee 色调,
 * 按键和旋钮用更亮的灰色 + 适度的对比,屏幕底色仍偏深以保持 LCD 观感。 */
const LIGHT_PALETTE: ThemePalette = {
  bgInner: "#ffffff",
  bgOuter: "#e8e6df",
  screenBg: "#0c0f14",
  screenText: "#d0e4ff",
  screenGlowCenter: "rgba(80, 160, 255, 0.18)",
  screenGlowEdge: "rgba(12, 15, 20, 0)",
  screenShadow: "rgba(100, 180, 255, 0.6)",
  screenRecColor: "#ff5f56",
  shell: 0xe8e4d9,
  shellEmissive: "#f4f3ee",
  shellEmissiveIntensity: 0.35,
  shellEdge: 0xb8b5ad,
  shellHighlight: 0xffffff,
  shellHighlightOpacity: 0.55,
  haloColor: 0x4a8aff,
  haloOpacity: 0.22,
  bezel: 0x1a1c20,
  bezelEmissive: "#0a1a2a",
  bezelEmissiveIntensity: 0.25,
  slot: 0xc4c0b6,
  key: 0xd9d5ca,
  keyEmissive: "#ffffff",
  keyEmissiveIntensity: 0.15,
  label: "#1a1a1a",
  rgbColor: 0x4a8aff,
  knobRing: 0x8c887e,
  knobBody: 0xc9c5ba,
  knobBodyEmissive: "#ffffff",
  knobBodyEmissiveIntensity: 0.25,
  knobTop: 0xb8b4a9,
  knobKnurl: 0x7a766d,
  knobDashed: 0x4a8aff,
  knobDashedOpacity: 0.55,
  knobHighlightOpacity: 0.25,
  knobIndicatorColor: 0x4a8aff,
  knobIndicatorEmissive: "#4a8aff",
  hintColor: "rgba(60, 70, 80, 0.55)",
  hemiSky: 0xffffff,
  hemiGround: 0xc0bcae,
  hemiIntensity: 0.85,
  keyLightColor: 0xffffff,
  rimColor: 0x4a8aff,
  fillWarmColor: 0xff8a5b,
  fillWarmIntensity: 0.18,
  topFillColor: 0xffffff,
};

function getPalette(theme: "light" | "dark"): ThemePalette {
  return theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;
}

// ---------- 屏幕文字纹理(支持动态更新) ----------
// 屏幕 LCD 部分保持暗色,亮暗主题下观感一致(原型的"科技屏"语义)
function makeScreenTexture(
  palette: ThemePalette,
): {
  texture: THREE.CanvasTexture;
  setText: (text: string) => void;
  setRecDot: (on: boolean) => void;
} {
  const canvas = document.createElement("canvas");
  canvas.width = 856;
  canvas.height = 248;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const tex = new THREE.CanvasTexture(canvas);
    return { texture: tex, setText: () => {}, setRecDot: () => {} };
  }

  function drawBase() {
    if (!ctx) return;
    const grad = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 2,
    );
    grad.addColorStop(0, palette.screenGlowCenter);
    grad.addColorStop(1, palette.screenGlowEdge);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawText(text: string, recDot: boolean) {
    if (!ctx) return;
    ctx.fillStyle = palette.screenBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBase();

    ctx.font = "bold 48px 'SF Mono', 'Fira Code', 'Cascadia Code', monospace";
    ctx.fillStyle = palette.screenText;
    ctx.shadowColor = palette.screenShadow;
    ctx.shadowBlur = 14;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "2px";

    let drawText = text;
    if (recDot) {
      drawText = "● " + text;
    }
    ctx.fillText(drawText, canvas.width / 2, canvas.height / 2 + 4);
    ctx.shadowBlur = 0;
  }

  drawBase();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  let currentText = "";
  let currentRec = false;

  return {
    texture: tex,
    setText(text: string) {
      currentText = text;
      drawText(currentText, currentRec);
      tex.needsUpdate = true;
    },
    setRecDot(on: boolean) {
      currentRec = on;
      drawText(currentText, currentRec);
      tex.needsUpdate = true;
    },
  };
}

// ---------- 按键标签纹理 ----------
const labelCanvasCache: Record<string, THREE.CanvasTexture> = {};
function makeLabelTexture(text: string, color: string): THREE.CanvasTexture {
  const cacheKey = `${text}::${color}`;
  const cached = labelCanvasCache[cacheKey];
  if (cached && cached.image.width > 0) return cached;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(c);
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = color;
  ctx.font = "bold 96px JetBrains Mono, ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 138);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  labelCanvasCache[cacheKey] = tex;
  return tex;
}

// ---------- 背景径向渐变纹理(支持主题切换) ----------
function makeBackgroundTexture(palette: ThemePalette): THREE.CanvasTexture {
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = 512;
  bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext("2d");
  if (bgCtx) {
    const g = bgCtx.createRadialGradient(160, 160, 0, 160, 160, 380);
    g.addColorStop(0, palette.bgInner);
    g.addColorStop(1, palette.bgOuter);
    bgCtx.fillStyle = g;
    bgCtx.fillRect(0, 0, 512, 512);
  }
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  return bgTex;
}

// ---------- 键帽几何(共享) ----------
function createKeycapGeometry(): THREE.BufferGeometry {
  const baseW = 1;
  const baseD = 1;
  const inset = 0.12;
  const topW = baseW * (1 - inset);
  const topD = baseD * (1 - inset);
  const h = KEY_HEIGHT;
  const radius = 0.08;

  const positions: number[] = [];
  const indices: number[] = [];

  const halfBaseW = baseW / 2;
  const halfBaseD = baseD / 2;
  const r = radius;

  const bottom: [number, number][] = [
    [-halfBaseW + r, -halfBaseD],
    [halfBaseW - r, -halfBaseD],
    [halfBaseW, -halfBaseD + r],
    [halfBaseW, halfBaseD - r],
    [halfBaseW - r, halfBaseD],
    [-halfBaseW + r, halfBaseD],
    [-halfBaseW, halfBaseD - r],
    [-halfBaseW, -halfBaseD + r],
  ];
  const top: [number, number][] = bottom.map(([x, y]) => {
    const sx = Math.sign(x) || 0;
    const sy = Math.sign(y) || 0;
    return [
      sx * Math.max(0, Math.abs(x) - r * inset),
      sy * Math.max(0, Math.abs(y) - r * inset),
    ];
  });

  for (const [x, y] of bottom) positions.push(x, y, 0);
  for (const [x, y] of top) positions.push(x, y, h);

  for (let i = 0; i < 8; i++) {
    const a = i;
    const b = (i + 1) % 8;
    const c = 8 + b;
    const d = 8 + i;
    indices.push(a, b, c, a, c, d);
  }
  const topCenter = positions.length / 3;
  positions.push(0, 0, h);
  for (let i = 0; i < 8; i++) {
    const a = 8 + i;
    const b = 8 + ((i + 1) % 8);
    indices.push(topCenter, a, b);
  }
  const botCenter = positions.length / 3;
  positions.push(0, 0, 0);
  for (let i = 0; i < 8; i++) {
    const a = i;
    const b = (i + 1) % 8;
    indices.push(botCenter, b, a);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

type KeyInfo = {
  mesh: THREE.Mesh;
  baseZ: number;
  isEncoder: boolean;
  isPressed: boolean;
  row: number;
  col: number;
  label: string | null;
};

interface KeyboardPrototype3DProps {
  /** 当前演示的功能 id;变化时驱动 3D 模型上的屏幕文字同步更新 */
  activeFeature?: FeatureId;
  /** 3D 内部交互(如点击旋钮)切换功能时,通知外部更新当前 id */
  onActiveFeatureChange?: (id: FeatureId) => void;
}

export default function KeyboardPrototype3D({
  activeFeature,
  onActiveFeatureChange,
}: KeyboardPrototype3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<{
    setFeature: (id: FeatureId) => void;
    setOnUserFeatureChange: (cb: ((id: FeatureId) => void) | null) => void;
    dispose: () => void;
  } | null>(null);
  const { theme } = useI18n();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const keycapGeo = createKeycapGeometry();
    const palette = getPalette(theme);
    const handle = buildScene(container, keycapGeo, palette);
    handleRef.current = handle;

    return () => {
      handle.dispose();
      handleRef.current = null;
    };
  }, [theme]);

  // 外部 activeFeature 变化 → 调用场景句柄同步屏幕文字 / 旋钮角度 / RGB
  const lastSyncedFeature = useRef<FeatureId | null>(null);
  useEffect(() => {
    if (activeFeature == null) return;
    if (lastSyncedFeature.current === activeFeature) return;
    lastSyncedFeature.current = activeFeature;
    handleRef.current?.setFeature(activeFeature);
  }, [activeFeature]);

  // 把外部回调挂到场景里;用户点击旋钮切换时通知外部更新 activeFeature
  // 包装时同步标记 lastSyncedFeature,防止外部 setCurrent 触发 useEffect 后
  // 又对 3D 场景重复调用 setFeature(虽然幂等,但避免无谓的纹理重绘)。
  useEffect(() => {
    const wrapped = onActiveFeatureChange
      ? (id: FeatureId) => {
          lastSyncedFeature.current = id;
          onActiveFeatureChange(id);
        }
      : null;
    handleRef.current?.setOnUserFeatureChange(wrapped);
  }, [onActiveFeatureChange]);

  return (
    <div className="proto3d-bg">
      <div className="proto3d-bg__canvas" ref={containerRef} />
      <div className="proto3d-bg__hint">
        <span>DRAG · ROTATE</span>
        <span>SCROLL · ZOOM</span>
        <span>CLICK KEY · SHOW MAPPING</span>
        <span>CLICK KNOB · NEXT MODE</span>
      </div>
    </div>
  );
}

// =============== 场景构建 ===============
interface SceneHandle {
  setFeature: (id: FeatureId) => void;
  setOnUserFeatureChange: (cb: ((id: FeatureId) => void) | null) => void;
  dispose: () => void;
}

function buildScene(
  container: HTMLDivElement,
  keycapGeo: THREE.BufferGeometry,
  palette: ThemePalette,
): SceneHandle {
  // ---- Renderer ------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  // ---- Scene & Camera -----------------------------------------
  const scene = new THREE.Scene();
  const bgTex = makeBackgroundTexture(palette);
  scene.background = bgTex;

  const camera = new THREE.PerspectiveCamera(
    36,
    container.clientWidth / container.clientHeight,
    0.5,
    2000,
  );
  // 相机摆正:键盘中心已经在 (0, 0, 0),相机正前方 + 微仰角,
  // 不再硬偏移 X/Y,让模型在画面里水平 / 垂直居中。
  camera.position.set(0, 0, 230);
  camera.lookAt(0, 0, 0);

  // ---- Lighting ------------------------------------------------
  scene.add(
    new THREE.HemisphereLight(
      palette.hemiSky,
      palette.hemiGround,
      palette.hemiIntensity,
    ),
  );

  const keyLight = new THREE.DirectionalLight(palette.keyLightColor, 0.9);
  keyLight.position.set(80, 180, 200);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -140;
  keyLight.shadow.camera.right = 140;
  keyLight.shadow.camera.top = 140;
  keyLight.shadow.camera.bottom = -140;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 500;
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.radius = 6;
  keyLight.shadow.normalBias = 0.5;
  scene.add(keyLight);

  // 蓝色 rim — 主题感蓝色氛围
  const rimBlue = new THREE.DirectionalLight(palette.rimColor, 0.6);
  rimBlue.position.set(-90, 100, -80);
  scene.add(rimBlue);

  // 暖色补光
  const fillWarm = new THREE.DirectionalLight(
    palette.fillWarmColor,
    palette.fillWarmIntensity,
  );
  fillWarm.position.set(60, -40, 120);
  scene.add(fillWarm);

  // 顶部柔光
  const topFill = new THREE.DirectionalLight(palette.topFillColor, 0.35);
  topFill.position.set(0, 220, 0);
  scene.add(topFill);

  // ---- Keyboard group -----------------------------------------
  // 键盘整体:几何中心已经在 (0, 0, 0),只需把整组沿 Z 拉出到外壳前面一点,
  // 让 camDistance=230 的正前方相机能拍到全貌,且相机 lookAt(0,0,0)
  // 自然对准整机的视觉中心(屏+键+旋钮 的几何中心)。
  const keyboard = new THREE.Group();
  scene.add(keyboard);

  // 外壳 — 圆角 box
  const shellShape = new THREE.Shape();
  const sw = KEYBOARD_W;
  const sh = KEYBOARD_H;
  const radius = 4;
  shellShape.moveTo(-sw / 2 + radius, -sh / 2);
  shellShape.lineTo(sw / 2 - radius, -sh / 2);
  shellShape.quadraticCurveTo(sw / 2, -sh / 2, sw / 2, -sh / 2 + radius);
  shellShape.lineTo(sw / 2, sh / 2 - radius);
  shellShape.quadraticCurveTo(sw / 2, sh / 2, sw / 2 - radius, sh / 2);
  shellShape.lineTo(-sw / 2 + radius, sh / 2);
  shellShape.quadraticCurveTo(-sw / 2, sh / 2, -sw / 2, sh / 2 - radius);
  shellShape.lineTo(-sw / 2, -sh / 2 + radius);
  shellShape.quadraticCurveTo(-sw / 2, -sh / 2, -sw / 2 + radius, -sh / 2);

  const shellGeo = new THREE.ExtrudeGeometry(shellShape, {
    depth: KEYBOARD_D,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.6,
    bevelThickness: 0.6,
    curveSegments: 16,
  });
  shellGeo.translate(0, 0, -KEYBOARD_D / 2 - 0.3);

  const shellMat = new THREE.MeshStandardMaterial({
    color: palette.shell,
    roughness: palette === DARK_PALETTE ? 0.85 : 0.7,
    metalness: palette === DARK_PALETTE ? 0.15 : 0.05,
    emissive: palette.shellEmissive,
    emissiveIntensity: palette.shellEmissiveIntensity,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.castShadow = true;
  shell.receiveShadow = true;
  keyboard.add(shell);

  // 外壳顶部描边
  const topEdgeGeo = new THREE.EdgesGeometry(shellGeo, 30);
  const topEdgeMat = new THREE.LineBasicMaterial({
    color: palette.shellEdge,
    transparent: true,
    opacity: palette === DARK_PALETTE ? 0.4 : 0.55,
  });
  keyboard.add(new THREE.LineSegments(topEdgeGeo, topEdgeMat));

  // 外壳正面顶部高光带
  const highlightGeo = new THREE.PlaneGeometry(KEYBOARD_W - 2, 2);
  const highlightMat = new THREE.MeshBasicMaterial({
    color: palette.shellHighlight,
    transparent: true,
    opacity: palette.shellHighlightOpacity,
  });
  const highlight = new THREE.Mesh(highlightGeo, highlightMat);
  highlight.position.set(0, KEYBOARD_H / 2 - 2, KEYBOARD_D / 2 + 0.32);
  keyboard.add(highlight);

  // ---- LCD 屏幕 -----------------------------------------------
  const screenGroup = new THREE.Group();
  const screenTopY = KEYBOARD_H / 2 - 4;
  const screenCenterY = screenTopY - SCREEN_H / 2;
  screenGroup.position.set(0, screenCenterY, KEYBOARD_D / 2 + 0.31);
  keyboard.add(screenGroup);

  const bezelGeo = new THREE.BoxGeometry(SCREEN_W + 0.8, SCREEN_H + 0.8, 0.4);
  const bezelMat = new THREE.MeshStandardMaterial({
    color: palette.bezel,
    roughness: 0.5,
    metalness: 0.6,
    emissive: palette.bezelEmissive,
    emissiveIntensity: palette.bezelEmissiveIntensity,
  });
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  bezel.position.z = -0.1;
  bezel.receiveShadow = true;
  screenGroup.add(bezel);

  // 屏外蓝色 halo
  const haloGeo = new THREE.PlaneGeometry(SCREEN_W * 1.15, SCREEN_H * 1.4);
  const haloMat = new THREE.MeshBasicMaterial({
    color: palette.haloColor,
    transparent: true,
    opacity: palette.haloOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.z = -0.2;
  screenGroup.add(halo);

  const screenApi = makeScreenTexture(palette);
  const screenGeo = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H);
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenApi.texture,
    emissive: 0xffffff,
    emissiveMap: screenApi.texture,
    emissiveIntensity: 1.0,
    roughness: 0.15,
    metalness: 0.0,
  });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.z = 0.11;
  screenGroup.add(screenMesh);

  // ---- 按键矩阵 -----------------------------------------------
  const keysGroup = new THREE.Group();
  const keysTop = KEYBOARD_H / 2 - 4 - SCREEN_H - KEYS_TOP_OFFSET;
  const keysBottom = -KEYBOARD_H / 2 + KEYS_BOTTOM_OFFSET;
  const keysCenterY = (keysTop + keysBottom) / 2;
  keysGroup.position.set(0, keysCenterY, KEYBOARD_D / 2 + 0.31);
  keyboard.add(keysGroup);

  // 按键槽
  const slotGeo = new THREE.BoxGeometry(KEYS_AREA_W + 0.4, KEYS_AREA_H + 0.4, 0.4);
  const slotMat = new THREE.MeshStandardMaterial({
    color: palette.slot,
    roughness: 0.7,
    metalness: 0.2,
  });
  const slot = new THREE.Mesh(slotGeo, slotMat);
  slot.position.set(0, 0, -0.1);
  slot.receiveShadow = true;
  keysGroup.add(slot);

  const keys: KeyInfo[] = [];
  // 按键材质
  const keyMat = new THREE.MeshStandardMaterial({
    color: palette.key,
    roughness: palette === DARK_PALETTE ? 0.55 : 0.5,
    metalness: palette === DARK_PALETTE ? 0.2 : 0.05,
    emissive: palette.keyEmissive,
    emissiveIntensity: palette.keyEmissiveIntensity,
  });
  /** RGB 高亮材质 */
  const rgbMat = new THREE.MeshStandardMaterial({
    color: palette.rgbColor,
    emissive: palette.rgbColor,
    emissiveIntensity: 0.7,
    roughness: 0.4,
    metalness: 0.0,
  });

  // 旋钮容器(用于旋转动画)
  let knobGroup: THREE.Group | null = null;
  let knobIndicator: THREE.Mesh | null = null;
  let knobIndicatorBaseZ = 0;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const label = KEY_LABELS[row][col];
      const isEncoder = row === 0 && col === 3;
      const x = -KEYS_AREA_W / 2 + KEY_W / 2 + col * (KEY_W + KEY_GAP);
      const y = KEYS_AREA_H / 2 - KEY_H / 2 - row * (KEY_H + KEY_GAP);

      if (isEncoder) {
        knobGroup = new THREE.Group();
        knobGroup.position.set(x, y, 0);

        // 底座环
        const baseRing = new THREE.Mesh(
          new THREE.CylinderGeometry(KNOB_RADIUS + 0.6, KNOB_RADIUS + 0.8, 1.4, 48),
          new THREE.MeshStandardMaterial({
            color: palette.knobRing,
            roughness: 0.55,
            metalness: 0.6,
          }),
        );
        baseRing.rotation.x = Math.PI / 2;
        baseRing.position.z = 0.7;
        baseRing.castShadow = true;
        baseRing.receiveShadow = true;
        knobGroup.add(baseRing);

        // 旋钮主体
        const knobBody = new THREE.Mesh(
          new THREE.CylinderGeometry(KNOB_RADIUS, KNOB_RADIUS, KNOB_HEIGHT, 48),
          new THREE.MeshStandardMaterial({
            color: palette.knobBody,
            roughness: 0.5,
            metalness: palette === DARK_PALETTE ? 0.55 : 0.25,
            emissive: palette.knobBodyEmissive,
            emissiveIntensity: palette.knobBodyEmissiveIntensity,
          }),
        );
        knobBody.rotation.x = Math.PI / 2;
        knobBody.position.z = 0.7 + KNOB_HEIGHT / 2 + 0.7;
        knobBody.castShadow = true;
        knobGroup.add(knobBody);

        // 旋钮顶面
        const knobTop = new THREE.Mesh(
          new THREE.CylinderGeometry(KNOB_RADIUS * 0.92, KNOB_RADIUS * 0.92, 0.4, 48),
          new THREE.MeshStandardMaterial({
            color: palette.knobTop,
            roughness: 0.45,
            metalness: palette === DARK_PALETTE ? 0.55 : 0.2,
          }),
        );
        knobTop.rotation.x = Math.PI / 2;
        knobTop.position.z = 0.7 + KNOB_HEIGHT + 0.9;
        knobGroup.add(knobTop);

        // dashed 环
        const dashedPts: THREE.Vector3[] = [];
        const dashedSegs = 48;
        for (let i = 0; i <= dashedSegs; i++) {
          const a = (i / dashedSegs) * Math.PI * 2;
          dashedPts.push(
            new THREE.Vector3(
              Math.cos(a) * KNOB_RADIUS * 0.84,
              Math.sin(a) * KNOB_RADIUS * 0.84,
              0,
            ),
          );
        }
        const dashedGeo = new THREE.BufferGeometry().setFromPoints(dashedPts);
        const dashedMat = new THREE.LineDashedMaterial({
          color: palette.knobDashed,
          dashSize: 0.6,
          gapSize: 0.4,
          transparent: true,
          opacity: palette.knobDashedOpacity,
        });
        const dashedLine = new THREE.Line(dashedGeo, dashedMat);
        dashedLine.computeLineDistances();
        dashedLine.position.z = 0.7 + KNOB_HEIGHT + 1.05;
        knobGroup.add(dashedLine);

        // 旋钮顶部高光 overlay
        const knobHighlightGeo = new THREE.CircleGeometry(
          KNOB_RADIUS * 0.95,
          48,
        );
        const knobHighlightMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: palette.knobHighlightOpacity,
          depthWrite: false,
        });
        const knobHighlight = new THREE.Mesh(
          knobHighlightGeo,
          knobHighlightMat,
        );
        knobHighlight.position.z = 0.7 + KNOB_HEIGHT + 1.11;
        knobGroup.add(knobHighlight);

        // 指示条
        knobIndicator = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, KNOB_RADIUS * 0.78, 0.35),
          new THREE.MeshStandardMaterial({
            color: palette.knobIndicatorColor,
            emissive: palette.knobIndicatorEmissive,
            emissiveIntensity: 0.9,
            roughness: 0.3,
            metalness: 0.0,
          }),
        );
        knobIndicator.position.set(0, KNOB_RADIUS * 0.55, 0.7 + KNOB_HEIGHT + 1.15);
        knobIndicatorBaseZ = knobIndicator.position.z;
        knobGroup.add(knobIndicator);

        // 滚花
        const knurlMat = new THREE.MeshStandardMaterial({
          color: palette.knobKnurl,
          roughness: 0.55,
          metalness: 0.6,
        });
        const knurlCount = 28;
        for (let i = 0; i < knurlCount; i++) {
          const a = (i / knurlCount) * Math.PI * 2;
          const knurl = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.7, KNOB_HEIGHT * 0.9),
            knurlMat,
          );
          knurl.position.set(
            Math.cos(a) * (KNOB_RADIUS + 0.05),
            Math.sin(a) * (KNOB_RADIUS + 0.05),
            0.7 + KNOB_HEIGHT / 2 + 0.7,
          );
          knurl.rotation.z = a;
          knobGroup.add(knurl);
        }

        keysGroup.add(knobGroup);
        keys.push({
          mesh: knobTop,
          baseZ: knobTop.position.z,
          isEncoder: true,
          isPressed: false,
          row,
          col,
          label: null,
        });

        // ENC 文字标签
        const labelTex = makeLabelTexture("ENC", palette.label);
        const labelSprite = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: labelTex, transparent: true, opacity: 0.0 }),
        );
        labelSprite.scale.set(KEY_W * 0.5, KEY_W * 0.5, 1);
        labelSprite.position.set(x, y - KEY_H * 0.42, 0.1);
        keysGroup.add(labelSprite);
      } else {
        const keyMesh = new THREE.Mesh(keycapGeo, keyMat);
        keyMesh.scale.set(KEY_W * 0.92, KEY_H * 0.92, 1);
        keyMesh.position.set(x, y, -0.3);
        keyMesh.castShadow = true;
        keyMesh.receiveShadow = true;
        keysGroup.add(keyMesh);

        keys.push({
          mesh: keyMesh,
          baseZ: -0.3,
          isEncoder: false,
          isPressed: false,
          row,
          col,
          label,
        });

        // 数字标签
        if (label) {
          const labelTex = makeLabelTexture(label, palette.label);
          const labelSprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: labelTex, transparent: true }),
          );
          const scale = Math.min(KEY_W, KEY_H) * 0.42;
          labelSprite.scale.set(scale, scale, 1);
          labelSprite.position.set(x, y, KEY_HEIGHT + 0.3);
          keysGroup.add(labelSprite);
        }
      }
    }
  }

  // ---- 状态 ----------------------------------------------------
  let currentFeature: FeatureId = 0;
  let knobTargetRotation = 0;
  let knobCurrentRotation = 0;
  let onUserFeatureChange: ((id: FeatureId) => void) | null = null;
  const pressableTargets: THREE.Object3D[] = [];
  keys.forEach((k) => {
    if (k.isEncoder) {
      const parent = k.mesh.parent;
      if (parent) pressableTargets.push(parent);
    } else {
      pressableTargets.push(k.mesh);
    }
  });

  function setFeature(next: FeatureId) {
    currentFeature = next;
    const feat = FEATURES[next];
    screenApi.setText(feat.screenText);
    screenApi.setRecDot(next === 3);

    knobTargetRotation = THREE.MathUtils.degToRad(feat.knobAngle);

    const wantRgb = next === 2;
    keys.forEach((k) => {
      if (k.isEncoder) return;
      k.mesh.material = wantRgb ? rgbMat : keyMat;
    });
  }

  function pressKey(k: KeyInfo) {
    if (k.isPressed) return;
    k.isPressed = true;
    if (k.isEncoder) {
      const g = k.mesh.parent;
      if (g) {
        g.userData.baseZ = g.position.z;
        g.position.z -= 0.5;
      }
    } else {
      k.mesh.position.z = k.baseZ - 0.6;
    }
  }
  function releaseKey(k: KeyInfo) {
    if (!k.isPressed) return;
    k.isPressed = false;
    if (k.isEncoder) {
      const g = k.mesh.parent;
      if (g) g.position.z = g.userData.baseZ ?? 0;
    } else {
      k.mesh.position.z = k.baseZ;
    }
  }

  // ---- 鼠标交互 -----------------------------------------------
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  // 摆正后的初始角度:
  // - yaw ≈ 0(正面对齐,几乎不偏航)
  // - pitch ≈ 0.18(轻微俯视,符合"放在桌上"的视角)
  // - camDistance 保持 230,FOV 36 度刚好框住 80x93 的键盘
  let yaw = 0;
  let pitch = 0.18;
  let targetYaw = yaw;
  let targetPitch = pitch;
  let camDistance = 230;

  function onPointerDown(e: PointerEvent) {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    targetYaw += -dx * 0.008;
    targetPitch += dy * 0.006;
    targetPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, targetPitch));
  }
  function onPointerUp(e: PointerEvent) {
    isDragging = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    camDistance += e.deltaY * 0.15;
    camDistance = Math.max(160, Math.min(540, camDistance));
  }

  const dom = renderer.domElement;
  dom.addEventListener("pointerdown", onPointerDown);
  dom.addEventListener("pointermove", onPointerMove);
  dom.addEventListener("pointerup", onPointerUp);
  dom.addEventListener("pointerleave", onPointerUp);
  dom.addEventListener("wheel", onWheel, { passive: false });

  // ---- Raycaster ----------------------------------------------
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const pendingTimers: number[] = [];

  function onClick(e: MouseEvent) {
    const rect = dom.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pressableTargets, true);
    if (hits.length === 0) return;
    const obj = hits[0].object;

    const k = keys.find((kk) =>
      kk.isEncoder ? obj.parent === kk.mesh.parent : obj === kk.mesh,
    );
    if (!k) return;

    pressKey(k);
    pendingTimers.push(window.setTimeout(() => releaseKey(k!), 200));

    if (k.isEncoder) {
      const next = ((currentFeature + 1) % FEATURES.length) as FeatureId;
      setFeature(next);
      // 通知外部更新 activeFeature,保持 3D 屏幕文字 / 旋钮 / UI 指示点同步
      onUserFeatureChange?.(next);
    } else if (k.label) {
      const fIdx = currentFeature;
      const mapping = mockMapping(fIdx, k.label);
      screenApi.setText(`${k.label} -> ${mapping}`);
      const restoreText = FEATURES[fIdx].screenText;
      pendingTimers.push(
        window.setTimeout(() => {
          screenApi.setText(restoreText);
          screenApi.setRecDot(fIdx === 3);
        }, 1500),
      );
    }
  }
  dom.addEventListener("click", onClick);

  // ---- Resize -------------------------------------------------
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  onResize();
  const ro = new ResizeObserver(onResize);
  ro.observe(container);

  // ---- Animation loop -----------------------------------------
  const clock = new THREE.Clock();
  let rafId = 0;
  function animate() {
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();

    yaw += (targetYaw - yaw) * 0.12;
    pitch += (targetPitch - pitch) * 0.12;
    const cx = Math.sin(yaw) * Math.cos(pitch) * camDistance;
    const cy = Math.sin(pitch) * camDistance;
    const cz = Math.cos(yaw) * Math.cos(pitch) * camDistance;
    // 摆正后去掉 +30 偏移,相机正前方对准键盘中心,
    // 模型在画面里水平居中、垂直居中(略偏上是透视自然结果)。
    camera.position.set(cx, cy, cz);
    camera.lookAt(0, 0, 0);

    screenMat.emissiveIntensity = 0.7 + Math.sin(t * 1.4) * 0.08;

    // 旋钮平滑旋转到目标角度
    knobCurrentRotation += (knobTargetRotation - knobCurrentRotation) * 0.12;
    if (knobGroup) {
      knobGroup.rotation.z = knobCurrentRotation;
      if (knobIndicator) {
        const angle = knobCurrentRotation;
        const r = KNOB_RADIUS * 0.61;
        const lx = Math.sin(angle) * r;
        const ly = Math.cos(angle) * r;
        const g = knobGroup;
        const gz = g.position.z;
        knobIndicator.position.set(lx, ly, knobIndicatorBaseZ + gz);
        knobIndicator.rotation.z = -angle;
      }
    }

    // 按键轻微浮动
    keys.forEach((k, i) => {
      if (k.isPressed || k.isEncoder) return;
      const phase = i * 1.7;
      const float = Math.sin(t * 1.4 + phase) * 0.08;
      k.mesh.position.z = k.baseZ + float;
    });

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }

  // 初始化
  setFeature(0);
  animate();

  // ---- 句柄:外部可驱动屏幕文字 / 旋钮角度 / RGB 切换 --------
  return {
    setFeature(next: FeatureId) {
      setFeature(next);
    },
    setOnUserFeatureChange(cb: ((id: FeatureId) => void) | null) {
      onUserFeatureChange = cb;
    },
    // ---- Cleanup ------------------------------------------------
    dispose() {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      pendingTimers.forEach((id) => window.clearTimeout(id));
      pendingTimers.length = 0;
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointermove", onPointerMove);
      dom.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("pointerleave", onPointerUp);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("click", onClick);
      screenApi.texture.dispose();
      // 主题切换时会构建新场景,旧场景的标签纹理会在新场景里重建
      Object.values(labelCanvasCache).forEach((t) => t.dispose());
      for (const k of Object.keys(labelCanvasCache)) {
        delete labelCanvasCache[k];
      }
      if (scene.background instanceof THREE.Texture) {
        scene.background.dispose();
        scene.background = null;
      }
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry && mesh.geometry !== keycapGeo) {
          mesh.geometry.dispose();
        }
        const mat = mesh.material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
      keycapGeo.dispose();
      renderer.dispose();
      if (dom.parentElement) dom.parentElement.removeChild(dom);
    },
  };
}

// ---------- 模拟按键映射 ----------
function mockMapping(feature: FeatureId, label: string): string {
  const n = parseInt(label, 10);
  const profiles: Record<number, string> = {
    1: "F1",
    2: "F2",
    3: "F3",
    4: "ESC",
    5: "TAB",
    6: "SPC",
    7: "Ctrl+C",
    8: "Shift",
    9: "Ctrl",
    10: "Alt",
    11: "Cmd",
  };
  const mapping = profiles[n] ?? "MACRO";
  const prefix =
    feature === 0
      ? `P${(n % 8) + 1}`
      : feature === 1
        ? "KEY"
        : feature === 2
          ? "RGB"
          : feature === 3
            ? "ASR"
            : "APP";
  return `${prefix} ${mapping}`;
}