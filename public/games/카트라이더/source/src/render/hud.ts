import { visual } from "../config/visual";
import { handling } from "../config/handling";
import { rules } from "../config/rules";
import { formatRaceTime } from "../math";
import type { Kart } from "../kart/kart";
import type { OvalTrack } from "../track/oval";
import { drawDriveRow, drawTalkShelf, talkShelfHeight } from "./changeBoard";

export type Mode = "title" | "countdown" | "race" | "finish";

export interface HudState {
  mode: Mode;
  lap: number;
  total: number;
  lapTime: number;
  best: number | null;
  lapTimes: number[];
  speed: number;
  drifting: boolean;
  driftCharge: number;
  driftSegments: number;
  boosting: boolean;
  boostRatio: number;
  gateIndex: number;
  wrongWay: boolean;
  countdown: number;
  goTime: number;
  splitTime: number | null;
  splitLife: number;
  hintAlpha: number;
  muted: boolean;
  muteToast: number;
  paused: boolean;
  pauseIndex: number;
  guide: boolean;
  debugLines: string[] | null;
}

export function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.68);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${visual.vignette})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  time: number,
) {
  if (intensity < 0.04) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = `rgba(255,255,255,${0.14 * intensity})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    const y = ((i + 0.5) / 8) * h;
    const fromLeft = i % 2 === 0;
    const len = (70 + ((i * 53 + time * 80) % 140)) * intensity;
    const x = fromLeft ? 18 : w - 18;
    const dir = fromLeft ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dir * len, y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawHud(
  ctx: CanvasRenderingContext2D,
  state: HudState,
  track: OvalTrack,
  kart: Kart,
  w: number,
  h: number,
) {
  if (state.paused || state.guide) {
    drawGuide(ctx, state, w, h);
    return;
  }
  if (state.mode !== "title") {
    drawStatus(ctx, state);
    drawMinimap(ctx, track, kart, state, w);
  }
  if (state.mode === "race" || state.mode === "countdown") drawGauge(ctx, state, w, h);
  if (state.hintAlpha > 0 && state.mode !== "finish") drawHint(ctx, state.hintAlpha, h);
  if (state.mode === "countdown") drawCountdown(ctx, state, w, h);
  if (state.goTime > 0) drawGo(ctx, state.goTime, w, h);
  if (state.splitLife > 0 && state.splitTime != null && state.goTime <= 0 && state.mode === "race") {
    drawSplit(ctx, state, w, h);
  }
  if (state.wrongWay && state.mode === "race") drawBanner(ctx, "역주행", "#ff5d4a", w, 118);
  if (state.muteToast > 0) drawBanner(ctx, state.muted ? "소리 끔" : "소리 켬", "#f4f7fb", w, 64);
  if (state.mode === "title") drawTitle(ctx, w, h);
  if (state.mode === "finish") drawFinish(ctx, state, w, h);
  if (state.debugLines) drawDebug(ctx, state.debugLines, h);
}

function drawStatus(ctx: CanvasRenderingContext2D, state: HudState) {
  const tall = state.best != null;
  glass(ctx, 22, 22, 228, tall ? 132 : 108);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  font(ctx, 13, 650);
  ctx.fillText("랩", 42, 50);
  ctx.fillStyle = "#ffffff";
  font(ctx, 30, 760);
  ctx.fillText(`${state.lap}  /  ${rules.laps}`, 42, 84);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  font(ctx, 16, 650);
  const running = state.mode === "finish" ? state.total : state.lapTime;
  ctx.fillText(formatRaceTime(state.mode === "countdown" ? 0 : running), 42, 112);
  if (state.best != null) {
    ctx.fillStyle = visual.kartAccent;
    font(ctx, 13, 650);
    ctx.fillText(`베스트  ${formatRaceTime(state.best)}`, 42, 136);
  }
}

function drawGauge(ctx: CanvasRenderingContext2D, state: HudState, w: number, h: number) {
  const width = 300;
  const x = (w - width) / 2;
  const y = h - 118;
  glass(ctx, x - 18, y - 58, width + 36, 132);

  const kmh = Math.round(state.speed * visual.speedToKmh);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  font(ctx, 42, 760);
  ctx.fillText(String(kmh), w / 2, y - 8);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  font(ctx, 12, 650);
  ctx.fillText("km/h", w / 2, y + 10);

  const cap = handling.maxSpeed + handling.boostAdd;
  roundBar(ctx, x, y + 22, width, 6, "rgba(255,255,255,0.12)");
  roundBar(ctx, x, y + 22, width * Math.min(1, state.speed / cap), 6, state.boosting ? visual.kartAccent : "#d7e4f4");

  const maxCharge = handling.driftSegmentTimes[handling.driftSegmentTimes.length - 1] ?? 1;
  const fill = state.drifting ? state.driftCharge / maxCharge : state.boosting ? state.boostRatio : 0;
  roundBar(ctx, x, y + 38, width, 14, "rgba(0,0,0,0.38)");
  const gaugeColor = state.boosting
    ? visual.kartAccent
    : state.driftSegments >= 3
      ? "#ff4d6d"
      : state.driftSegments === 2
        ? "#ff8a3d"
        : state.driftSegments === 1
          ? "#ffe56a"
          : "#7ed0ff";
  roundBar(ctx, x, y + 38, width * Math.max(0, Math.min(1, fill)), 14, gaugeColor);

  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 2;
  for (const mark of handling.driftSegmentTimes) {
    const tx = x + (mark / maxCharge) * width;
    ctx.beginPath();
    ctx.moveTo(tx, y + 37);
    ctx.lineTo(tx, y + 53);
    ctx.stroke();
  }

  ctx.fillStyle = state.boosting ? visual.kartAccent : "rgba(255,255,255,0.78)";
  font(ctx, 13, 700);
  const label = state.boosting
    ? "부스트"
    : state.drifting
      ? state.driftSegments > 0
        ? `드리프트  ${state.driftSegments}단`
        : "드리프트"
      : "Space  드리프트";
  ctx.fillText(label, w / 2, y + 74);
}

function drawHint(ctx: CanvasRenderingContext2D, alpha: number, h: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  font(ctx, 14, 650);
  ctx.fillText("↑ 가속    ← → 조향    Space 드리프트    ESC 일시정지    R 재시작", 28, h - 22);
  ctx.restore();
}

function drawCountdown(ctx: CanvasRenderingContext2D, state: HudState, w: number, h: number) {
  const value = state.countdown > 2 ? 3 : state.countdown > 1 ? 2 : 1;
  const frac = state.countdown > 2 ? state.countdown - 2 : state.countdown > 1 ? state.countdown - 1 : state.countdown;
  drawLights(ctx, value, false, w);
  ctx.save();
  ctx.translate(w / 2, h / 2 - 10);
  ctx.scale(1 + frac * 0.12, 1 + frac * 0.12);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 18;
  font(ctx, 132, 800);
  ctx.fillText(String(value), 0, 0);
  ctx.restore();
}

function drawGo(ctx: CanvasRenderingContext2D, life: number, w: number, h: number) {
  drawLights(ctx, 3, true, w);
  ctx.save();
  ctx.globalAlpha = Math.min(1, life * 2);
  ctx.translate(w / 2, h / 2 - 10);
  const pop = 0.86 + (1 - Math.min(1, life / 0.8)) * 0.2;
  ctx.scale(pop, pop);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = visual.kartAccent;
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 16;
  font(ctx, 108, 800);
  ctx.fillText("GO", 0, 0);
  ctx.restore();
}

function drawLights(ctx: CanvasRenderingContext2D, lit: number, go: boolean, w: number) {
  const y = 36;
  for (let i = 0; i < 3; i += 1) {
    const on = go || i < lit;
    ctx.beginPath();
    ctx.arc(w / 2 + (i - 1) * 28, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = on ? (go ? "#3dde7a" : "#ff3b3b") : "rgba(255,255,255,0.16)";
    ctx.fill();
  }
}

function drawSplit(ctx: CanvasRenderingContext2D, state: HudState, w: number, h: number) {
  if (state.splitTime == null) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, state.splitLife * 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 12;
  font(ctx, 42, 760);
  ctx.fillText(formatRaceTime(state.splitTime), w / 2, h / 2 - 8);
  ctx.restore();
}

function drawBanner(ctx: CanvasRenderingContext2D, text: string, color: string, w: number, y: number) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  font(ctx, 18, 750);
  const width = Math.max(120, text.length * 16 + 36);
  glass(ctx, (w - width) / 2, y - 18, width, 36);
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, y);
  ctx.restore();
}

function drawGuide(ctx: CanvasRenderingContext2D, state: HudState, w: number, h: number) {
  const shelf = talkShelfHeight(Math.min(w - 32, 1040));
  const block = (state.paused ? 210 : 150) + 150 + shelf;
  const scale = Math.min(1, (w - 24) / 1040, (h - 20) / (block + 8));
  ctx.save();
  ctx.fillStyle = "rgba(5, 8, 10, 0.72)";
  ctx.fillRect(0, 0, w, h);
  ctx.translate(w / 2, h / 2);
  ctx.scale(scale, scale);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = visual.kartAccent;
  font(ctx, 13, 800);
  ctx.fillText(state.paused ? "일시정지" : "조작", 0, -block / 2 + 16);
  ctx.fillStyle = "#ffffff";
  font(ctx, 34, 800);
  ctx.fillText(state.paused ? "잠깐 멈춤" : "이렇게 달려", 0, -block / 2 + 52);

  let y = -block / 2 + 84;
  if (state.paused) {
    drawChoice(ctx, -236, y, 220, 64, "계속하기", state.pauseIndex === 0, "Enter");
    drawChoice(ctx, 16, y, 220, 64, "로비로", state.pauseIndex === 1, "L");
    y += 84;
  }

  drawDriveRow(ctx, 0, y);
  y += 108;
  drawTalkShelf(ctx, 0, y, 1000);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  font(ctx, 14, 650);
  ctx.fillText(
    state.paused ? "↑ ↓ 고르기     Enter 결정     ESC 계속" : "ESC 또는 Enter 로 닫기",
    0,
    block / 2 - 12,
  );
  ctx.restore();
}

function drawChoice(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  selected: boolean,
  key: string,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.fillStyle = selected ? visual.kartAccent : "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = selected ? visual.kartAccent : "rgba(255,255,255,0.16)";
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = selected ? "#2a2116" : "#ffffff";
  font(ctx, 20, 800);
  ctx.fillText(label, x + w / 2, y + h / 2 - 8);
  ctx.globalAlpha = selected ? 0.7 : 0.45;
  font(ctx, 12, 700);
  ctx.fillText(key, x + w / 2, y + h / 2 + 14);
  ctx.globalAlpha = 1;
}

function drawTitle(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const shelf = talkShelfHeight(w - 36);
  ctx.save();
  const top = ctx.createLinearGradient(0, 0, 0, 190);
  top.addColorStop(0, "rgba(6,10,12,0.62)");
  top.addColorStop(1, "rgba(6,10,12,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, 190);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  font(ctx, 48, 800);
  ctx.fillText("오벌 드리프트", w / 2, 46);
  ctx.fillStyle = "rgba(255,255,255,0.84)";
  font(ctx, 16, 650);
  ctx.fillText(matchMedia("(pointer:coarse)").matches ? "자동 가속 · 하단 버튼으로 조향 · 브레이크 · 드리프트" : "자동 가속 · ← → 조향 · ↓ 브레이크/후진 · Space 드리프트", w / 2, 84);

  const blink = 0.55 + Math.sin(performance.now() / 180) * 0.45;
  ctx.globalAlpha = blink;
  ctx.beginPath();
  ctx.roundRect(w / 2 - 132, 104, 264, 42, 21);
  ctx.fillStyle = visual.kartAccent;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#2a2116";
  font(ctx, 16, 800);
  ctx.fillText("아래 레이스 시작 버튼을 눌러 출발", w / 2, 125);

  ctx.beginPath();
  ctx.roundRect(16, h - shelf - 28, w - 32, shelf + 16, 22);
  ctx.fillStyle = "rgba(8, 12, 14, 0.88)";
  ctx.fill();
  drawTalkShelf(ctx, w / 2, h - shelf - 18, w - 48);
  ctx.restore();
}

function drawFinish(ctx: CanvasRenderingContext2D, state: HudState, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = "rgba(6, 12, 10, 0.42)";
  ctx.fillRect(0, 0, w, h);
  const scale = Math.min(1, w / 760, h / 680);
  ctx.translate(w / 2, h / 2);
  ctx.scale(scale, scale);
  glass(ctx, -210, -188, 420, 376);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = visual.kartAccent;
  font(ctx, 14, 750);
  ctx.fillText("FINISH", 0, -146);
  ctx.fillStyle = "#ffffff";
  font(ctx, 42, 800);
  ctx.fillText("완주", 0, -98);
  font(ctx, 22, 700);
  ctx.fillText(formatRaceTime(state.total), 0, -52);
  font(ctx, 16, 650);
  state.lapTimes.forEach((time, index) => {
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.fillText(`${index + 1}랩    ${formatRaceTime(time)}`, 0, -8 + index * 32);
  });
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  font(ctx, 15, 650);
  ctx.fillText("Enter  ·  다시 달리기", 0, 132);
  ctx.restore();
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  track: OvalTrack,
  kart: Kart,
  state: HudState,
  w: number,
) {
  const boxW = 220;
  const boxH = 140;
  const x = w - boxW - 20;
  const y = 20;
  const minX = track.originX - track.straight / 2 - track.radius - track.halfWidth;
  const maxX = track.originX + track.straight / 2 + track.radius + track.halfWidth;
  const minY = track.originY - track.radius - track.halfWidth;
  const maxY = track.originY + track.radius + track.halfWidth;
  const worldW = maxX - minX;
  const worldH = maxY - minY;
  const innerW = boxW - 28;
  const innerH = boxH - 28;
  const scale = Math.min(innerW / worldW, innerH / worldH);
  const ox = x + (boxW - worldW * scale) / 2;
  const oy = y + (boxH - worldH * scale) / 2;
  const mx = (px: number) => ox + (px - minX) * scale;
  const my = (py: number) => oy + (py - minY) * scale;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, 16);
  ctx.fillStyle = "rgba(10, 16, 14, 0.9)";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x + 10, y + 10, boxW - 20, boxH - 20, 10);
  ctx.clip();
  ctx.fillStyle = "#1c5530";
  ctx.fillRect(x, y, boxW, boxH);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(7, track.halfWidth * 2 * scale);
  ctx.strokeStyle = "#687284";
  strokeSamples(ctx, track, mx, my);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  strokeSamples(ctx, track, mx, my);

  const current = track.checkpoints[state.gateIndex];
  if (current && (state.mode === "race" || state.mode === "countdown")) {
    ctx.strokeStyle = visual.kartAccent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx(current.ax), my(current.ay));
    ctx.lineTo(mx(current.bx), my(current.by));
    ctx.stroke();
  }

  const kx = mx(kart.x);
  const ky = my(kart.y);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(kx, ky, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = visual.kartColor;
  ctx.beginPath();
  ctx.arc(kx, ky, 2.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function strokeSamples(
  ctx: CanvasRenderingContext2D,
  track: OvalTrack,
  mx: (x: number) => number,
  my: (y: number) => number,
) {
  ctx.beginPath();
  track.samples.forEach((sample, index) => {
    const x = mx(sample.x);
    const y = my(sample.y);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();
}

function drawDebug(ctx: CanvasRenderingContext2D, lines: string[], h: number) {
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(8,10,14,0.7)";
  ctx.fillRect(16, h - 28 - lines.length * 16, 280, lines.length * 16 + 12);
  ctx.fillStyle = "#d7ffe4";
  font(ctx, 12, 600);
  lines.forEach((line, index) => {
    ctx.fillText(line, 24, h - 16 - (lines.length - 1 - index) * 16);
  });
  ctx.restore();
}

function glass(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.fillStyle = "rgba(10, 16, 18, 0.58)";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.stroke();
  ctx.restore();
}

function roundBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  if (w <= 0) return;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(h, w), h, h / 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function font(ctx: CanvasRenderingContext2D, size: number, weight: number) {
  ctx.font = `${weight} ${size}px ${visual.font}`;
}
