/** 공통 게임 제작 도구. 화면, 게임 종류, 성공 조건을 정의하지 않는다. */
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function localPoint(element, clientX, clientY, width, height) {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0, inside: false };
  return {
    x: (clientX - rect.left) / rect.width * width,
    y: (clientY - rect.top) / rect.height * height,
    inside: clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom,
  };
}

/** 포인터와 키보드의 현재 상태만 제공한다. 이동/클릭의 의미는 작품이 정한다. */
export function createInput(element, {
  point = (x, y) => localPoint(element, x, y, element.clientWidth, element.clientHeight),
  keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'],
  keyTarget = globalThis.window,
  onRelease = () => {},
  onKeyRelease = () => {},
} = {}) {
  const pointer = { x: 0, y: 0, down: false, inside: false, positioned: false, revision: 0 };
  const heldKeys = new Set();
  const allowedKeys = new Set(keys);
  const listeners = [];
  let activePointer = null;
  const fromControl = target => {
    const control = target?.closest?.('button,a[href],input,select,textarea,label[for],[role="button"],[contenteditable]:not([contenteditable="false"]),[data-game-input="ignore"]');
    return !!control && control !== element;
  };
  const clearInput = () => { heldKeys.clear(); pointer.down = false; activePointer = null; };
  function listen(target, name, handler, options) {
    target.addEventListener(name, handler, options);
    listeners.push(() => target.removeEventListener(name, handler, options));
  }
  function position(event) {
    Object.assign(pointer, point(event.clientX, event.clientY), { positioned: true });
    pointer.revision++;
  }
  listen(element, 'pointerdown', event => {
    if (fromControl(event.target) || activePointer !== null || event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
    element.focus?.({ preventScroll: true });
    activePointer = event.pointerId;
    position(event);
    pointer.down = true;
    try { element.setPointerCapture?.(event.pointerId); } catch { /* 이미 끝난 포인터 */ }
    event.preventDefault();
  });
  listen(element, 'pointermove', event => {
    if (event.isPrimary === false || (activePointer !== null && activePointer !== event.pointerId)) return;
    position(event);
  });
  function release(event, cancelled) {
    if (event.pointerId !== activePointer) return;
    position(event);
    pointer.down = false;
    activePointer = null;
    try { element.releasePointerCapture?.(event.pointerId); } catch { /* 자동 해제됨 */ }
    onRelease({ ...pointer, cancelled });
  }
  listen(element, 'pointerup', event => release(event, false));
  listen(element, 'pointercancel', event => release(event, true));
  listen(element, 'lostpointercapture', () => { pointer.down = false; activePointer = null; });
  listen(keyTarget, 'keydown', event => {
    const focused = element.ownerDocument?.activeElement;
    if (fromControl(event.target) || !allowedKeys.has(event.code) || !(focused === element || element.contains?.(focused))) return;
    heldKeys.add(event.code);
    event.preventDefault();
  });
  listen(keyTarget, 'keyup', event => {
    if (!heldKeys.delete(event.code)) return;
    onKeyRelease(event.code);
  });
  listen(keyTarget, 'blur', clearInput);
  listen(element, 'blur', clearInput, true);
  return {
    pointer,
    held: code => heldKeys.has(code),
    direction() {
      const x = Number(heldKeys.has('ArrowRight') || heldKeys.has('KeyD')) - Number(heldKeys.has('ArrowLeft') || heldKeys.has('KeyA'));
      const y = Number(heldKeys.has('ArrowDown') || heldKeys.has('KeyS')) - Number(heldKeys.has('ArrowUp') || heldKeys.has('KeyW'));
      const length = Math.hypot(x, y) || 1;
      return { x: x / length, y: y / length };
    },
    destroy() { listeners.splice(0).forEach(remove => remove()); heldKeys.clear(); pointer.down = false; activePointer = null; },
  };
}

/** 일시정지/탭 전환 뒤 큰 시간 점프가 생기지 않게 실행한다. */
export function createLoop(step, {
  maxDelta = 0.05,
  requestFrame = callback => requestAnimationFrame(callback),
  cancelFrame = id => cancelAnimationFrame(id),
  documentRef = globalThis.document,
} = {}) {
  let running = false, disposed = false, last = null, frame = null;
  const resetClock = () => { last = null; };
  documentRef?.addEventListener('visibilitychange', resetClock);
  function tick(timestamp) {
    if (!running) return;
    if (documentRef?.hidden) { last = null; frame = requestFrame(tick); return; }
    const dt = last === null ? 0 : clamp((timestamp - last) / 1000, 0, maxDelta);
    last = timestamp;
    try { step(dt, timestamp / 1000); }
    catch (error) { running = false; last = null; throw error; }
    if (running) frame = requestFrame(tick);
  }
  return {
    get running() { return running; },
    start() {
      if (disposed) throw new Error('종료한 실행 도구는 다시 시작할 수 없습니다.');
      if (running) return;
      running = true; last = null; frame = requestFrame(tick);
    },
    stop() { running = false; last = null; if (frame !== null) cancelFrame(frame); frame = null; },
    destroy() { this.stop(); disposed = true; documentRef?.removeEventListener('visibilitychange', resetClock); },
  };
}

/** 한 판의 상태와 제한시간만 관리한다. 성공 조건은 작품이 판단한다. */
export function createRound({ seconds } = {}) {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('제한시간은 양수여야 합니다.');
  let phase = 'ready', remaining = seconds;
  return {
    get phase() { return phase; },
    get remaining() { return remaining; },
    start() { remaining = seconds; phase = 'playing'; },
    pause() { if (phase === 'playing') phase = 'paused'; },
    resume() { if (phase === 'paused') phase = 'playing'; },
    finish(result) {
      if (!['won', 'lost'].includes(result)) throw new Error('게임 결과는 won 또는 lost여야 합니다.');
      if (phase === 'playing' || phase === 'paused') phase = result;
    },
    tick(dt) {
      if (!Number.isFinite(dt) || dt < 0) throw new Error('진행 시간은 0 이상이어야 합니다.');
      if (phase === 'playing') remaining = Math.max(0, remaining - dt);
      return remaining;
    },
  };
}

/** 논리 좌표를 고해상도 Canvas에 맞춘다. 장면 구성은 작품이 담당한다. */
export function createCanvasSurface(canvas, { width, height, maxDpr = 2 } = {}) {
  if (!(width > 0 && height > 0)) throw new Error('Canvas의 논리 크기가 필요합니다.');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이 브라우저에서 Canvas를 사용할 수 없습니다.');
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = clamp(globalThis.devicePixelRatio || 1, 1, maxDpr);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  return { ctx, width, height, resize, point: (x, y) => localPoint(canvas, x, y, width, height), destroy: () => observer.disconnect() };
}

export function loadImage(src, { timeoutMs = 8000, ImageClass = globalThis.Image } = {}) {
  return new Promise((resolve, reject) => {
    const image = new ImageClass();
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true; clearTimeout(timer); image.onload = image.onerror = null;
      error ? reject(error) : resolve(image);
    };
    const timer = setTimeout(() => finish(new Error('그림 불러오기 시간이 지났습니다: ' + src)), timeoutMs);
    image.decoding = 'async';
    image.onload = () => finish();
    image.onerror = () => finish(new Error('그림을 불러오지 못했습니다: ' + src));
    image.src = src;
  });
}

export function coverRect(imageWidth, imageHeight, width, height, focusX = 0.5, focusY = 0.5) {
  if (![imageWidth, imageHeight, width, height].every(value => Number.isFinite(value) && value > 0)) throw new Error('사진과 표시 영역의 크기가 필요합니다.');
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const sw = width / scale, sh = height / scale;
  return { sx: (imageWidth - sw) * clamp(focusX, 0, 1), sy: (imageHeight - sh) * clamp(focusY, 0, 1), sw, sh };
}

export function drawImageCover(ctx, image, x, y, width, height, focusX = 0.5, focusY = 0.5) {
  const { sx, sy, sw, sh } = coverRect(image.naturalWidth || image.width, image.naturalHeight || image.height, width, height, focusX, focusY);
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

export const circlesOverlap = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= (a.r + b.r) ** 2;
