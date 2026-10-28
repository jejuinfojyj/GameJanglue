import { rules } from "../config/rules";
import { segmentsIntersect } from "../math";
import type { Kart } from "../kart/kart";
import type { OvalTrack } from "../track/oval";

export class RaceDirector {
  completed = 0;
  next = 1;
  lapTimes: number[] = [];
  lapTime = 0;
  total = 0;
  finished = false;
  justFinished = false;
  justCompletedLap = false;
  lastLapTime: number | null = null;
  wrongWay = 0;

  reset() {
    this.completed = 0;
    this.next = 1;
    this.lapTimes = [];
    this.lapTime = 0;
    this.total = 0;
    this.finished = false;
    this.justFinished = false;
    this.justCompletedLap = false;
    this.lastLapTime = null;
    this.wrongWay = 0;
  }

  update(
    dt: number,
    track: OvalTrack,
    x0: number,
    y0: number,
    kart: Kart,
    racing: boolean,
  ) {
    this.justFinished = false;
    this.justCompletedLap = false;
    if (!racing || this.finished) {
      this.wrongWay = Math.max(0, this.wrongWay - dt * 2);
      return;
    }

    this.total += dt;
    this.lapTime += dt;
    const gate = track.checkpoints[this.next];
    if (
      gate &&
      segmentsIntersect(x0, y0, kart.x, kart.y, gate.ax, gate.ay, gate.bx, gate.by)
    ) {
      const forward =
        Math.cos(gate.heading) * (kart.x - x0) + Math.sin(gate.heading) * (kart.y - y0);
      if (forward > 0) {
        if (this.next === 0) {
          this.lastLapTime = this.lapTime;
          this.lapTimes.push(this.lapTime);
          this.lapTime = 0;
          this.completed += 1;
          this.justCompletedLap = true;
          if (this.completed >= rules.laps) {
            this.finished = true;
            this.justFinished = true;
          }
        }
        this.next = (this.next + 1) % track.checkpoints.length;
      }
    }

    const closest = track.closest(kart.x, kart.y);
    const along = Math.cos(closest.heading) * kart.vx + Math.sin(closest.heading) * kart.vy;
    if (along < -130 && kart.speed > 80) this.wrongWay += dt;
    else this.wrongWay = Math.max(0, this.wrongWay - dt * 2);
  }

  get displayLap() {
    if (this.finished) return rules.laps;
    return Math.min(rules.laps, this.completed + 1);
  }

  get bestLap() {
    if (this.lapTimes.length === 0) return null;
    return Math.min(...this.lapTimes);
  }
}
