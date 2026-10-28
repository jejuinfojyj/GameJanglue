export const IDLE_INPUT = { steer: 0, throttle: 0, drift: false };
const CONFIRM = new Set([
    "Space",
    "Enter",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
]);
const PREVENT = new Set([
    "Space",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
]);
export class Input {
    confirmEdge = false;
    restartEdge = false;
    finishEdge = false;
    muteEdge = false;
    debugEdge = false;
    pauseEdge = false;
    lobbyEdge = false;
    upEdge = false;
    downEdge = false;
    touch = new Map();
    down = new Set();
    gamepadSteer = 0;
    gamepadThrottle = 0;
    gamepadDrift = false;
    wasStart = false;
    constructor() {
        for (const button of document.querySelectorAll('[data-drive]')) {
            button.addEventListener('pointerdown', event => {
                event.preventDefault();
                button.setPointerCapture(event.pointerId);
                this.touch.set(event.pointerId, button.dataset.drive);
                button.classList.add('held');
            });
            const release = (event) => { this.touch.delete(event.pointerId); button.classList.remove('held'); };
            button.addEventListener('pointerup', release);
            button.addEventListener('pointercancel', release);
            button.addEventListener('lostpointercapture', release);
        }
        for (const button of document.querySelectorAll('[data-action]')) {
            button.addEventListener('click', () => {
                this.clearDriving();
                switch (button.dataset.action) {
                    case 'confirm':
                        this.confirmEdge = this.finishEdge = true;
                        break;
                    case 'pause':
                        this.pauseEdge = true;
                        break;
                    case 'restart':
                        this.restartEdge = true;
                        break;
                    case 'lobby':
                        this.lobbyEdge = true;
                        break;
                    case 'mute':
                        this.muteEdge = true;
                        break;
                }
            });
        }
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);
        window.addEventListener("blur", this.onBlur);
    }
    destroy() {
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        window.removeEventListener("blur", this.onBlur);
    }
    poll() {
        this.readGamepad();
    }
    snapshot() {
        const keySteer = (this.down.has("ArrowRight") || this.down.has("KeyD") ? 1 : 0) -
            (this.down.has("ArrowLeft") || this.down.has("KeyA") ? 1 : 0);
        const keyDrift = this.down.has("Space") || this.down.has("ShiftLeft") || this.down.has("ShiftRight");
        const held = new Set(this.touch.values());
        const touchSteer = Number(held.has('right')) - Number(held.has('left'));
        const braking = held.has('brake') || this.down.has('ArrowDown') || this.down.has('KeyS') || this.gamepadThrottle < 0;
        return {
            steer: touchSteer || (keySteer !== 0 ? keySteer : this.gamepadSteer),
            throttle: braking ? -1 : 1,
            drift: held.has('drift') || keyDrift || this.gamepadDrift,
        };
    }
    endFrame() {
        this.confirmEdge = false;
        this.restartEdge = false;
        this.finishEdge = false;
        this.muteEdge = false;
        this.debugEdge = false;
        this.pauseEdge = false;
        this.lobbyEdge = false;
        this.upEdge = false;
        this.downEdge = false;
    }
    onKeyDown = (event) => {
        if (event.repeat)
            return;
        this.down.add(event.code);
        if (CONFIRM.has(event.code))
            this.confirmEdge = true;
        if (event.code === "KeyR")
            this.restartEdge = true;
        if (event.code === "Enter" || event.code === "Space" || event.code === "KeyR")
            this.finishEdge = true;
        if (event.code === "KeyM")
            this.muteEdge = true;
        if (event.code === "F3")
            this.debugEdge = true;
        if (event.code === "Escape")
            this.pauseEdge = true;
        if (event.code === "KeyL")
            this.lobbyEdge = true;
        if (event.code === "ArrowUp" || event.code === "KeyW")
            this.upEdge = true;
        if (event.code === "ArrowDown" || event.code === "KeyS")
            this.downEdge = true;
        if (PREVENT.has(event.code) || event.code === "Escape")
            event.preventDefault();
    };
    onKeyUp = (event) => {
        this.down.delete(event.code);
    };
    clearDriving() {
        this.down.clear();
        this.touch.clear();
        document.querySelectorAll('.held').forEach(button => button.classList.remove('held'));
    }
    onBlur = () => { this.clearDriving(); };
    readGamepad() {
        const pads = navigator.getGamepads?.() ?? [];
        const pad = pads.find((item) => item && item.connected) ?? null;
        if (!pad) {
            this.gamepadSteer = 0;
            this.gamepadThrottle = 0;
            this.gamepadDrift = false;
            this.wasStart = false;
            return;
        }
        const stickX = pad.axes[0] ?? 0;
        const stickY = pad.axes[1] ?? 0;
        this.gamepadSteer = Math.abs(stickX) > 0.18 ? Math.max(-1, Math.min(1, stickX)) : 0;
        const triggerAccel = pad.buttons[7]?.value ?? 0;
        const triggerBrake = pad.buttons[6]?.value ?? 0;
        if (triggerAccel > 0.12)
            this.gamepadThrottle = 1;
        else if (triggerBrake > 0.12 || stickY > 0.45)
            this.gamepadThrottle = -1;
        else if (stickY < -0.45)
            this.gamepadThrottle = 1;
        else
            this.gamepadThrottle = 0;
        this.gamepadDrift = Boolean(pad.buttons[0]?.pressed || pad.buttons[5]?.pressed);
        const start = Boolean(pad.buttons[9]?.pressed);
        if (start && !this.wasStart) {
            this.confirmEdge = true;
            this.restartEdge = true;
            this.finishEdge = true;
        }
        this.wasStart = start;
    }
}
