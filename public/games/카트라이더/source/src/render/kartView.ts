import { drawFitted, type LoadedAssets } from "../assets/library";
import { visual } from "../config/visual";
import { mixHex } from "../math";
import type { Kart } from "../kart/kart";

const REAR_X = -14;
const FRONT_X = 14;
const AXLE = 16;

export function drawKart(
  ctx: CanvasRenderingContext2D,
  kart: Kart,
  assets: LoadedAssets,
  time: number,
) {
  ctx.save();
  ctx.translate(kart.x + 6, kart.y + 8);
  ctx.rotate(kart.heading);
  ctx.scale(1.08, 0.46);
  ctx.fillStyle = `rgba(18, 32, 18, ${0.3 * (1 - kart.hop * 0.45)})`;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(kart.x, kart.y - kart.hop * 18);
  ctx.rotate(kart.heading);
  ctx.scale(1 + kart.hop * 0.04, 1 - kart.hop * 0.1);

  if (kart.boostTime > 0) drawFlame(ctx, kart, time);

  if (assets.kart && visual.kartImageIncludesRig) {
    const boxW = visual.kartLength * visual.kartImageScale;
    const boxH = visual.kartWidth * visual.kartImageScale;
    drawFitted(ctx, assets.kart, 0, 0, boxW, boxH, 0);
    drawSteeringWheels(ctx, kart, assets, boxW, boxH);
  } else {
    const steer = kart.steerSmoothed * 0.55;
    drawWheel(ctx, REAR_X, -AXLE, -steer * 0.2, kart.wheelSpin, assets);
    drawWheel(ctx, REAR_X, AXLE, -steer * 0.2, kart.wheelSpin, assets);
    drawWheel(ctx, FRONT_X, -AXLE, steer, kart.wheelSpin, assets);
    drawWheel(ctx, FRONT_X, AXLE, steer, kart.wheelSpin, assets);
    if (assets.kart) {
      drawFitted(
        ctx,
        assets.kart,
        2,
        0,
        visual.kartLength * visual.kartImageScale,
        visual.kartWidth * 0.72 * visual.kartImageScale,
        0,
      );
    } else {
      drawBody(ctx, kart);
    }
  }

  if (assets.driver) drawFitted(ctx, assets.driver, -2, 0, 22, 22, 0);
  ctx.restore();
}

const imageWheels = [
  { u: 0.19, v: 0.2, front: false },
  { u: 0.19, v: 0.8, front: false },
  { u: 0.77, v: 0.2, front: true },
  { u: 0.77, v: 0.8, front: true },
];

function drawSteeringWheels(
  ctx: CanvasRenderingContext2D,
  kart: Kart,
  assets: LoadedAssets,
  boxW: number,
  boxH: number,
) {
  const image = assets.kart;
  if (!image) return;
  const scale = Math.min(boxW / image.naturalWidth, boxH / image.naturalHeight);
  const drawnW = image.naturalWidth * scale;
  const drawnH = image.naturalHeight * scale;
  const steer = kart.steerSmoothed * 1.05;
  const rear = kart.drifting ? -steer * 0.35 : 0;
  const wheelW = drawnW * 0.26;
  const wheelH = drawnH * 0.46;
  for (const wheel of imageWheels) {
    const x = -drawnW / 2 + wheel.u * drawnW;
    const y = -drawnH / 2 + wheel.v * drawnH;
    drawWheel(ctx, x, y, wheel.front ? steer : rear, kart.wheelSpin, assets, wheelW, wheelH);
  }
}

function drawFlame(ctx: CanvasRenderingContext2D, kart: Kart, time: number) {
  const strength = kart.boostDuration > 0 ? Math.min(1, kart.boostTime / kart.boostDuration + 0.35) : 1;
  const len = (18 + Math.sin(time * 48) * 7) * strength;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(255, 122, 28, 0.95)";
  ctx.beginPath();
  ctx.moveTo(-20, -7);
  ctx.lineTo(-22 - len, 0);
  ctx.lineTo(-20, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255, 236, 170, 0.9)";
  ctx.beginPath();
  ctx.moveTo(-20, -3.5);
  ctx.lineTo(-20 - len * 0.62, 0);
  ctx.lineTo(-20, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawWheel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  spin: number,
  assets: LoadedAssets,
  width = 16,
  height = 10,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (assets.wheel) {
    drawFitted(ctx, assets.wheel, 0, 0, width, height, 0);
    ctx.restore();
    return;
  }
  ctx.fillStyle = "#15181e";
  ctx.beginPath();
  ctx.roundRect(-7, -4.2, 14, 8.4, 2.4);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  const tread = (spin * 8) % 4;
  ctx.fillRect(-6, -4.2 + tread, 12, 1.3);
  ctx.fillStyle = "#d5dbe3";
  ctx.beginPath();
  ctx.roundRect(-3.2, -2.2, 6.4, 4.4, 1.2);
  ctx.fill();
  ctx.fillStyle = visual.kartAccent;
  ctx.beginPath();
  ctx.arc(0, 0, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBody(ctx: CanvasRenderingContext2D, kart: Kart) {
  ctx.fillStyle = "#101828";
  ctx.beginPath();
  ctx.roundRect(-25, -17, 7, 34, 2);
  ctx.fill();

  const paint = ctx.createLinearGradient(-18, -14, 20, 14);
  paint.addColorStop(0, mixHex(visual.kartColor, "#ffffff", 0.42));
  paint.addColorStop(0.42, visual.kartColor);
  paint.addColorStop(1, visual.kartColorDark);
  ctx.fillStyle = paint;
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.quadraticCurveTo(26, -11, 10, -12);
  ctx.lineTo(-16, -12);
  ctx.quadraticCurveTo(-22, -12, -22, -6);
  ctx.lineTo(-22, 6);
  ctx.quadraticCurveTo(-22, 12, -16, 12);
  ctx.lineTo(10, 12);
  ctx.quadraticCurveTo(26, 11, 30, 0);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.stroke();

  ctx.fillStyle = visual.kartAccent;
  ctx.fillRect(-4, -12.4, 14, 2.6);
  ctx.fillRect(-4, 9.8, 14, 2.6);

  ctx.fillStyle = "#0c1830";
  ctx.beginPath();
  ctx.ellipse(-1, 0, 7.2, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f8fb";
  ctx.beginPath();
  ctx.arc(-3.2, 0, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1d2633";
  ctx.fillRect(-3.4, -2.1, 3.8, 4.2);

  ctx.fillStyle = visual.kartColorDark;
  ctx.font = `700 7px ${visual.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(visual.kartNumber, 14, 0);

  ctx.shadowColor = kart.boostTime > 0 ? "rgba(255, 220, 140, 0.95)" : "transparent";
  ctx.shadowBlur = kart.boostTime > 0 ? 12 : 0;
  ctx.fillStyle = kart.boostTime > 0 ? "#fff4c8" : "#ffe7a3";
  ctx.beginPath();
  ctx.arc(26, -4.2, 1.7, 0, Math.PI * 2);
  ctx.arc(26, 4.2, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}
