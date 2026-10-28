import { trackConfig } from "../config/track";
import { mod, wrapAngle } from "../math";

export interface TrackSample {
  s: number;
  x: number;
  y: number;
  heading: number;
  nx: number;
  ny: number;
}

export interface Gate {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  heading: number;
  s: number;
}

export interface CurbQuad {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  cx: number;
  cy: number;
  dx: number;
  dy: number;
  red: boolean;
}

export interface GroundMark {
  x: number;
  y: number;
  heading: number;
  w: number;
  h: number;
  light: boolean;
}

export interface ClosestPoint {
  x: number;
  y: number;
  distance: number;
  heading: number;
  s: number;
}

/**
 * 직선 두 개와 반원 두 개로 이은 타원 서킷.
 * 진행 방향은 화면 아래에서 오른쪽으로 출발해 반시계 방향이다.
 */
export class OvalTrack {
  readonly straight = trackConfig.straight;
  readonly radius = trackConfig.radius;
  readonly halfWidth = trackConfig.halfWidth;
  readonly originX = trackConfig.originX;
  readonly originY = trackConfig.originY;
  readonly arc: number;
  readonly perimeter: number;
  readonly samples: TrackSample[];
  readonly outerPath: Path2D;
  readonly innerPath: Path2D;
  readonly outerLine: Path2D;
  readonly innerLine: Path2D;
  readonly centerPath: Path2D;
  readonly curbs: CurbQuad[];
  readonly startTiles: GroundMark[];
  readonly gridMarks: GroundMark[];
  readonly checkpoints: Gate[];
  readonly bounds: { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number };

  constructor() {
    this.arc = Math.PI * this.radius;
    this.perimeter = this.straight * 2 + this.arc * 2;

    const step = 8;
    const samples: TrackSample[] = [];
    for (let s = 0; s < this.perimeter; s += step) samples.push(this.sample(s));
    this.samples = samples;

    const lineAt = this.halfWidth - 28;
    this.outerPath = pathThrough(samples.map((p) => offset(p, -this.halfWidth)));
    this.innerPath = pathThrough(samples.map((p) => offset(p, this.halfWidth)));
    this.outerLine = pathThrough(samples.map((p) => offset(p, -lineAt)));
    this.innerLine = pathThrough(samples.map((p) => offset(p, lineAt)));
    this.centerPath = pathThrough(samples.map((p) => ({ x: p.x, y: p.y })));
    this.curbs = this.buildCurbs();
    this.startTiles = this.buildStartTiles();
    this.gridMarks = this.buildGrid();
    this.checkpoints = this.buildGates();

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of samples) {
      minX = Math.min(minX, p.x - this.halfWidth);
      maxX = Math.max(maxX, p.x + this.halfWidth);
      minY = Math.min(minY, p.y - this.halfWidth);
      maxY = Math.max(maxY, p.y + this.halfWidth);
    }
    const pad = 520;
    this.bounds = {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
    };

    this.checkJoints();
  }

  sample(distance: number): TrackSample {
    const local = this.sampleLocal(mod(distance, this.perimeter));
    const heading = wrapAngle(local.heading);
    return {
      s: local.s,
      x: local.x + this.originX,
      y: local.y + this.originY,
      heading,
      nx: Math.sin(heading),
      ny: -Math.cos(heading),
    };
  }

  closest(x: number, y: number): ClosestPoint {
    const lx = x - this.originX;
    const ly = y - this.originY;
    const L = this.straight;
    const R = this.radius;
    let bestD2 = Infinity;
    let bestX = 0;
    let bestY = 0;
    let bestHeading = 0;
    let bestS = 0;

    const consider = (px: number, py: number, heading: number, s: number) => {
      const dx = lx - px;
      const dy = ly - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestX = px;
        bestY = py;
        bestHeading = heading;
        bestS = s;
      }
    };

    const bottomT = clamp01((lx + L / 2) / L);
    consider(-L / 2 + bottomT * L, R, 0, bottomT * L);

    const topT = clamp01((L / 2 - lx) / L);
    consider(L / 2 - topT * L, -R, Math.PI, L + this.arc + topT * L);

    let right = Math.atan2(ly, lx - L / 2);
    if (right > Math.PI / 2) right = Math.PI / 2;
    if (right < -Math.PI / 2) right = -Math.PI / 2;
    consider(
      L / 2 + R * Math.cos(right),
      R * Math.sin(right),
      Math.atan2(-Math.cos(right), Math.sin(right)),
      L + (Math.PI / 2 - right) * R,
    );

    let left = Math.atan2(ly, lx + L / 2);
    if (left > -Math.PI / 2 && left < Math.PI / 2) left = left >= 0 ? Math.PI / 2 : -Math.PI / 2;
    let leftAngle = left;
    if (leftAngle > 0) leftAngle -= Math.PI * 2;
    consider(
      -L / 2 + R * Math.cos(left),
      R * Math.sin(left),
      Math.atan2(-Math.cos(left), Math.sin(left)),
      L + this.arc + L + (-Math.PI / 2 - leftAngle) * R,
    );

    const distance = Math.sqrt(bestD2);
    const heading = wrapAngle(bestHeading);
    return {
      x: bestX + this.originX,
      y: bestY + this.originY,
      distance,
      heading,
      s: mod(bestS, this.perimeter),
    };
  }

  private sampleLocal(s: number) {
    const L = this.straight;
    const R = this.radius;
    const arc = this.arc;
    if (s < L) {
      return { s, x: -L / 2 + s, y: R, heading: 0 };
    }
    if (s < L + arc) {
      const along = s - L;
      const a = Math.PI / 2 - along / R;
      return {
        s,
        x: L / 2 + R * Math.cos(a),
        y: R * Math.sin(a),
        heading: Math.atan2(-Math.cos(a), Math.sin(a)),
      };
    }
    if (s < L + arc + L) {
      const along = s - L - arc;
      return { s, x: L / 2 - along, y: -R, heading: Math.PI };
    }
    const along = s - L - arc - L;
    const a = -Math.PI / 2 - along / R;
    return {
      s,
      x: -L / 2 + R * Math.cos(a),
      y: R * Math.sin(a),
      heading: Math.atan2(-Math.cos(a), Math.sin(a)),
    };
  }

  private buildCurbs() {
    const quads: CurbQuad[] = [];
    const ranges: Array<[number, number]> = [
      [this.straight, this.straight + this.arc],
      [this.straight * 2 + this.arc, this.perimeter],
    ];
    const step = 18;
    const margin = 28;
    for (const [start, end] of ranges) {
      let index = 0;
      for (let s = start + margin; s < end - margin; s += step) {
        const a = this.sample(s);
        const b = this.sample(Math.min(s + step, end - margin));
        for (const side of [1, -1]) {
          const outer = side * (this.halfWidth - 2);
          const inner = side * (this.halfWidth - 24);
          const a0 = offset(a, outer);
          const a1 = offset(a, inner);
          const b0 = offset(b, outer);
          const b1 = offset(b, inner);
          quads.push({
            ax: a0.x,
            ay: a0.y,
            bx: b0.x,
            by: b0.y,
            cx: b1.x,
            cy: b1.y,
            dx: a1.x,
            dy: a1.y,
            red: index % 2 === 0,
          });
        }
        index += 1;
      }
    }
    return quads;
  }

  private buildStartTiles() {
    const p = this.sample(0);
    const tiles: GroundMark[] = [];
    const size = 14;
    let column = 0;
    for (let lat = -this.halfWidth + 24; lat <= this.halfWidth - 24; lat += size) {
      for (let row = 0; row < 2; row += 1) {
        const along = (row - 0.5) * size;
        const point = place(p, lat, along);
        tiles.push({
          x: point.x,
          y: point.y,
          heading: p.heading,
          w: size,
          h: size,
          light: (column + row) % 2 === 0,
        });
      }
      column += 1;
    }
    return tiles;
  }

  private buildGrid() {
    const marks: GroundMark[] = [];
    for (const along of [-46, -78, -110]) {
      for (const lat of [-46, 46]) {
        const p = this.sample(this.perimeter + along);
        const point = place(p, lat, 0);
        marks.push({
          x: point.x,
          y: point.y,
          heading: p.heading,
          w: 34,
          h: 16,
          light: true,
        });
      }
    }
    return marks;
  }

  private buildGates() {
    const count = Math.max(4, trackConfig.checkpointCount);
    const gates: Gate[] = [];
    const reach = this.halfWidth + 24;
    for (let i = 0; i < count; i += 1) {
      const s = (this.perimeter * i) / count;
      const p = this.sample(s);
      const a = offset(p, reach);
      const b = offset(p, -reach);
      gates.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, heading: p.heading, s });
    }
    return gates;
  }

  private checkJoints() {
    const joints = [0, this.straight, this.straight + this.arc, this.straight * 2 + this.arc, this.perimeter];
    for (const joint of joints) {
      const before = this.sample(joint - 0.5);
      const after = this.sample(joint + 0.5);
      const gap = Math.hypot(before.x - after.x, before.y - after.y);
      const turn = Math.abs(wrapAngle(after.heading - before.heading));
      if (gap > 2 || turn > 0.08) {
        console.warn("track joint", joint, { gap, turn });
      }
    }
  }
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function offset(sample: TrackSample, lateral: number) {
  return {
    x: sample.x + sample.nx * lateral,
    y: sample.y + sample.ny * lateral,
  };
}

function place(sample: TrackSample, lateral: number, along: number) {
  return {
    x: sample.x + sample.nx * lateral + Math.cos(sample.heading) * along,
    y: sample.y + sample.ny * lateral + Math.sin(sample.heading) * along,
  };
}

function pathThrough(points: Array<{ x: number; y: number }>) {
  const path = new Path2D();
  const first = points[0];
  if (!first) return path;
  path.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i];
    if (p) path.lineTo(p.x, p.y);
  }
  path.closePath();
  return path;
}
