import { visual } from "../config/visual";
import { mulberry32 } from "../math";

export class Textures {
  readonly grass: CanvasPattern;
  readonly infield: CanvasPattern;
  readonly asphalt: CanvasPattern;

  constructor() {
    this.grass = makePattern(256, (ctx) => paintGrass(ctx, visual.grassA, visual.grassB, 4));
    this.infield = makePattern(256, (ctx) => paintGrass(ctx, visual.infieldA, visual.infieldB, 8));
    this.asphalt = makePattern(128, paintAsphalt);
  }
}

function makePattern(size: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D 컨텍스트를 만들 수 없습니다.");
  draw(ctx);
  const pattern = ctx.createPattern(canvas, "repeat");
  if (!pattern) throw new Error("패턴을 만들 수 없습니다.");
  return pattern;
}

function paintGrass(ctx: CanvasRenderingContext2D, base: string, stripe: string, seed: number) {
  const size = ctx.canvas.width;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = stripe;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(0, 0, size, size / 2);
  ctx.globalAlpha = 1;
  const rng = mulberry32(seed);
  for (let i = 0; i < 240; i += 1) {
    ctx.fillStyle = rng() > 0.55 ? visual.grassSpeck : visual.grassLight;
    ctx.globalAlpha = 0.15 + rng() * 0.22;
    ctx.fillRect(rng() * size, rng() * size, rng() > 0.8 ? 2 : 1, rng() > 0.8 ? 2 : 1);
  }
  ctx.globalAlpha = 1;
}

function paintAsphalt(ctx: CanvasRenderingContext2D) {
  const rng = mulberry32(19);
  for (let i = 0; i < 180; i += 1) {
    ctx.fillStyle = rng() > 0.45 ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.35)";
    const s = rng() > 0.85 ? 2 : 1;
    ctx.fillRect(rng() * 128, rng() * 128, s, s);
  }
}
