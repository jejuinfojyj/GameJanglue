import { visual } from "../config/visual";
import { mulberry32 } from "../math";
import type { OvalTrack } from "./oval";

export interface Prop {
  kind: "tree" | "bush" | "rock";
  x: number;
  y: number;
  scale: number;
  rotation: number;
  variant: number;
}

export interface SoftBlob {
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: string;
}

export interface Scenery {
  props: Prop[];
  blobs: SoftBlob[];
}

export function createScenery(track: OvalTrack): Scenery {
  const rng = mulberry32(visual.seed);
  const props: Prop[] = [];

  const step = track.perimeter / visual.treeCount;
  for (let i = 0; i < visual.treeCount; i += 1) {
    const s = (i * step + rng() * step * 0.35) % track.perimeter;
    if (s > 90 && s < track.straight - 90) continue;
    const p = track.sample(s);
    const outward = -(track.halfWidth + 78 + rng() * 70);
    props.push({
      kind: "tree",
      x: p.x + p.nx * outward,
      y: p.y + p.ny * outward,
      scale: 0.82 + rng() * 0.75,
      rotation: rng() * Math.PI,
      variant: rng(),
    });
  }

  let bushes = 0;
  let guard = 0;
  while (bushes < visual.bushCount && guard < 400) {
    guard += 1;
    const x = track.originX + (rng() * 2 - 1) * track.straight * 0.38;
    const y = track.originY + (rng() * 2 - 1) * track.radius * 0.48;
    const closest = track.closest(x, y);
    if (closest.distance < track.halfWidth + 78) continue;
    if (closest.distance > track.radius * 0.92) continue;
    props.push({
      kind: "bush",
      x,
      y,
      scale: 0.7 + rng() * 0.8,
      rotation: rng() * Math.PI,
      variant: rng(),
    });
    bushes += 1;
  }

  let rocks = 0;
  guard = 0;
  while (rocks < visual.rockCount && guard < 200) {
    guard += 1;
    const s = rng() * track.perimeter;
    if (s > 70 && s < track.straight - 70) continue;
    const p = track.sample(s);
    const outward = -(track.halfWidth + 36 + rng() * 28);
    const x = p.x + p.nx * outward;
    const y = p.y + p.ny * outward;
    if (track.closest(x, y).distance < track.halfWidth + 18) continue;
    props.push({
      kind: "rock",
      x,
      y,
      scale: 0.6 + rng() * 0.7,
      rotation: rng() * Math.PI,
      variant: rng(),
    });
    rocks += 1;
  }

  const blobs: SoftBlob[] = [];
  for (let i = 0; i < 12; i += 1) {
    const light = rng() > 0.5;
    blobs.push({
      x: track.originX + (rng() * 2 - 1) * (track.straight * 0.7 + track.radius),
      y: track.originY + (rng() * 2 - 1) * (track.radius + 260),
      rx: 120 + rng() * 280,
      ry: 70 + rng() * 160,
      color: light ? "rgba(255,255,230,0.045)" : "rgba(0,30,10,0.06)",
    });
  }

  return { props, blobs };
}
