import { visual } from "../config/visual.js";
import { manifest } from "./manifest.js";
export function emptyAssets() {
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
function loadImage(src) {
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
    });
}
export async function loadAssets() {
    const entries = await Promise.all(Object.keys(manifest).map(async (key) => {
        const src = manifest[key];
        const image = src ? await loadImage(src) : null;
        return [key, image];
    }));
    return Object.fromEntries(entries);
}
export function drawFitted(ctx, image, x, y, boxW, boxH, rotation) {
    const iw = "naturalWidth" in image ? image.naturalWidth : boxW;
    const ih = "naturalHeight" in image ? image.naturalHeight : boxH;
    const scale = Math.min(boxW / Math.max(1, iw), boxH / Math.max(1, ih));
    const w = iw * scale;
    const h = ih * scale;
    const smoothing = ctx.imageSmoothingEnabled;
    if (visual.pixelatedSprites)
        ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.imageSmoothingEnabled = smoothing;
}
