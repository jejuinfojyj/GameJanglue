import { loadAssets, emptyAssets, type LoadedAssets } from "./assets/library";
import { EngineAudio } from "./audio/engine";
import { handling } from "./config/handling";
import { rules } from "./config/rules";
import { visual } from "./config/visual";
import { Particles } from "./fx/particles";
import { SkidMarks } from "./fx/skids";
import { IDLE_INPUT, Input } from "./input";
import { Kart, type KartEvent } from "./kart/kart";
import { clamp, formatRaceTime } from "./math";
import { RaceDirector } from "./race/director";
import { drawCrashSheet } from "./render/crashSheet";
import { drawKart } from "./render/kartView";
import { drawHud, drawSpeedLines, drawVignette, type HudState, type Mode } from "./render/hud";
import { Textures } from "./render/textures";
import { drawWorld } from "./render/world";
import { OvalTrack } from "./track/oval";
import { createScenery, type Scenery } from "./track/props";

export class Game {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly track = new OvalTrack();
  private readonly scenery: Scenery;
  private readonly textures = new Textures();
  private readonly kart = new Kart();
  private readonly director = new RaceDirector();
  private readonly input = new Input();
  private readonly particles = new Particles();
  private readonly skids = new SkidMarks();
  private readonly audio = new EngineAudio();

  private assets: LoadedAssets = emptyAssets();
  private mode: Mode = "title";
  private cssW = 1;
  private cssH = 1;
  private dpr = 1;
  private camX = 0;
  private camY = 0;
  private zoom = 1;
  private punch = 0;
  private shake = 0;
  private time = 0;
  private countdown: number = rules.countdown;
  private goTime = 0;
  private splitTime: number | null = null;
  private splitLife = 0;
  private raceElapsed = 0;
  private muteToast = 0;
  private wallCooldown = 0;
  private smokeAcc = 0;
  private sparkAcc = 0;
  private impacts: { x: number; y: number; started: number }[] = [];
  private fps = 60;
  private debug = false;
  private paused = false;
  private pauseIndex = 0;
  private guide = false;
  private fault: string | null = null;
  private last = 0;
  private readonly reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D 컨텍스트를 만들 수 없습니다.");
    this.ctx = ctx;
    this.scenery = createScenery(this.track);
    this.resize();
    this.spawnKart();
    this.camX = this.track.originX;
    this.camY = this.track.originY;
    this.zoom = this.titleZoom();
    window.addEventListener("resize", this.resize);
    window.addEventListener('blur', () => { if (this.mode !== 'title') this.paused = true; });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.input.clearDriving(); if (this.mode !== 'title') this.paused = true; }
    });
    window.addEventListener("pointerdown", this.onPointer);
    void loadAssets().then((assets) => {
      this.assets = assets;
    });
  }

  start() {
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    const dt = Math.min(0.033, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (!this.fault) {
      try {
        this.update(dt);
        this.draw();
        document.body.dataset.mode = this.mode;
        document.body.dataset.paused = String(this.paused);
        const button = document.getElementById('start-race');
        if (button) button.textContent = this.paused ? '계속 달리기' : this.mode === 'finish' ? '다시 달리기' : '레이스 시작';
      } catch (error) {
        this.fault = error instanceof Error ? (error.stack ?? error.message) : String(error);
        console.error(error);
      }
    } else {
      this.drawFault();
    }
    requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    try {
      this.time += dt;
      this.fps += ((dt > 0 ? 1 / dt : this.fps) - this.fps) * 0.08;
      this.input.poll();
      if (this.input.confirmEdge || this.input.muteEdge || this.input.restartEdge) this.audio.unlock();
      if (this.input.muteEdge) {
        this.audio.muted = !this.audio.muted;
        this.muteToast = 1.15;
      }
      if (this.input.debugEdge) this.debug = !this.debug;
      const inMenu = this.paused || this.guide;
      this.readPause();
      if (this.paused || this.guide || inMenu) {
        this.audio.update(0, 0, false, false);
        return;
      }

      if (this.input.restartEdge && this.mode !== "title") this.restart();
      else if (this.mode === "title" && this.input.confirmEdge) this.begin();
      else if (this.mode === "finish" && this.input.finishEdge) this.restart();

      const driving = this.mode === "race";
      const previousX = this.kart.x;
      const previousY = this.kart.y;
      const events: KartEvent[] = [];
      this.kart.update(dt, driving ? this.input.snapshot() : IDLE_INPUT, this.track, events);
      this.applyEvents(events);

      if (this.mode === "countdown") {
        this.countdown -= dt;
        if (this.countdown <= 0) {
          this.mode = "race";
          this.countdown = 0;
          this.goTime = 0.85;
        }
      }
      if (this.goTime > 0) this.goTime = Math.max(0, this.goTime - dt);
      if (this.splitLife > 0) this.splitLife = Math.max(0, this.splitLife - dt);
      if (this.muteToast > 0) this.muteToast = Math.max(0, this.muteToast - dt);
      if (this.wallCooldown > 0) this.wallCooldown = Math.max(0, this.wallCooldown - dt);

      if (this.mode === "race" || this.mode === "finish") {
        const racing = this.mode === "race";
        this.director.update(dt, this.track, previousX, previousY, this.kart, racing);
        if (this.director.justFinished) {
          this.mode = "finish";
          this.particles.confetti(this.kart.x, this.kart.y);
        } else if (this.director.justCompletedLap && this.director.lastLapTime != null) {
          this.splitTime = this.director.lastLapTime;
          this.splitLife = 1.25;
        }
        if (racing) this.raceElapsed += dt;
      }

      this.emitTrail(dt);
      const crashLife = visual.crashFrames / visual.crashFps;
      this.impacts = this.impacts.filter((impact) => this.time - impact.started < crashLife);
      this.particles.update(dt);
      this.skids.update(dt);
      this.updateCamera(dt);
      this.shake *= Math.exp(-5.5 * dt);
      this.audio.update(
        this.kart.speed,
        driving ? this.input.snapshot().throttle : 0,
        this.kart.drifting,
        this.kart.boostTime > 0,
      );
    } finally {
      this.input.endFrame();
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = !visual.pixelatedSprites;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    ctx.save();
    this.applyCamera(ctx);
    const gate =
      rules.showNextGate && (this.mode === "race" || this.mode === "countdown")
        ? (this.track.checkpoints[this.director.next] ?? null)
        : null;
    drawWorld(ctx, {
      track: this.track,
      scenery: this.scenery,
      textures: this.textures,
      assets: this.assets,
      view: this.viewRect(),
      time: this.time,
      gate,
    });
    this.skids.draw(ctx);
    this.particles.draw(ctx, ["smoke"]);
    drawKart(ctx, this.kart, this.assets, this.time);
    drawCrashSheet(ctx, this.assets.crash, this.impacts, this.time);
    this.particles.draw(ctx, ["spark", "confetti"]);
    ctx.restore();

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawVignette(ctx, this.cssW, this.cssH);
    if (!this.reduceMotion && (this.mode === "race" || this.mode === "finish")) {
      const intensity =
        this.kart.boostTime > 0 ? 1 : clamp((this.kart.speed / handling.maxSpeed - 0.8) / 0.2, 0, 0.45);
      drawSpeedLines(ctx, this.cssW, this.cssH, intensity, this.time);
    }
    const hudScale = this.cssW < 600 ? this.cssW / 600 : 1;
    ctx.save(); ctx.scale(hudScale, hudScale);
    drawHud(ctx, this.hudState(), this.track, this.kart, this.cssW / hudScale, this.cssH / hudScale);
    ctx.restore();
  }

  private drawFault() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#1a120f";
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    ctx.fillStyle = "#ffb4a8";
    ctx.font = `16px ${visual.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const lines = (this.fault ?? "알 수 없는 오류").split("\n").slice(0, 12);
    lines.forEach((line, index) => ctx.fillText(line, 32, 32 + index * 22));
  }

  private readPause() {
    if (this.input.pauseEdge) {
      if (this.mode === "title") this.guide = !this.guide;
      else if (this.paused) this.paused = false;
      else {
        this.paused = true;
        this.pauseIndex = 0;
      }
    }

    if (this.mode === "title" && this.guide && this.input.confirmEdge) this.guide = false;
    if (!this.paused) return;
    this.input.clearDriving();
    if (this.input.upEdge || this.input.downEdge) this.pauseIndex = this.pauseIndex === 0 ? 1 : 0;
    else if (this.input.lobbyEdge || (this.input.confirmEdge && this.pauseIndex === 1)) this.toLobby();
    else if (this.input.confirmEdge) this.paused = false;
  }

  private toLobby() {
    this.paused = false;
    this.guide = false;
    this.pauseIndex = 0;
    this.spawnKart();
    this.director.reset();
    this.particles.clear();
    this.skids.clear();
    this.impacts = [];
    this.mode = "title";
    this.countdown = rules.countdown;
    this.goTime = 0;
    this.splitLife = 0;
    this.splitTime = null;
    this.raceElapsed = 0;
    this.punch = 0;
    this.shake = 0;
    this.camX = this.track.originX;
    this.camY = this.track.originY;
    this.zoom = this.titleZoom();
  }

  private begin() {
    this.audio.unlock();
    this.paused = false;
    this.guide = false;
    this.mode = "countdown";
    this.countdown = rules.countdown;
    this.goTime = 0;
  }

  private restart() {
    this.audio.unlock();
    this.paused = false;
    this.spawnKart();
    this.director.reset();
    this.particles.clear();
    this.skids.clear();
    this.impacts = [];
    this.mode = "countdown";
    this.countdown = rules.countdown;
    this.goTime = 0;
    this.splitLife = 0;
    this.raceElapsed = 0;
    this.punch = 0;
    this.shake = 0;
    this.camX = this.kart.x + Math.cos(this.kart.heading) * 36;
    this.camY = this.kart.y + Math.sin(this.kart.heading) * 36;
    this.zoom = this.raceZoom();
  }

  private spawnImpact(x: number, y: number) {
    const life = visual.crashFrames / visual.crashFps;
    if (this.impacts.some((impact) => this.time - impact.started < life)) return;
    this.impacts.push({ x, y, started: this.time });
  }

  private spawnKart() {
    const spawn = this.track.sample(72);
    this.kart.place(spawn.x, spawn.y, spawn.heading);
  }

  private applyEvents(events: KartEvent[]) {
    for (const event of events) {
      if (event.type === "wall") {
        if (event.impact > 45) this.spawnImpact(event.x, event.y);
        if (event.impact > 110 && this.wallCooldown <= 0) {
          this.wallCooldown = 0.3;
          if (!this.reduceMotion) this.shake = Math.min(12, event.impact * 0.018);
          this.audio.wall();
          for (let i = 0; i < 6; i += 1) {
            this.particles.spark(event.x, event.y, Math.random() * Math.PI * 2, "rgba(230,236,242,0.8)");
          }
        }
      } else if (event.type === "segment") {
        if (!this.reduceMotion) this.shake = Math.max(this.shake, 1.4);
        this.audio.charge();
      } else if (event.type === "boost") {
        this.punch = this.reduceMotion ? 0 : 0.055;
        if (!this.reduceMotion) this.shake = Math.max(this.shake, 4.5);
        this.audio.boost();
        for (let i = 0; i < 10; i += 1) {
          this.particles.spark(event.x, event.y, this.kart.heading + Math.PI, i % 2 ? "#ffd56a" : "#ff7a18");
        }
      }
    }
  }

  private emitTrail(dt: number) {
    if (this.mode !== "race") return;
    if (this.kart.drifting && this.kart.speed > 150) {
      const left = this.kart.wheelPoint(-14, -16, false);
      const right = this.kart.wheelPoint(-14, 16, false);
      this.skids.add(left.x, left.y, 0);
      this.skids.add(right.x, right.y, 1);
      this.smokeAcc += dt;
      while (this.smokeAcc > 0.022) {
        this.smokeAcc -= 0.022;
        this.particles.smoke(left.x, left.y, this.kart.vx, this.kart.vy);
        this.particles.smoke(right.x, right.y, this.kart.vx, this.kart.vy);
      }
    } else {
      this.smokeAcc = 0;
    }

    if (this.kart.boostTime > 0) {
      this.sparkAcc += dt;
      if (this.sparkAcc > 0.028) {
        this.sparkAcc = 0;
        const tail = this.kart.wheelPoint(-28, 0, true);
        this.particles.spark(tail.x, tail.y, this.kart.heading + Math.PI, "#ffb15a");
      }
    }
  }

  private updateCamera(dt: number) {
    const follow = this.mode !== "title";
    const aim = this.kart.heading;
    const lead = this.mode === "race" || this.mode === "finish" ? visual.cameraLookahead : 28;
    const targetX = follow ? this.kart.x + Math.cos(aim) * lead : this.track.originX;
    const targetY = follow ? this.kart.y + Math.sin(aim) * lead : this.track.originY;
    const boost = this.kart.boostTime > 0 ? 0.9 : 1;
    const targetZoom = (this.mode === "title" ? this.titleZoom() : this.raceZoom()) * boost;
    const stiff = this.mode === "race" || this.mode === "finish" ? visual.cameraStiffness : visual.introStiffness;
    const blend = 1 - Math.exp(-stiff * dt);
    this.camX += (targetX - this.camX) * blend;
    this.camY += (targetY - this.camY) * blend;
    this.zoom += (targetZoom - this.zoom) * blend;
    this.punch *= Math.exp(-7 * dt);
  }

  private applyCamera(ctx: CanvasRenderingContext2D) {
    const jolt = this.shake > 0.25 ? this.shake : 0;
    const jx = jolt ? (Math.random() - 0.5) * jolt : 0;
    const jy = jolt ? (Math.random() - 0.5) * jolt : 0;
    const zoom = this.zoom * (1 + this.punch);
    ctx.translate(this.cssW / 2 + jx, this.cssH / 2 + jy);
    ctx.scale(zoom, zoom);
    ctx.translate(-this.camX, -this.camY);
  }

  private viewRect() {
    const zoom = Math.max(0.05, this.zoom);
    const w = this.cssW / zoom + 280;
    const h = this.cssH / zoom + 280;
    return { x: this.camX - w / 2, y: this.camY - h / 2, w, h };
  }

  private titleZoom() {
    const ovalW = this.track.straight + (this.track.radius + this.track.halfWidth) * 2 + visual.titlePadding;
    const ovalH = (this.track.radius + this.track.halfWidth) * 2 + visual.titlePadding;
    return Math.min(this.cssW / ovalW, this.cssH / ovalH);
  }

  private raceZoom() {
    return clamp(this.cssH / visual.cameraViewHeight, 0.82, 1.85);
  }

  private hudState(): HudState {
    const closest = this.debug ? this.track.closest(this.kart.x, this.kart.y) : null;
    return {
      mode: this.mode,
      lap: this.director.displayLap,
      total: this.director.total,
      lapTime: this.director.lapTime,
      best: this.director.bestLap,
      lapTimes: this.director.lapTimes,
      speed: this.kart.speed,
      drifting: this.kart.drifting,
      driftCharge: this.kart.driftCharge,
      driftSegments: this.kart.driftSegments,
      boosting: this.kart.boostTime > 0,
      boostRatio: this.kart.boostDuration > 0 ? this.kart.boostTime / this.kart.boostDuration : 0,
      gateIndex: this.director.next,
      wrongWay: this.director.wrongWay > rules.wrongWayDelay,
      countdown: this.countdown,
      goTime: this.goTime,
      splitTime: this.splitTime,
      splitLife: this.splitLife,
      hintAlpha:
        this.mode === "countdown" ? 1 : this.mode === "race" ? clamp(1 - (this.raceElapsed - 7.5) / 2.4, 0, 1) : 0,
      muted: this.audio.muted,
      muteToast: this.muteToast,
      paused: this.paused,
      pauseIndex: this.pauseIndex,
      guide: this.guide,
      debugLines: this.debug
        ? [
            `fps ${this.fps.toFixed(0)}  mode ${this.mode}`,
            `v ${this.kart.speed.toFixed(0)}  fwd ${this.kart.forwardSpeed.toFixed(0)}  lat ${this.kart.lateralSpeed.toFixed(0)}`,
            `drift ${this.kart.drifting}  seg ${this.kart.driftSegments}  charge ${this.kart.driftCharge.toFixed(2)}`,
            `boost ${this.kart.boostTime.toFixed(2)}  s ${(closest?.s ?? 0).toFixed(0)}  gate ${this.director.next}`,
            `lap ${formatRaceTime(this.director.lapTime)}  done ${this.director.completed}`,
          ]
        : null,
    };
  }

  private resize = () => {
    this.cssW = Math.max(1, this.canvas.clientWidth);
    this.cssH = Math.max(1, this.canvas.clientHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.cssW * this.dpr);
    this.canvas.height = Math.round(this.cssH * this.dpr);
  };

  private onPointer = () => {
    this.audio.unlock();
  };
}
