const MAX_POINTS = 520;
export class SkidMarks {
    left = [];
    right = [];
    add(x, y, side) {
        const list = side === 0 ? this.left : this.right;
        const last = list[list.length - 1];
        if (last && (last.x - x) ** 2 + (last.y - y) ** 2 < 36)
            return;
        list.push({ x, y, a: 0.55 });
        if (list.length > MAX_POINTS)
            list.shift();
    }
    update(dt) {
        fade(this.left, dt);
        fade(this.right, dt);
    }
    draw(ctx) {
        strokeRibbon(ctx, this.left);
        strokeRibbon(ctx, this.right);
    }
    clear() {
        this.left = [];
        this.right = [];
    }
}
function fade(list, dt) {
    for (const mark of list)
        mark.a -= dt * 0.075;
    if (list.length > 0 && (list[0]?.a ?? 1) <= 0) {
        let drop = 0;
        while (drop < list.length && (list[drop]?.a ?? 1) <= 0)
            drop += 1;
        if (drop > 0)
            list.splice(0, drop);
    }
}
function strokeRibbon(ctx, list) {
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
    for (let i = 1; i < list.length; i += 1) {
        const a = list[i - 1];
        const b = list[i];
        if (!a || !b || a.a < 0.03 || b.a < 0.03)
            continue;
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 > 80 * 80)
            continue;
        ctx.strokeStyle = `rgba(24, 26, 32, ${Math.min(a.a, b.a).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }
}
