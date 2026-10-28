export function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
export function lerp(a, b, t) {
    return a + (b - a) * t;
}
export function mod(n, m) {
    return ((n % m) + m) % m;
}
export function wrapAngle(a) {
    const turn = Math.PI * 2;
    a = ((a % turn) + turn) % turn;
    if (a > Math.PI)
        a -= turn;
    return a;
}
export function angleDelta(from, to) {
    return wrapAngle(to - from);
}
export function mulberry32(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function parseHex(hex) {
    const h = hex.replace("#", "");
    return [
        Number.parseInt(h.slice(0, 2), 16),
        Number.parseInt(h.slice(2, 4), 16),
        Number.parseInt(h.slice(4, 6), 16),
    ];
}
export function mixHex(a, b, t) {
    const ca = parseHex(a);
    const cb = parseHex(b);
    const c = ca.map((v, i) => Math.round(v + ((cb[i] ?? v) - v) * t));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
export function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    const abx = bx - ax;
    const aby = by - ay;
    const cdx = dx - cx;
    const cdy = dy - cy;
    const d1 = abx * (cy - ay) - aby * (cx - ax);
    const d2 = abx * (dy - ay) - aby * (dx - ax);
    const d3 = cdx * (ay - cy) - cdy * (ax - cx);
    const d4 = cdx * (by - cy) - cdy * (bx - cx);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
export function formatRaceTime(seconds) {
    const safe = Math.max(0, seconds);
    const min = Math.floor(safe / 60);
    const sec = Math.floor(safe % 60);
    const ms = Math.floor((safe - Math.floor(safe)) * 1000);
    return `${min}:${sec.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}
