import { visual } from "../config/visual";
import { manifest, type AssetKey } from "./manifest";

export type LoadedAssets = Record<AssetKey, HTMLImageElement | null>;

export function emptyAssets(): LoadedAssets {
  return {
    background: null,
    kart: null,
    driver: null,
    wheel: null,
    tree: null,
    bush: null,
    crash: null,
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export async function loadAssets(): Promise<LoadedAssets> {
  const entries = await Promise.all(
    (Object.keys(manifest) as AssetKey[]).map(async (key) => {
      const src = manifest[key];
      const image = src ? await loadImage(src) : null;
      return [key, image] as const;
    }),
  );
  return Object.fromEntries(entries) as LoadedAssets;
}

export function drawFitted(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
  rotation: number,
) {
  const iw = "naturalWidth" in image ? image.naturalWidth : boxW;
  const ih = "naturalHeight" in image ? image.naturalHeight : boxH;
  const scale = Math.min(boxW / Math.max(1, iw), boxH / Math.max(1, ih));
  const w = iw * scale;
  const h = ih * scale;
  const smoothing = ctx.imageSmoothingEnabled;
  if (visual.pixelatedSprites) ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
  ctx.imageSmoothingEnabled = smoothing;
}
