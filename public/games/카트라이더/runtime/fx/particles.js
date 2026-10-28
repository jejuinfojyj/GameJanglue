const CAP = 320;
export class Particles {
    items = [];
    spawn(particle) {
        if (this.items.length >= CAP)
            this.items.shift();
        this.items.push(particle);
    }
    smoke(x, y, vx, vy) {
        this.spawn({
            kind: "smoke",
            x,
            y,
            vx: vx * 0.15 + (Math.random() - 0.5) * 18,
            vy: vy * 0.15 + (Math.random() - 0.5) * 18,
            life: 0.55 + Math.random() * 0.35,
            max: 0.9,
            size: 5 + Math.random() * 4,
            spin: 0,
            spinV: 0,
            color: Math.random() > 0.5 ? "rgba(236,240,244," : "rgba(214,220,226,",
        });
    }
    spark(x, y, angle, color) {
        const speed = 80 + Math.random() * 180;
        const spread = angle + (Math.random() - 0.5) * 1.2;
        this.spawn({
            kind: "spark",
            x,
            y,
            vx: Math.cos(spread) * speed,
            vy: Math.sin(spread) * speed,
            life: 0.18 + Math.random() * 0.22,
            max: 0.4,
            size: 2 + Math.random() * 2,
            spin: 0,
            spinV: 0,
            color,
        });
    }
    confetti(x, y) {
        const colors = ["#ffb703", "#2f7dff", "#ff5d4a", "#f4f7fb", "#49c07a"];
        for (let i = 0; i < 70; i += 1) {
            const color = colors[i % colors.length] ?? "#fff";
            this.spawn({
                kind: "confetti",
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 16,
                vx: (Math.random() - 0.5) * 280,
                vy: -80 - Math.random() * 260,
                life: 1.6 + Math.random() * 0.8,
                max: 2.4,
                size: 4 + Math.random() * 4,
                spin: Math.random() * Math.PI,
                spinV: (Math.random() - 0.5) * 8,
                color,
            });
        }
    }
    update(dt) {
        for (const item of this.items) {
            item.life -= dt;
            item.x += item.vx * dt;
            item.y += item.vy * dt;
            if (item.kind === "confetti")
                item.vy += 460 * dt;
            if (item.kind === "smoke") {
                item.vx *= 0.96;
                item.vy *= 0.96;
            }
            item.spin += item.spinV * dt;
        }
        if (this.items.some((item) => item.life <= 0)) {
            this.items = this.items.filter((item) => item.life > 0);
        }
    }
    draw(ctx, kinds) {
        for (const item of this.items) {
            if (!kinds.includes(item.kind))
                continue;
            const t = Math.max(0, item.life / item.max);
            if (item.kind === "smoke") {
                ctx.fillStyle = `${item.color}${(t * 0.45).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(item.x, item.y, item.size * (1.4 - t), 0, Math.PI * 2);
                ctx.fill();
            }
            else if (item.kind === "spark") {
                ctx.strokeStyle = item.color;
                ctx.globalAlpha = t;
                ctx.lineWidth = item.size;
                ctx.beginPath();
                ctx.moveTo(item.x, item.y);
                ctx.lineTo(item.x - item.vx * 0.03, item.y - item.vy * 0.03);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            else {
                ctx.save();
                ctx.translate(item.x, item.y);
                ctx.rotate(item.spin);
                ctx.globalAlpha = Math.min(1, t * 1.4);
                ctx.fillStyle = item.color;
                ctx.fillRect(-item.size / 2, -item.size / 4, item.size, item.size * 0.55);
                ctx.restore();
            }
        }
    }
    clear() {
        this.items = [];
    }
}
