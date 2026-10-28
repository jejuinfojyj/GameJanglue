import { visual } from "../config/visual";

interface ChangeCard {
  id: "speed" | "drift" | "laps" | "track" | "color" | "photo";
  title: string;
  say: string;
  tint: string;
}

const cards: ChangeCard[] = [
  { id: "speed", title: "속도", say: "더 빠르게", tint: "#3d8bff" },
  { id: "drift", title: "드리프트", say: "더 미끄럽게", tint: "#ff8a3d" },
  { id: "laps", title: "바퀴 수", say: "5바퀴로", tint: "#3dde7a" },
  { id: "track", title: "트랙", say: "길을 넓게", tint: "#ff5d73" },
  { id: "color", title: "색깔", say: "빨강 카트", tint: "#ffb703" },
  { id: "photo", title: "사진", say: "이 그림으로", tint: "#c084fc" },
];

const cardW = 150;
const cardH = 162;
const gap = 12;
const labelH = 44;
const naturalW = cards.length * cardW + (cards.length - 1) * gap;

function fit(maxWidth: number) {
  return Math.min(1, maxWidth / naturalW);
}

export function talkShelfHeight(maxWidth: number) {
  return (labelH + cardH) * fit(maxWidth);
}

export function drawTalkShelf(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  top: number,
  maxWidth: number,
) {
  const scale = fit(maxWidth);
  ctx.save();
  ctx.translate(centerX, top);
  ctx.scale(scale, scale);
  ctx.translate(-naturalW / 2, 0);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  setFont(ctx, 20, 800);
  ctx.fillText("게임을 수정하고 싶다면 이렇게 말해 봐", naturalW / 2, 18);
  cards.forEach((card, index) => {
    drawCard(ctx, index * (cardW + gap), labelH, card);
  });
  ctx.restore();
  return (labelH + cardH) * scale;
}

export function driveRowHeight() {
  return 78;
}

export function drawDriveRow(ctx: CanvasRenderingContext2D, centerX: number, top: number) {
  const chips = [
    { title: "달려", hint: "↑ 꾹", draw: drawGo },
    { title: "돌려", hint: "←  →", draw: drawTurn },
    { title: "미끄러져", hint: "Space 누르고 떼기", draw: drawSlide },
  ];
  const w = 210;
  const h = 72;
  const space = 14;
  const total = chips.length * w + (chips.length - 1) * space;
  ctx.save();
  ctx.translate(centerX - total / 2, top);
  chips.forEach((chip, index) => {
    const x = index * (w + space);
    ctx.beginPath();
    ctx.roundRect(x, 0, w, h, 16);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    chip.draw(ctx, x + 28, h / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    setFont(ctx, 16, 800);
    ctx.fillText(chip.title, x + 52, 26);
    ctx.fillStyle = visual.kartAccent;
    setFont(ctx, 13, 700);
    ctx.fillText(chip.hint, x + 52, 48);
  });
  ctx.restore();
}

function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, card: ChangeCard) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;
  ctx.beginPath();
  ctx.roundRect(x, y, cardW, cardH, 18);
  ctx.fillStyle = "#172127";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = card.tint;
  ctx.fillRect(x, y, cardW, 78);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(x + cardW / 2, y + 40, 24, 0, Math.PI * 2);
  ctx.fillStyle = card.tint;
  ctx.fill();
  drawIcon(ctx, card.id, x + cardW / 2, y + 40);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  setFont(ctx, 16, 800);
  ctx.fillText(card.title, x + cardW / 2, y + 84);

  const bubbleX = x + 14;
  const bubbleY = y + 104;
  const bubbleW = cardW - 28;
  ctx.beginPath();
  ctx.roundRect(bubbleX, bubbleY, bubbleW, 40, 12);
  ctx.fillStyle = "#fff8ea";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bubbleX + 22, bubbleY);
  ctx.lineTo(bubbleX + 32, bubbleY - 7);
  ctx.lineTo(bubbleX + 42, bubbleY);
  ctx.fill();
  ctx.fillStyle = "#2a2116";
  setFont(ctx, 15, 800);
  ctx.fillText(card.say, x + cardW / 2, bubbleY + 21);
  ctx.restore();
}

function drawIcon(ctx: CanvasRenderingContext2D, id: ChangeCard["id"], x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (id === "speed") {
    ctx.beginPath();
    ctx.arc(0, 4, 13, Math.PI * 0.85, Math.PI * 2.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(7, -6);
    ctx.stroke();
  } else if (id === "drift") {
    ctx.beginPath();
    ctx.moveTo(-12, 8);
    ctx.quadraticCurveTo(-2, -10, 12, -2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, 12);
    ctx.quadraticCurveTo(2, -2, 12, 4);
    ctx.stroke();
  } else if (id === "laps") {
    ctx.fillRect(-1, -4, 3, 16);
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        ctx.fillStyle = (row + col) % 2 === 0 ? "#ffffff" : "#2a2116";
        ctx.fillRect(2 + col * 4, -12 + row * 4, 4, 4);
      }
    }
  } else if (id === "track") {
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === "color") {
    paintDot(ctx, "#ff5d73", -8, 2);
    paintDot(ctx, "#3d8bff", 0, -6);
    paintDot(ctx, "#ffe14a", 8, 2);
  } else {
    ctx.strokeRect(-11, -8, 22, 16);
    ctx.beginPath();
    ctx.arc(6, -3, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-11, 8);
    ctx.lineTo(-2, -1);
    ctx.lineTo(3, 4);
    ctx.lineTo(11, -2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGo(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(0, -8);
  ctx.lineTo(-6, -1);
  ctx.moveTo(0, -8);
  ctx.lineTo(6, -1);
  ctx.stroke();
  ctx.restore();
}

function drawTurn(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 2, 9, Math.PI * 0.15, Math.PI * 1.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.lineTo(-12, 2);
  ctx.lineTo(-4, 2);
  ctx.stroke();
  ctx.restore();
}

function drawSlide(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(-6, 4, 7, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(6, -2, 5, 2.4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintDot(ctx: CanvasRenderingContext2D, color: string, x: number, y: number) {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(20,16,10,0.45)";
  ctx.stroke();
}

function setFont(ctx: CanvasRenderingContext2D, size: number, weight: number) {
  ctx.font = `${weight} ${size}px ${visual.font}`;
}
