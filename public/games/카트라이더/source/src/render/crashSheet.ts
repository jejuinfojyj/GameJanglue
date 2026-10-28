import { visual } from "../config/visual";

export function drawCrashSheet(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement | null,
  impacts: { x: number; y: number; started: number }[],
  now: number,
) {
  if (!sheet) return;
  const frames = visual.crashFrames;
  const fps = visual.crashFps;
  const life = frames / fps;
  const frameW = sheet.naturalWidth / frames;
  const frameH = sheet.naturalHeight;
  const size = 62;
  for (const impact of impacts) {
    const age = now - impact.started;
    if (age < 0 || age >= life) continue;
    const frame = Math.min(frames - 1, Math.floor(age * fps));
    ctx.drawImage(sheet, frame * frameW, 0, frameW, frameH, impact.x - size / 2, impact.y - size / 2, size, size);
  }
}
