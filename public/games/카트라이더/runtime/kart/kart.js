import { handling } from "../config/handling.js";
import { rules } from "../config/rules.js";
import { clamp, lerp, mod, wrapAngle } from "../math.js";
export class Kart {
    x = 0;
    y = 0;
    heading = 0;
    vx = 0;
    vy = 0;
    drifting = false;
    driftCharge = 0;
    driftSegments = 0;
    driftTime = 0;
    boostTime = 0;
    boostDuration = 0;
    hop = 0;
    gaugeFlash = 0;
    steerSmoothed = 0;
    wheelSpin = 0;
    get speed() {
        return Math.hypot(this.vx, this.vy);
    }
    get forwardSpeed() {
        return this.vx * Math.cos(this.heading) + this.vy * Math.sin(this.heading);
    }
    get lateralSpeed() {
        const fx = Math.cos(this.heading);
        const fy = Math.sin(this.heading);
        return this.vx * -fy + this.vy * fx;
    }
    place(x, y, heading) {
        this.x = x;
        this.y = y;
        this.heading = heading;
        this.vx = 0;
        this.vy = 0;
        this.drifting = false;
        this.driftCharge = 0;
        this.driftSegments = 0;
        this.driftTime = 0;
        this.boostTime = 0;
        this.boostDuration = 0;
        this.hop = 0;
        this.gaugeFlash = 0;
        this.steerSmoothed = 0;
        this.wheelSpin = 0;
    }
    update(dt, input, track, events) {
        const steerTarget = input.steer;
        this.steerSmoothed = steerTarget;
        const speed = this.speed;
        const wantDrift = rules.enableDrift &&
            input.drift &&
            Math.abs(steerTarget) > 0.08 &&
            speed > handling.minDriftSpeed;
        if (!this.drifting && wantDrift) {
            this.drifting = true;
            this.driftCharge = 0;
            this.driftSegments = 0;
            this.driftTime = 0;
            this.hop = 1;
        }
        const rate = this.drifting ? handling.driftTurnRate : handling.turnRate;
        const speedScale = this.drifting ? 1 : lerp(1.18, 0.88, clamp(speed / handling.maxSpeed, 0, 1));
        this.heading = wrapAngle(this.heading + this.steerSmoothed * rate * speedScale * dt);
        const fx = Math.cos(this.heading);
        const fy = Math.sin(this.heading);
        let forward = this.vx * fx + this.vy * fy;
        let latX = this.vx - fx * forward;
        let latY = this.vy - fy * forward;
        const boosting = this.boostTime > 0 && rules.enableBoost;
        const max = handling.maxSpeed + (boosting ? handling.boostAdd : 0);
        if (input.throttle > 0) {
            const openness = 1 - clamp(forward / Math.max(max, 1), 0, 1) ** 1.35;
            const accel = handling.accel * (boosting ? 1.28 : 1) * lerp(0.38, 1, openness);
            forward += accel * dt;
        }
        else if (input.throttle < 0) {
            forward -= handling.brake * dt;
        }
        else {
            const step = handling.coast * dt;
            forward -= Math.abs(forward) < step ? forward : Math.sign(forward) * step;
        }
        if (forward > max)
            forward = max;
        if (forward < -handling.maxReverse)
            forward = -handling.maxReverse;
        let grip = this.drifting ? handling.driftGrip : input.throttle < 0 ? handling.brakeGrip : handling.grip;
        if (this.drifting && speed > 80) {
            const slip = Math.abs(wrapAngle(this.heading - Math.atan2(this.vy, this.vx)));
            if (slip > 0.8)
                grip += (slip - 0.8) * 12;
        }
        const damp = Math.exp(-grip * dt);
        latX *= damp;
        latY *= damp;
        const latMag = Math.hypot(latX, latY);
        const latCap = this.drifting ? handling.maxSpeed * 0.9 : 48;
        if (latMag > latCap) {
            latX *= latCap / latMag;
            latY *= latCap / latMag;
        }
        this.vx = fx * forward + latX;
        this.vy = fy * forward + latY;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.resolveWall(track, events, input.throttle > 0);
        this.wheelSpin = mod(this.wheelSpin + forward * dt * 0.045, 1000);
        if (this.drifting) {
            this.driftTime += dt;
            const charging = Math.abs(steerTarget) > 0.08 && forward > handling.minDriftSpeed * 0.62;
            if (charging) {
                this.driftCharge += dt;
                const marks = handling.driftSegmentTimes;
                while (this.driftSegments < marks.length && this.driftCharge >= (marks[this.driftSegments] ?? Infinity)) {
                    this.driftSegments += 1;
                    this.gaugeFlash = 1;
                    events.push({ type: "segment", segments: this.driftSegments });
                }
            }
            if (!input.drift || forward < handling.minDriftSpeed * 0.38)
                this.endDrift(events);
        }
        if (this.boostTime > 0)
            this.boostTime = Math.max(0, this.boostTime - dt);
        if (this.hop > 0)
            this.hop = Math.max(0, this.hop - dt * 3.1);
        if (this.gaugeFlash > 0)
            this.gaugeFlash = Math.max(0, this.gaugeFlash - dt * 2.6);
    }
    wheelPoint(localX, localY, lifted) {
        const c = Math.cos(this.heading);
        const s = Math.sin(this.heading);
        const lift = lifted ? this.hop * 18 : 0;
        return {
            x: this.x + localX * c - localY * s,
            y: this.y - lift + localX * s + localY * c,
        };
    }
    endDrift(events) {
        const segments = this.driftSegments;
        const held = this.driftTime;
        this.drifting = false;
        this.driftCharge = 0;
        this.driftSegments = 0;
        this.driftTime = 0;
        if (!rules.enableBoost || segments <= 0 || held < handling.minDriftTime)
            return;
        const kick = handling.boostKick[segments - 1] ?? 0;
        this.boostTime = handling.boostTimes[segments - 1] ?? 0;
        this.boostDuration = this.boostTime;
        this.vx += Math.cos(this.heading) * kick;
        this.vy += Math.sin(this.heading) * kick;
        this.gaugeFlash = 1;
        events.push({ type: "boost", segments, x: this.x, y: this.y });
    }
    resolveWall(track, events, throttle) {
        const limit = track.halfWidth - handling.kartRadius;
        for (let pass = 0; pass < 2; pass += 1) {
            const hit = track.closest(this.x, this.y);
            if (hit.distance <= limit || hit.distance < 1e-4)
                return;
            const nx = (this.x - hit.x) / hit.distance;
            const ny = (this.y - hit.y) / hit.distance;
            this.x = hit.x + nx * (limit - 0.4);
            this.y = hit.y + ny * (limit - 0.4);
            const outward = this.vx * nx + this.vy * ny;
            const tx = -ny;
            const ty = nx;
            let tangent = this.vx * tx + this.vy * ty;
            if (outward > 0) {
                this.vx = tx * tangent;
                this.vy = ty * tangent;
                if (outward > 240) {
                    const scrub = clamp((outward - 240) / 980, 0, 0.18);
                    this.vx *= 1 - scrub;
                    this.vy *= 1 - scrub;
                    tangent *= 1 - scrub;
                }
                if (pass === 0)
                    events.push({ type: "wall", x: this.x, y: this.y, impact: outward });
            }
            const alongHeading = Math.cos(this.heading) * tx + Math.sin(this.heading) * ty;
            if (throttle && Math.abs(tangent) < 80 && Math.abs(alongHeading) > 0.28) {
                const slide = Math.sign(alongHeading) * 110;
                this.vx += tx * slide;
                this.vy += ty * slide;
            }
        }
    }
}
