import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useI18n } from "../i18n/useI18n.tsx";
import keycapUrl from "../stls/keycap_zzz01.stl?url";

/* ============================================================
   Keyboard3D — Three.js 3D 模型展示组件
   - 键盘整体：宽 80cm × 高 93cm × 厚 18cm
   - 正面：上部 428:124 LCD 屏, 下部 3×4 按键矩阵(右下角为旋钮)
   - 按键的实体形状来自 src/stls/keycap_zzz01.stl
   - 单位约定：场景中使用 cm 与 Three.js 单位 1:1,
     相机与光照按 cm 尺度调校。
   ============================================================ */

const KEYBOARD_W = 80;
const KEYBOARD_H = 93;
const KEYBOARD_D = 18;

// 屏幕宽高按 428:124 比例, 占满键盘宽度的内边距内
const SCREEN_RATIO_W = 428;
const SCREEN_RATIO_H = 124;
const SCREEN_W = KEYBOARD_W - 8; // 左右各留 4cm 边距
const SCREEN_H = (SCREEN_W * SCREEN_RATIO_H) / SCREEN_RATIO_W; // ≈ 21.2cm

// 按键区域
const KEYS_TOP_OFFSET = 6; // 距顶(屏幕下方)留 6cm
const KEYS_BOTTOM_OFFSET = 6; // 距底留 6cm
const KEYS_SIDE_OFFSET = 6; // 左右各留 6cm
const KEYS_AREA_LEFT = KEYS_SIDE_OFFSET;
const KEYS_AREA_RIGHT = KEYBOARD_W - KEYS_SIDE_OFFSET;
const KEYS_AREA_W = KEYS_AREA_RIGHT - KEYS_AREA_LEFT;
const KEYS_AREA_H =
  KEYBOARD_H - SCREEN_H - KEYS_TOP_OFFSET * 2 - KEYS_BOTTOM_OFFSET;

const COLS = 4;
const ROWS = 3;
const KEY_GAP = 2.2; // 按键间隙 cm
const KEY_W = (KEYS_AREA_W - KEY_GAP * (COLS - 1)) / COLS; // ≈ 15.95cm
const KEY_H = (KEYS_AREA_H - KEY_GAP * (ROWS - 1)) / ROWS; // ≈ 23.27cm
const KEY_HEIGHT = 5.5; // 按键高出面板的厚度 (cm, 程序化预留)

// 旋钮参数 (位于第一行第四列, 即 row=0, col=3)
const KNOB_RADIUS = (Math.min(KEY_W, KEY_H) * 0.42);
const KNOB_HEIGHT = 6;

// 旋钮整圈占比与底部凸缘
const KEY_LABELS: string[][] = [
  ["F1", "F2", "F3", "ENC"],
  ["ESC", "TAB", "SPC", "↵"],
  ["⇧", "CTL", "OPT", "CMD"],
];

// ---------- LCD 屏幕内容(像素纹理) ----------
function makeScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 856;
  canvas.height = 248;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#0a1a14");
  grad.addColorStop(1, "#031008");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#000";
  for (let y = 0; y < canvas.height; y += 3) {
    ctx.fillRect(0, y, canvas.width, 1);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#ff5722";
  ctx.fillRect(0, 0, canvas.width, 4);
  ctx.fillStyle = "#1e2a26";
  ctx.fillRect(0, 4, canvas.width, 28);

  ctx.font = "bold 16px JetBrains Mono, monospace";
  ctx.fillStyle = "#ff8a5b";
  ctx.fillText("● REC", 16, 24);
  ctx.fillStyle = "#7adfb2";
  ctx.textAlign = "right";
  ctx.fillText("EKeys · v1.2", canvas.width - 16, 24);
  ctx.textAlign = "left";

  ctx.strokeStyle = "#34d399";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const baseY = 110;
  const amp = 36;
  for (let x = 16; x < canvas.width - 16; x += 1) {
    const t = x * 0.025;
    const y =
      baseY +
      Math.sin(t) * amp * 0.6 +
      Math.sin(t * 2.7 + 1.1) * amp * 0.25 +
      Math.sin(t * 5.3 + 2.0) * amp * 0.12;
    if (x === 16) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = "rgba(52, 211, 153, 0.25)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(16, baseY);
  ctx.lineTo(canvas.width - 16, baseY);
  ctx.stroke();
  ctx.setLineDash([]);

  const barCount = 24;
  const barAreaX = 16;
  const barAreaY = 160;
  const barAreaW = canvas.width - 32;
  const barAreaH = 56;
  const barW = barAreaW / barCount - 3;
  for (let i = 0; i < barCount; i++) {
    const v =
      Math.abs(
        Math.sin(i * 0.7) * 0.7 +
          Math.sin(i * 1.6 + 0.4) * 0.3 +
          Math.cos(i * 2.3 + 1.1) * 0.2,
      ) * 0.9 +
      0.1;
    const h = v * barAreaH;
    const hue = 150 - i * 2;
    ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;
    ctx.fillRect(
      barAreaX + i * (barW + 3),
      barAreaY + barAreaH - h,
      barW,
      h,
    );
  }

  ctx.font = "bold 14px JetBrains Mono, monospace";
  ctx.fillStyle = "#ffd166";
  ctx.fillText("VOL 64", 16, canvas.height - 10);
  ctx.fillStyle = "#5eead4";
  ctx.fillText("CH 01/04", 160, canvas.height - 10);
  ctx.fillStyle = "#f472b6";
  ctx.fillText("44.1kHz", 300, canvas.height - 10);
  ctx.fillStyle = "#a78bfa";
  ctx.fillText("128kbps", 440, canvas.height - 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ---------- 旋钮旋转提示弧线 (纯线条, 不带箭头) ----------
// 用 BufferGeometry 画一段圆弧线条, 中心锚点在弧线圆心(原点)。
// direction 控制弧线扫过的方向:
//   +1 = 右半弧, 顺时针(右上 → 右下), 视觉走向"从上→下";
//   -1 = 左半弧, 逆时针(左下 → 左上), 视觉走向"从下→上"。
// 弧线两端各留一段小空隙(15°), 不会穿过旋钮本体, 看起来像独立的"C"形指示。
function makeArcIndicator(direction: -1 | 1): THREE.Line {
  const R = 1.0;
  const steps = 48;
  // 视觉顺时针: θ 数值减小; 但右弧和左弧起止不同
  //   right (direction=+1): sA=35, eA=-35, stepDir=-1
  //   left  (direction=-1): sA=-145, eA=-215(绕远经过 180°), stepDir=-1
  const sA = direction > 0 ? 35 : -145;
  const stepDir = -1;
  const arcSpan = 70;

  const norm = (deg: number) => {
    let d = deg;
    while (d > 180) d -= 360;
    while (d <= -180) d += 360;
    return d;
  };

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const aDeg = norm(sA + stepDir * arcSpan * t);
    const a = THREE.MathUtils.degToRad(aDeg);
    points.push(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: 0xff8a5b,
    transparent: true,
    opacity: 0.9,
    linewidth: 2, // 注: 大多数 WebGL 实现忽略此值, 实际宽度由 fragment shader 决定
  });
  return new THREE.Line(geo, mat);
}

// ---------- 按键标签纹理 ----------
const labelCanvasCache: Record<string, THREE.CanvasTexture> = {};
function makeLabelTexture(
  text: string,
  theme: "light" | "dark",
): THREE.CanvasTexture {
  // 键帽颜色在浅色主题下是深色, 在深色主题下是浅色, 所以标签字色反过来
  const color = theme === "dark" ? "#1a1a1a" : "#f5f3ee";
  const cacheKey = `${theme}-${text}`;
  if (labelCanvasCache[cacheKey]) return labelCanvasCache[cacheKey];
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

// ---------- 加载并预处理 STL 键帽几何 ----------
// 原始 STL 包围盒 (mm): 18 × 19.4 × 10.7 (W × D × H), 中心在 (125.96, 90, 5.35).
// 我们把它: 1) 中心化; 2) 翻正(让顶面 +Y 朝外); 3) 按比例缩放到与按键槽吻合。
async function loadKeycapGeometry(): Promise<THREE.BufferGeometry> {
  const loader = new STLLoader();
  const geometry = await loader.loadAsync(keycapUrl);
  geometry.center();
  // 原 STL 的高度在 Z, 我们场景里键帽高度沿 Z。
  // 包围盒计算后:
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const size = new THREE.Vector3();
  bb.getSize(size);
  // 原 STL 是 18×19.4×10.7 (mm), 接近方形。
  // 缩放到 KEY_W × KEY_H × KEY_HEIGHT(cm) 范围内的合适大小。
  // 这里希望键帽顶面与 KEY_HEIGHT 相当, 底面再坐下去一点(凸出于面板)。
  // 计算缩放比例: XY 取小的等比缩放(保证键帽不超出槽), Z 单独缩放控制高度。
  const targetW = KEY_W * 0.92; // 比槽略小一圈, 留出 KEY_GAP 视觉感
  const targetD = KEY_H * 0.92;
  const targetH = KEY_HEIGHT * 1.1; // 顶面比按键厚略高一点, 放大键帽高度
  const scaleX = targetW / size.x;
  const scaleY = targetD / size.y;
  const scaleZ = targetH / size.z;
  // XY 取最小等比, Z 单独, 让 XY 真正适配按键槽
  const xyScale = Math.min(scaleX, scaleY);
  geometry.scale(xyScale, xyScale, scaleZ);
  // 重新居中并让底面落在 z=0
  geometry.computeBoundingBox();
  geometry.translate(
    -(geometry.boundingBox!.min.x + geometry.boundingBox!.max.x) / 2,
    -(geometry.boundingBox!.min.y + geometry.boundingBox!.max.y) / 2,
    -geometry.boundingBox!.min.z,
  );
  geometry.computeVertexNormals();
  return geometry;
}

// =================== 主组件 ===================
// 视角预设名 — UI 按钮按这个名字调用
export type CameraView = "threeQuarter" | "front" | "top" | "side";

export default function Keyboard3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useI18n();
  const applyPresetRef = useRef<((v: CameraView) => void) | null>(null);
  const [activeView, setActiveView] = useState<CameraView>("front");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cleanup: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        const keycapGeo = await loadKeycapGeometry();
        if (cancelled) {
          keycapGeo.dispose();
          return;
        }
        const result = buildScene(container, theme, keycapGeo);
        cleanup = result.cleanup;
        applyPresetRef.current = (v: CameraView) => {
          result.applyPreset(v);
          setActiveView(v);
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[Keyboard3D] failed to load keycap STL:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [theme]);

  // 当用户拖拽后, 标记为 free; 通过 wrap 让按钮态跟随
  const onViewClick = (v: CameraView) => {
    applyPresetRef.current?.(v);
  };

  return (
    <div className="kbd3d">
      <div className="kbd3d__canvas" ref={containerRef} />
      <div className="kbd3d__views" role="tablist" aria-label="camera view">
        {(
          [
            ["threeQuarter", "3 / 4"],
            ["front", "FRONT"],
            ["top", "TOP"],
            ["side", "SIDE"],
          ] as [CameraView, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={activeView === v}
            className={
              "kbd3d__view-btn" +
              (activeView === v ? " kbd3d__view-btn--active" : "")
            }
            onClick={() => onViewClick(v)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="kbd3d__hint">
        <span>DRAG · ROTATE</span>
        <span>SCROLL · ZOOM</span>
        <span>CLICK · PRESS KEY / KNOB</span>
      </div>
      <div className="kbd3d__legend">
        <div className="kbd3d__legend-row">
          <span className="kbd3d__chip">80 cm</span>
          <span className="kbd3d__legend-label">WIDTH</span>
        </div>
        <div className="kbd3d__legend-row">
          <span className="kbd3d__chip">93 cm</span>
          <span className="kbd3d__legend-label">HEIGHT</span>
        </div>
        <div className="kbd3d__legend-row">
          <span className="kbd3d__chip">18 cm</span>
          <span className="kbd3d__legend-label">DEPTH</span>
        </div>
        <div className="kbd3d__legend-row">
          <span className="kbd3d__chip">428 : 124</span>
          <span className="kbd3d__legend-label">LCD</span>
        </div>
        <div className="kbd3d__legend-row">
          <span className="kbd3d__chip">3 × 4</span>
          <span className="kbd3d__legend-label">KEYS</span>
        </div>
      </div>
    </div>
  );
}

// =============== 场景构建(同步) ===============
type KeyInfo = {
  mesh: THREE.Mesh;
  baseZ: number;
  isEncoder: boolean;
  isPressed: boolean;
};

function buildScene(
  container: HTMLDivElement,
  theme: "light" | "dark",
  keycapGeo: THREE.BufferGeometry,
): { cleanup: () => void; applyPreset: (v: string) => void } {
  const isDark = theme === "dark";

  // ---- Renderer --------------------------------------------------
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
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

  // ---- 闭包状态 (供后续动画/交互使用) ----------------------------
  let knobGroupSpin: THREE.Group | null = null;
  const knobArrows: THREE.Line[] = [];

  // ---- Scene & Camera -------------------------------------------
  const scene = new THREE.Scene();
  // 用渐变天空做背景 — 与主题 token 协调, 顶部冷色, 底部暖色,
  // 让任何朝向的键盘都能从背景里跳出来, 但饱和度更低, 不抢戏。
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = 2;
  bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext("2d")!;
  const bgGrad = bgCtx.createLinearGradient(0, 0, 0, 512);
  if (isDark) {
    // 深色: 顶部稍冷的深蓝灰, 底部略微带暖的中性灰,
    // 整体压低饱和度避免与外壳橙色高光打架
    bgGrad.addColorStop(0, "#161a26");
    bgGrad.addColorStop(0.55, "#0e1014");
    bgGrad.addColorStop(1, "#1c1410");
  } else {
    // 浅色: 顶部冷灰蓝, 底部米白偏暖, 营造柔和摄影棚感
    bgGrad.addColorStop(0, "#e6eaf2");
    bgGrad.addColorStop(0.55, "#efebe2");
    bgGrad.addColorStop(1, "#f3e3d2");
  }
  bgCtx.fillStyle = bgGrad;
  bgCtx.fillRect(0, 0, 2, 512);
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = bgTex;

  // ---- 环境贴图 (PBR 反射) --------------------------------------
  // 用 RoomEnvironment 生成程序化室内场景作为反射源,
  // 让金属外壳/旋钮/键槽出现真实的高光层次, 避免发黑发闷。
  // 暗主题下反射弱一些, 保持深邃感; 亮主题下稍强, 提升质感。
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const envRT = pmremGenerator.fromScene(envScene, 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = isDark ? 0.45 : 0.65;
  envScene.dispose?.();
  pmremGenerator.dispose();

  // FOV 从 35 降到 32, 减少透视畸变, 让键盘看起来更"产品图"而非广角;
  // 近裁面 0.5 防止近距离交互时键盘面被裁掉。
  const camera = new THREE.PerspectiveCamera(
    32,
    container.clientWidth / container.clientHeight,
    0.5,
    2000,
  );
  // 3/4 视角: 略偏右上, 仰角 -10°, 起始距离拉远以让键盘在画面中更小。
  // yaw≈-0.55rad(右前), pitch≈-0.18rad(略俯视), 距离 240cm。
  camera.position.set(160, 88, 220);
  camera.lookAt(0, 10, 0);

  // ---- Lighting --------------------------------------------------
  // 半球光替代纯环境光: 天空冷色 / 地面暖色, 明暗过渡更自然,
  // 键盘顶面带一点冷调、底面带一点暖调, 接近真实摄影棚环境光。
  scene.add(
    new THREE.HemisphereLight(0xdfe8ff, 0x9a8570, isDark ? 0.55 : 0.8),
  );

  // 主光: 关键光, 模拟摄影棚前顶光, 略微加暖让米色外壳更润,
  // 强度提升保证阴影有足够对比, 让键帽的立体感更强
  const keyLight = new THREE.DirectionalLight(0xfff2e6, 1.35);
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
  keyLight.shadow.radius = 6; // 更软的阴影
  keyLight.shadow.normalBias = 0.5; // 消除薄面板上的阴影痤疮
  scene.add(keyLight);

  // 暖色轮廓光: 背后左上方, 给顶面 / 后侧边缘加暖色镶边,
  // 与暗主题背景呼应; 提升强度让边缘高光更清晰
  const rimLight = new THREE.DirectionalLight(0xff8a5b, 0.6);
  rimLight.position.set(-90, 160, -100);
  scene.add(rimLight);

  // 冷色补光: 相机对侧 (左前), 给键盘左侧阴影面柔和冷色补光
  const fillLight = new THREE.DirectionalLight(0x88aaff, 0.4);
  fillLight.position.set(-100, 90, 140);
  scene.add(fillLight);

  // 顶部柔光: 让键帽顶面在两个主题下都有均匀的高光, 模拟产品摄影的柔光箱
  const topFill = new THREE.DirectionalLight(0xffffff, 0.35);
  topFill.position.set(0, 220, 0);
  scene.add(topFill);

  // ---- 整体舞台 (键盘 + 展台统一 Y 偏移) --------------------
  const stage = new THREE.Group();
  const STAGE_Y_OFFSET = -30; // 整体 Y 下移量 (cm), 改这个就能上下移动舞台
  stage.position.y = STAGE_Y_OFFSET;
  scene.add(stage);

  // ---- Ground (圆形展台) ------------------------------------
  // 转盘颜色比键盘外壳明显更暗, 形成"深底盘"对比, 让键盘主体从展台上跳出来。
  // 浅色主题: 深暖灰(比外壳 #c9c2b3 深一档);
  // 深色主题: 接近全黑(比外壳 #1c1f26 更暗), 强化阴影层次。
  const groundGeo = new THREE.CircleGeometry(220, 64);
  const groundMat = new THREE.MeshStandardMaterial({
    color: isDark ? 0x0a0c12 : 0x4a463d,
    roughness: isDark ? 0.8 : 0.85,
    metalness: isDark ? 0.05 : 0.1,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -KEYBOARD_D / 2 - 0.05;
  ground.receiveShadow = true;
  stage.add(ground);

  // 在展台上加一圈 ring 让底盘更明显 — 透明度提升, 不再像一道硬边
  const ringGeo = new THREE.RingGeometry(150, 158, 96);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff5722,
    transparent: true,
    opacity: isDark ? 0.55 : 0.4,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -KEYBOARD_D / 2 - 0.04;
  stage.add(ring);

  // ---- Keyboard group -------------------------------------------
  const keyboard = new THREE.Group();
  keyboard.position.y = KEYBOARD_D / 2 + 0.3 + 30;
  stage.add(keyboard);

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
    // 外壳: 浅色主题用偏暖灰米色 (深一档), 与键帽形成层次;
    // 深色主题金属度略降, 配合环境贴图让反光柔和有层次而非死黑
    color: isDark ? 0x1c1f26 : 0xc9c2b3,
    roughness: isDark ? 0.35 : 0.45,
    metalness: isDark ? 0.55 : 0.3,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.castShadow = true;
  shell.receiveShadow = true;
  keyboard.add(shell);

  // 边框描边 (LineSegments 模拟描边, 凸显外形) — 透明度提高, 颜色与主题协调
  const edgesGeo = new THREE.EdgesGeometry(shellGeo, 30);
  const edgesMat = new THREE.LineBasicMaterial({
    color: isDark ? 0xff8a5b : 0x4a463d,
    transparent: true,
    opacity: isDark ? 0.4 : 0.5,
  });
  const edges = new THREE.LineSegments(edgesGeo, edgesMat);
  keyboard.add(edges);

  // ---- LCD 屏幕 --------------------------------------------------
  const screenGroup = new THREE.Group();
  const screenTopY = KEYBOARD_H / 2 - 4;
  const screenCenterY = screenTopY - SCREEN_H / 2;
  screenGroup.position.set(0, screenCenterY, KEYBOARD_D / 2 + 0.31);
  keyboard.add(screenGroup);

  const bezelGeo = new THREE.BoxGeometry(SCREEN_W + 0.8, SCREEN_H + 0.8, 0.4);
  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0x050505,
    roughness: 0.4,
    metalness: 0.5,
  });
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  bezel.position.z = -0.1;
  bezel.receiveShadow = true;
  screenGroup.add(bezel);

  const screenTex = makeScreenTexture();
  const screenGeo = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H);
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissive: 0xffffff,
    emissiveMap: screenTex,
    emissiveIntensity: 0.85,
    roughness: 0.25,
    metalness: 0.0,
  });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.z = 0.11;
  screenGroup.add(screenMesh);

  const glassGeo = new THREE.PlaneGeometry(SCREEN_W * 0.95, SCREEN_H * 0.4);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.05,
    roughness: 0.05,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(0, SCREEN_H * 0.2, 0.13);
  screenGroup.add(glass);

  // ---- 按键矩阵 (3 行 × 4 列) -------------------------------
  const keysGroup = new THREE.Group();
  const keysTop = KEYBOARD_H / 2 - 4 - SCREEN_H - KEYS_TOP_OFFSET;
  const keysBottom = -KEYBOARD_H / 2 + KEYS_BOTTOM_OFFSET;
  const keysCenterY = (keysTop + keysBottom) / 2;
  keysGroup.position.set(0, keysCenterY, KEYBOARD_D / 2 + 0.31);
  keyboard.add(keysGroup);

  // 按键槽 — 在面板上挖一个下沉平台, 让键帽看起来嵌在槽里
  const slotGeo = new THREE.BoxGeometry(KEYS_AREA_W + 0.4, KEYS_AREA_H + 0.4, 0.4);
  const slotMat = new THREE.MeshStandardMaterial({
    // 键槽: 两个主题下都比外壳暗一档, 形成"凹陷阴影", 让键帽跳出来
    // 浅色主题下: 深灰米色, 比外壳深 30% 左右
    // 深色主题下: 接近全黑, 强化键帽高光的对比
    color: isDark ? 0x08090c : 0x7a7568,
    roughness: isDark ? 0.55 : 0.6,
    metalness: isDark ? 0.55 : 0.2,
  });
  const slot = new THREE.Mesh(slotGeo, slotMat);
  slot.position.set(0, 0, -0.1);
  slot.receiveShadow = true;
  keysGroup.add(slot);

  const keys: KeyInfo[] = [];
  const keyMat = new THREE.MeshStandardMaterial({
    // 键帽: 比键槽亮、比外壳浅, 形成三层明度梯度:
    // 键槽(深) -> 外壳(中) -> 键帽(亮)
    // 浅色主题: 接近纯白米色; 深色主题: 暖灰
    color: isDark ? 0xd8d3c7 : 0xf7f2e6,
    roughness: 0.7,
    metalness: 0.0,
  });

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const isEncoder = row === 0 && col === 3;
      const x =
        -KEYS_AREA_W / 2 + KEY_W / 2 + col * (KEY_W + KEY_GAP);
      const y = KEYS_AREA_H / 2 - KEY_H / 2 - row * (KEY_H + KEY_GAP);

      if (isEncoder) {
        // 旋钮 — 圆柱 + 顶部指示点
        const knobGroup = new THREE.Group();
        knobGroup.position.set(x, y, 0);

        const baseRing = new THREE.Mesh(
          new THREE.CylinderGeometry(
            KNOB_RADIUS + 0.6,
            KNOB_RADIUS + 0.8,
            1.4,
            48,
          ),
          new THREE.MeshStandardMaterial({
            // 旋钮底座: 浅色主题下与键槽拉开差距(深), 暗主题下保留金属反光
            color: isDark ? 0x16181d : 0x4f4a40,
            roughness: isDark ? 0.32 : 0.5,
            metalness: isDark ? 0.75 : 0.45,
          }),
        );
        baseRing.rotation.x = Math.PI / 2;
        baseRing.position.z = 0.7;
        baseRing.castShadow = true;
        baseRing.receiveShadow = true;
        knobGroup.add(baseRing);

        const knobBodyMat = new THREE.MeshStandardMaterial({
          // 旋钮主体: 两个主题下都用深色, 让顶面的橙色高光更突出
          color: isDark ? 0x1a1a1a : 0x2a2722,
          roughness: 0.4,
          metalness: 0.6,
        });
        const knobBody = new THREE.Mesh(
          new THREE.CylinderGeometry(KNOB_RADIUS, KNOB_RADIUS, KNOB_HEIGHT, 48),
          knobBodyMat,
        );
        knobBody.rotation.x = Math.PI / 2;
        knobBody.position.z = 0.7 + KNOB_HEIGHT / 2 + 0.7;
        knobBody.castShadow = true;
        knobGroup.add(knobBody);

        const knobTopMat = new THREE.MeshStandardMaterial({
          // 旋钮顶面: 用 --accent 同色 (#ff5722), 金属度提高让高光更锐
          color: 0xff5722,
          roughness: 0.3,
          metalness: 0.7,
        });
        const knobTop = new THREE.Mesh(
          new THREE.CylinderGeometry(
            KNOB_RADIUS * 0.92,
            KNOB_RADIUS * 0.92,
            0.4,
            48,
          ),
          knobTopMat,
        );
        knobTop.rotation.x = Math.PI / 2;
        knobTop.position.z = 0.7 + KNOB_HEIGHT + 0.9;
        knobGroup.add(knobTop);

        const indicatorMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 0.6,
          roughness: 0.3,
          metalness: 0.2,
        });
        const indicator = new THREE.Mesh(
          // 长度限制在旋钮直径以内 (略小于 KNOB_RADIUS*1.8)
          new THREE.BoxGeometry(0.6, KNOB_RADIUS * 0.7, 0.3),
          indicatorMat,
        );
        indicator.position.set(
          0,
          KNOB_RADIUS * 0.61, // 中心靠近旋钮轴, 配合缩短的长度保证不超出外缘
          0.7 + KNOB_HEIGHT + 1.1,
        );
        knobGroup.add(indicator);

        const knurlMat = new THREE.MeshStandardMaterial({
          // 滚花: 与主体同色但更暗, 营造立体感
          color: isDark ? 0x2a2a2a : 0x14130f,
          roughness: 0.6,
          metalness: 0.5,
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
        knobGroupSpin = knobGroup;
        keys.push({
          mesh: knobTop,
          baseZ: knobTop.position.z,
          isEncoder: true,
          isPressed: false,
        });

        const labelTex = makeLabelTexture("ENC", theme);
        const labelMat = new THREE.SpriteMaterial({
          map: labelTex,
          transparent: true,
        });
        const labelSprite = new THREE.Sprite(labelMat);
        labelSprite.scale.set(KEY_W * 0.7, KEY_W * 0.7, 1);
        labelSprite.position.set(x, y - KEY_H * 0.42, 0.1);
        labelSprite.visible = false; // 隐藏按键上的文字
        keysGroup.add(labelSprite);

        // ---- 旋钮两侧旋转提示 (纯弧线, 不带箭头) ------------
        // 弧线是一段绕原点的 70° 圆弧(单位半径 1.0), 通过 mesh scale 放到
        // 旋钮外圈(KNOB_RADIUS + 1.4)位置; mesh 中心放在旋钮中心 (x, y)。
        // 挂在 keysGroup 而非 knobGroup, 避免跟着旋钮旋转;
        // 动画循环里同步旋钮按压时的 Z 位移, 让弧线视觉上贴住旋钮。
        // 左侧弧线 = 逆时针(direction=-1), 视觉从屏幕左下扫到左上;
        // 右侧弧线 = 顺时针(direction=+1), 视觉从屏幕右上扫到右下。
        const arcRadius = KNOB_RADIUS + 1.4; // 弧线所在半径
        const arcScale = arcRadius;          // mesh 缩放, 让单位半径 1.0 适配到 arcRadius
        const arcY = y;
        const arcZ = KNOB_HEIGHT + 1.9;

        const leftArc = makeArcIndicator(-1);
        leftArc.scale.set(arcScale, arcScale, 1);
        leftArc.position.set(x, arcY, arcZ);
        leftArc.userData.knobArrowDir = -1;
        leftArc.userData.knobArrowBaseX = leftArc.position.x;
        leftArc.userData.knobArrowBaseZ = arcZ;
        keysGroup.add(leftArc);
        knobArrows.push(leftArc);

        const rightArc = makeArcIndicator(1);
        rightArc.scale.set(arcScale, arcScale, 1);
        rightArc.position.set(x, arcY, arcZ);
        rightArc.userData.knobArrowDir = 1;
        rightArc.userData.knobArrowBaseX = rightArc.position.x;
        rightArc.userData.knobArrowBaseZ = arcZ;
        keysGroup.add(rightArc);
        knobArrows.push(rightArc);
      } else {
        // ---- 使用 STL 键帽 -------------------------------
        // 我们的键帽几何: 顶面 +Z 朝外, 底面在 z=0, XY 居中。
        // 场景里: x=横向槽位, y=纵向槽位, z=面板表面(z=0)。
        // 让键帽底面略微沉入面板下方 0.3cm, 顶部凸出 ~KEY_HEIGHT cm。
        const keyMesh = new THREE.Mesh(keycapGeo, keyMat);
        keyMesh.position.set(x, y, -0.3);
        keyMesh.castShadow = true;
        keyMesh.receiveShadow = true;
        keysGroup.add(keyMesh);

        keys.push({
          mesh: keyMesh,
          baseZ: -0.3,
          isEncoder: false,
          isPressed: false,
        });

        // 按键标签
        const label = KEY_LABELS[row][col];
        const labelTex = makeLabelTexture(label, theme);
        const labelMat = new THREE.SpriteMaterial({
          map: labelTex,
          transparent: true,
        });
        const labelSprite = new THREE.Sprite(labelMat);
        // 标签放到键帽顶面上方一点
        keycapGeo.computeBoundingBox();
        const capH = keycapGeo.boundingBox!.max.z - keycapGeo.boundingBox!.min.z;
        const scale = Math.min(KEY_W, KEY_H) * 0.5;
        labelSprite.scale.set(scale, scale, 1);
        labelSprite.position.set(x, y, capH + 0.3);
        labelSprite.visible = false; // 隐藏按键上的文字
        keysGroup.add(labelSprite);
      }
    }
  }

  // 旋钮主体(用于自转动画)
  let knobMain: THREE.Mesh | null = null;
  keysGroup.traverse((obj) => {
    if (
      obj instanceof THREE.Mesh &&
      obj.geometry instanceof THREE.CylinderGeometry &&
      (obj.geometry as THREE.CylinderGeometry).parameters.height > 5 &&
      obj.material instanceof THREE.MeshStandardMaterial &&
      (obj.material as THREE.MeshStandardMaterial).color.getHex() === 0x1a1a1a
    ) {
      knobMain = obj;
    }
  });

  // ---- 底部品牌字样 -------------------------------
  const brandCanvas = document.createElement("canvas");
  brandCanvas.width = 512;
  brandCanvas.height = 128;
  const bctx = brandCanvas.getContext("2d");
  if (bctx) {
    bctx.fillStyle = isDark ? "#f5f3ee" : "#1a1a1a";
    bctx.font = "bold 56px JetBrains Mono, monospace";
    bctx.textAlign = "center";
    bctx.textBaseline = "middle";
    bctx.fillText("EKeys · 3D VIEW", 256, 64);
  }
  const brandTex = new THREE.CanvasTexture(brandCanvas);
  brandTex.colorSpace = THREE.SRGBColorSpace;
  const brandMat = new THREE.SpriteMaterial({
    map: brandTex,
    transparent: true,
    opacity: 0.5,
  });
  const brandSprite = new THREE.Sprite(brandMat);
  brandSprite.scale.set(KEYBOARD_W * 0.55, KEYBOARD_W * 0.14, 1);
  brandSprite.position.set(0, -KEYBOARD_H / 2 + 2.5, KEYBOARD_D / 2 + 6);
  keyboard.add(brandSprite);

  // ---- 鼠标交互: 拖拽旋转 + 按键/旋钮点击 -----------
  // 相机预设: 每种视角给一组 (yaw, pitch, distance), 切换时平滑插值
  // yaw 0 = 正面朝相机, +π/2 = 键盘右侧朝相机
  // pitch 0 = 水平, +π/2 = 从上方俯视, -π/2 = 从下方仰视
  type CameraPreset = {
    yaw: number;
    pitch: number;
    distance: number;
  };
  const PRESETS: Record<string, CameraPreset> = {
    threeQuarter: { yaw: -0.55, pitch: -0.18, distance: 225 }, // 经典 3/4 角
    front: { yaw: 0, pitch: -0.05, distance: 240 }, // 正面平视
    top: { yaw: 0, pitch: -1.05, distance: 270 }, // 俯视
    side: { yaw: Math.PI / 2 - 0.1, pitch: -0.05, distance: 240 }, // 侧面
  };
  const INITIAL_PRESET = PRESETS.front;

  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let yaw = INITIAL_PRESET.yaw;
  let pitch = INITIAL_PRESET.pitch;
  let targetYaw = INITIAL_PRESET.yaw;
  let targetPitch = INITIAL_PRESET.pitch;
  let camDistance = INITIAL_PRESET.distance;
  let targetCamDistance = INITIAL_PRESET.distance;
  // 用户视角交互状态 — 仅用于高亮当前预设按钮
  let activePreset: keyof typeof PRESETS | "free" = "threeQuarter";

  function markInteract(preset?: keyof typeof PRESETS) {
    if (preset) activePreset = preset;
    else activePreset = "free";
  }

  function applyPreset(name: keyof typeof PRESETS) {
    const p = PRESETS[name];
    if (!p) return;
    targetYaw = p.yaw;
    targetPitch = p.pitch;
    targetCamDistance = p.distance;
    markInteract(name);
  }

  function onPointerDown(e: PointerEvent) {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    markInteract();
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
    targetPitch = Math.max(
      -Math.PI / 2.2,
      Math.min(Math.PI / 2.2, targetPitch),
    );
  }
  function onPointerUp(e: PointerEvent) {
    isDragging = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    targetCamDistance += e.deltaY * 0.15;
    targetCamDistance = Math.max(160, Math.min(540, targetCamDistance));
    markInteract();
  }

  const dom = renderer.domElement;
  dom.addEventListener("pointerdown", onPointerDown);
  dom.addEventListener("pointermove", onPointerMove);
  dom.addEventListener("pointerup", onPointerUp);
  dom.addEventListener("pointerleave", onPointerUp);
  dom.addEventListener("wheel", onWheel, { passive: false });

  // Raycaster
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const pressableTargets: THREE.Object3D[] = [];
  keys.forEach((k) => {
    if (k.isEncoder) {
      const parent = k.mesh.parent;
      if (parent) pressableTargets.push(parent);
    } else {
      pressableTargets.push(k.mesh);
    }
  });
  // 旋钮两侧的旋转提示箭头也算点击目标
  knobArrows.forEach((a) => pressableTargets.push(a));

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

  function onClick(e: MouseEvent) {
    const rect = dom.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pressableTargets, true);
    if (hits.length === 0) return;
    const obj = hits[0].object;

    // 先看是不是点中了旋钮两侧的箭头
    const arrow = knobArrows.find((a) => obj === a);
    if (arrow) {
      // Three.js rotation.z 正值 = 从面板外往里看的逆时针;
      // ▶ 在右侧, 用户期望旋钮顺时针, 所以取反方向
      const dir = -((arrow.userData.knobArrowDir as number) ?? 1);
      encoderSpinTarget += Math.PI * 0.25 * dir;
      // 箭头按压反馈: 短暂外推一下再回弹
      arrow.userData.pressedT = 1;
      return;
    }

    const k = keys.find((kk) =>
      kk.isEncoder ? obj.parent === kk.mesh.parent : obj === kk.mesh,
    );
    if (k) {
      pressKey(k);
      setTimeout(() => releaseKey(k!), 180);
      // 旋钮本体点击不再旋转, 旋转改为点箭头触发
    }
  }
  dom.addEventListener("click", onClick);

  // 旋钮自转 & 入场动画 -----------------------------
  let encoderSpin = 0;
  let encoderSpinTarget = 0;
  let introT = 0;
  const introDuration = 1.2;

  // ---- Resize handler -----------------------------
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

  // ---- Animation loop ------------------------------
  const clock = new THREE.Clock();
  let rafId = 0;
  function animate() {
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();

    if (introT < 1) {
      introT = Math.min(1, introT + dt / introDuration);
      const eased = 1 - Math.pow(1 - introT, 3);
      // 入场: 从更远的距离(180) 推进到当前预设距离, 给一个推镜效果
      const presetDist = INITIAL_PRESET.distance;
      targetCamDistance = presetDist + (180 - presetDist) * (1 - eased);
    }

    // 自动旋转已禁用: 相机只在用户主动交互(拖拽/滚轮/切预设)时改变视角

    yaw += (targetYaw - yaw) * 0.12;
    pitch += (targetPitch - pitch) * 0.12;
    camDistance += (targetCamDistance - camDistance) * 0.1;

    // lookAt 跟随 pitch 微调: pitch 越大(越俯视)目标点越靠下(屏幕底部),
    // 让俯视时键盘不至于飞出画面顶部; pitch 为负(从下方仰视)时目标点抬高。
    // 经验系数 -15 让 ±1 rad 的视角变化让目标点上下浮动 ±15cm。
    const lookY = 10 + Math.sin(pitch) * -15;
    const cx = Math.sin(yaw) * Math.cos(pitch) * camDistance;
    const cy = Math.sin(pitch) * camDistance;
    const cz = Math.cos(yaw) * Math.cos(pitch) * camDistance;
    camera.position.set(cx, cy + 30, cz);
    camera.lookAt(0, lookY, 0);

    screenMat.emissiveIntensity = 0.7 + Math.sin(t * 1.4) * 0.08;

    encoderSpin += (encoderSpinTarget - encoderSpin) * 0.1;
    // 旋钮 group 位于 world Z 轴指向屏幕外, 绕 Z 转 = 绕旋钮自身轴
    if (knobGroupSpin) {
      knobGroupSpin.rotation.z = encoderSpin;
    }

    // 弧线指示: 跟随旋钮按压时的 Z 位移; 按压时透明度脉冲作为视觉反馈
    knobArrows.forEach((arrow) => {
      // 跟随旋钮 group 当前 Z (按压时下沉)
      const knobZ = knobGroupSpin ? knobGroupSpin.position.z : 0;
      const baseZ = (arrow.userData.knobArrowBaseZ as number) ?? arrow.position.z;
      arrow.position.z = baseZ + (knobZ - 0); // 旋钮默认 Z=0

      const pressed = (arrow.userData.pressedT as number) ?? 0;
      if (pressed > 0) {
        const next = Math.max(0, pressed - dt * 4);
        arrow.userData.pressedT = next;
      }
      const p = (arrow.userData.pressedT as number) ?? 0;
      // 按压时透明度从 0.9 脉冲到 1.0 再回弹, 给视觉反馈
      const mat = arrow.material as THREE.LineBasicMaterial;
      mat.opacity = 0.85 + 0.15 * p;
    });

    keys.forEach((k, i) => {
      if (k.isPressed) return;
      if (k.isEncoder) return;
      const phase = i * 1.7;
      const float = Math.sin(t * 1.4 + phase) * 0.18;
      k.mesh.position.z = k.baseZ + float;
    });

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }
  animate();

  // ---- Cleanup --------------------------------------
  return {
    cleanup: () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointermove", onPointerMove);
      dom.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("pointerleave", onPointerUp);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("click", onClick);
      bgTex.dispose();
      envRT.texture.dispose();
      envRT.dispose();
      screenTex.dispose();
      Object.values(labelCanvasCache).forEach((t) => t.dispose());
      brandTex.dispose();
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
      if (dom.parentElement) {
        dom.parentElement.removeChild(dom);
      }
    },
    applyPreset: (v: string) => {
      if (v in PRESETS) applyPreset(v as keyof typeof PRESETS);
    },
  };
}
