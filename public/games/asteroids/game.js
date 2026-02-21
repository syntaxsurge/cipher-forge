(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const overlayTitleEl = document.getElementById("overlayTitle");
  const overlayTextEl = document.getElementById("overlayText");
  const playBtn = document.getElementById("playBtn");
  const runStateEl = document.getElementById("runState");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const levelEl = document.getElementById("level");
  const gameDialog = window.CipherForgeGameDialog.create({
    overlayEl: overlay,
    titleEl: overlayTitleEl,
    descriptionEl: overlayTextEl,
    actionButtonEl: playBtn,
  });

  const STATE_IDLE = "idle";
  const STATE_RUNNING = "running";
  const STATE_GAME_OVER = "game-over";
  const STAR_COUNT = 120;
  const SHIP_RADIUS = 14;
  const MAX_BULLETS = 5;
  const BULLET_SPEED = 660;
  const FIRE_COOLDOWN_MS = 160;

  const state = {
    mode: STATE_IDLE,
    width: 0,
    height: 0,
    score: 0,
    lives: 3,
    level: 1,
    ship: null,
    asteroids: [],
    bullets: [],
    particles: [],
    stars: [],
    keys: {
      left: false,
      right: false,
      thrust: false,
      fire: false,
    },
    pointer: {
      active: false,
      x: 0,
      y: 0,
    },
    keyboardActive: false,
    paused: false,
    fireCooldown: 0,
    respawnTimer: 0,
    lastTime: 0,
  };
  let audioCtx = null;
  let audioEnabled = false;

  function ensureAudioReady() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        return false;
      }
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    audioEnabled = audioCtx.state === "running";
    return audioEnabled;
  }

  function playTone({ type = "sine", from = 440, to = from, duration = 0.1, volume = 0.035 }) {
    if (!ensureAudioReady()) {
      return;
    }
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 2800;
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playStartSfx() {
    playTone({ type: "triangle", from: 260, to: 440, duration: 0.16, volume: 0.045 });
  }

  function playShootSfx() {
    playTone({ type: "square", from: 780, to: 520, duration: 0.06, volume: 0.028 });
  }

  function playExplosionSfx(size) {
    const base = size === 3 ? 170 : size === 2 ? 230 : 300;
    playTone({ type: "sawtooth", from: base * 2, to: base, duration: 0.12, volume: 0.042 });
  }

  function playShipHitSfx() {
    playTone({ type: "sawtooth", from: 190, to: 90, duration: 0.2, volume: 0.05 });
  }

  function playLevelUpSfx() {
    playTone({ type: "triangle", from: 360, to: 620, duration: 0.14, volume: 0.04 });
  }

  function playGameOverSfx() {
    playTone({ type: "square", from: 260, to: 70, duration: 0.26, volume: 0.05 });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function wrapPosition(point, radius) {
    if (point.x < -radius) point.x = state.width + radius;
    if (point.x > state.width + radius) point.x = -radius;
    if (point.y < -radius) point.y = state.height + radius;
    if (point.y > state.height + radius) point.y = -radius;
  }

  function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function createShip() {
    return {
      x: state.width * 0.5,
      y: state.height * 0.5,
      vx: 0,
      vy: 0,
      angle: -Math.PI * 0.5,
      alive: true,
      invulnerableMs: 1400,
    };
  }

  function createAsteroid(x, y, size, seedAngle) {
    const speedBase = 34 + Math.random() * 54 + (state.level - 1) * 5;
    const angle = seedAngle ?? Math.random() * Math.PI * 2;
    return {
      x,
      y,
      vx: Math.cos(angle) * speedBase,
      vy: Math.sin(angle) * speedBase,
      size,
      radius: size === 3 ? 54 : size === 2 ? 34 : 20,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() * 0.6 + 0.1) * (Math.random() > 0.5 ? 1 : -1),
      vertices: Array.from({ length: 10 }, (_, index) => {
        const t = (Math.PI * 2 * index) / 10;
        const jitter = 0.76 + Math.random() * 0.36;
        return { t, jitter };
      }),
    };
  }

  function spawnInitialAsteroids() {
    state.asteroids = [];
    const count = 3 + state.level;
    const center = { x: state.width * 0.5, y: state.height * 0.5 };
    for (let i = 0; i < count; i += 1) {
      let asteroid = null;
      while (!asteroid) {
        const x = Math.random() * state.width;
        const y = Math.random() * state.height;
        if (distanceSquared({ x, y }, center) > 200 * 200) {
          asteroid = createAsteroid(x, y, 3);
        }
      }
      state.asteroids.push(asteroid);
    }
  }

  function spawnStars() {
    state.stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      z: 0.2 + Math.random() * 1.2,
    }));
  }

  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    state.width = width;
    state.height = height;
    if (!state.stars.length) {
      spawnStars();
    }
  }

  function updateHud() {
    scoreEl.textContent = String(state.score);
    livesEl.textContent = String(state.lives);
    levelEl.textContent = String(state.level);
  }

  function startGame() {
    state.mode = STATE_RUNNING;
    state.paused = false;
    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.ship = createShip();
    state.bullets = [];
    state.particles = [];
    state.fireCooldown = 0;
    state.respawnTimer = 0;
    state.keyboardActive = true;
    canvas.focus();
    spawnInitialAsteroids();
    updateHud();
    gameDialog.hide();
    runStateEl.textContent = "Running";
    playStartSfx();
  }

  function nextLevel() {
    state.level += 1;
    state.ship.x = state.width * 0.5;
    state.ship.y = state.height * 0.5;
    state.ship.vx = 0;
    state.ship.vy = 0;
    state.ship.invulnerableMs = 1400;
    spawnInitialAsteroids();
    updateHud();
    playLevelUpSfx();
  }

  function gameOver() {
    state.mode = STATE_GAME_OVER;
    state.paused = false;
    gameDialog.show({
      title: "Game Over",
      description: `Final score: ${state.score}. Start a new run.`,
      actionLabel: "Play Again",
      onAction: startGame,
    });
    runStateEl.textContent = "Finished";
    playGameOverSfx();
  }

  function resumeGame() {
    if (state.mode !== STATE_RUNNING || !state.paused) {
      return;
    }
    state.paused = false;
    runStateEl.textContent = "Running";
    gameDialog.hide();
    playTone({
      type: "triangle",
      from: 440,
      to: 620,
      duration: 0.09,
      volume: 0.025,
    });
  }

  function togglePause() {
    if (state.mode !== STATE_RUNNING) {
      return;
    }
    if (state.paused) {
      resumeGame();
      return;
    }
    state.paused = true;
    runStateEl.textContent = "Paused";
    state.keys.left = false;
    state.keys.right = false;
    state.keys.thrust = false;
    state.keys.fire = false;
    gameDialog.show({
      title: "Paused",
      description: "Asteroids is paused. Resume when ready.",
      actionLabel: "Resume Mission",
      onAction: resumeGame,
    });
    playTone({
      type: "triangle",
      from: 360,
      to: 240,
      duration: 0.09,
      volume: 0.025,
    });
  }

  function explode(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 220;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7 + Math.random() * 0.6,
        ttl: 0.7 + Math.random() * 0.6,
        color,
      });
    }
  }

  function fireBullet() {
    if (!state.ship.alive || state.bullets.length >= MAX_BULLETS || state.fireCooldown > 0) {
      return;
    }

    const angle = state.ship.angle;
    const noseX = state.ship.x + Math.cos(angle) * SHIP_RADIUS;
    const noseY = state.ship.y + Math.sin(angle) * SHIP_RADIUS;
    state.bullets.push({
      x: noseX,
      y: noseY,
      vx: Math.cos(angle) * BULLET_SPEED + state.ship.vx,
      vy: Math.sin(angle) * BULLET_SPEED + state.ship.vy,
      life: 1.1,
    });
    state.fireCooldown = FIRE_COOLDOWN_MS;
    playShootSfx();
  }

  function splitAsteroid(asteroid, hitIndex) {
    const points = asteroid.size === 3 ? 20 : asteroid.size === 2 ? 50 : 100;
    state.score += points;
    playExplosionSfx(asteroid.size);

    explode(asteroid.x, asteroid.y, "#7ab6ff", asteroid.size === 3 ? 14 : 10);

    if (asteroid.size > 1) {
      const nextSize = asteroid.size - 1;
      state.asteroids.push(createAsteroid(asteroid.x, asteroid.y, nextSize, Math.random() * Math.PI * 2));
      state.asteroids.push(createAsteroid(asteroid.x, asteroid.y, nextSize, Math.random() * Math.PI * 2));
    }

    state.asteroids.splice(hitIndex, 1);
    updateHud();
    if (state.asteroids.length === 0) {
      nextLevel();
    }
  }

  function hitShip() {
    if (!state.ship.alive || state.ship.invulnerableMs > 0) {
      return;
    }

    explode(state.ship.x, state.ship.y, "#ff9a7a", 24);
    playShipHitSfx();
    state.lives -= 1;
    updateHud();

    if (state.lives <= 0) {
      state.ship.alive = false;
      gameOver();
      return;
    }

    state.ship.x = state.width * 0.5;
    state.ship.y = state.height * 0.5;
    state.ship.vx = 0;
    state.ship.vy = 0;
    state.ship.angle = -Math.PI * 0.5;
    state.ship.invulnerableMs = 1600;
    state.respawnTimer = 600;
  }

  function updateRunning(deltaMs) {
    const delta = deltaMs / 1000;
    const ship = state.ship;

    state.fireCooldown = Math.max(0, state.fireCooldown - deltaMs);
    if (ship.invulnerableMs > 0) {
      ship.invulnerableMs = Math.max(0, ship.invulnerableMs - deltaMs);
    }
    if (state.respawnTimer > 0) {
      state.respawnTimer = Math.max(0, state.respawnTimer - deltaMs);
    }

    const turnSpeed = 3.3;
    if (state.keys.left) ship.angle -= turnSpeed * delta;
    if (state.keys.right) ship.angle += turnSpeed * delta;
    if (state.keys.thrust && state.respawnTimer <= 0) {
      const accel = 360;
      ship.vx += Math.cos(ship.angle) * accel * delta;
      ship.vy += Math.sin(ship.angle) * accel * delta;
    }

    ship.vx *= 0.992;
    ship.vy *= 0.992;
    ship.vx = clamp(ship.vx, -500, 500);
    ship.vy = clamp(ship.vy, -500, 500);

    ship.x += ship.vx * delta;
    ship.y += ship.vy * delta;
    wrapPosition(ship, SHIP_RADIUS);

    if (state.keys.fire) {
      fireBullet();
    }

    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
      bullet.life -= delta;
      const outOfBounds =
        bullet.x < 0 ||
        bullet.x > state.width ||
        bullet.y < 0 ||
        bullet.y > state.height;
      if (bullet.life <= 0 || outOfBounds) {
        state.bullets.splice(i, 1);
      }
    }

    for (let i = state.asteroids.length - 1; i >= 0; i -= 1) {
      const asteroid = state.asteroids[i];
      asteroid.x += asteroid.vx * delta;
      asteroid.y += asteroid.vy * delta;
      asteroid.rotation += asteroid.rotationSpeed * delta;
      wrapPosition(asteroid, asteroid.radius);

      for (let j = state.bullets.length - 1; j >= 0; j -= 1) {
        const bullet = state.bullets[j];
        const radius = asteroid.radius + 2;
        if (distanceSquared(bullet, asteroid) <= radius * radius) {
          state.bullets.splice(j, 1);
          splitAsteroid(asteroid, i);
          break;
        }
      }
    }

    if (ship.alive && state.respawnTimer <= 0) {
      for (let i = 0; i < state.asteroids.length; i += 1) {
        const asteroid = state.asteroids[i];
        const hitRadius = asteroid.radius + SHIP_RADIUS - 3;
        if (distanceSquared(ship, asteroid) <= hitRadius * hitRadius) {
          hitShip();
          break;
        }
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const particle = state.particles[i];
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= 0.97;
      particle.vy *= 0.97;
      particle.life -= delta;
      if (particle.life <= 0) {
        state.particles.splice(i, 1);
      }
    }
  }

  function drawShip() {
    if (!state.ship || !state.ship.alive) {
      return;
    }

    if (state.ship.invulnerableMs > 0 && Math.floor(state.ship.invulnerableMs / 100) % 2 === 0) {
      return;
    }

    const ship = state.ship;
    const angle = ship.angle;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const tip = { x: ship.x + cos * SHIP_RADIUS, y: ship.y + sin * SHIP_RADIUS };
    const left = {
      x: ship.x + Math.cos(angle + 2.45) * SHIP_RADIUS,
      y: ship.y + Math.sin(angle + 2.45) * SHIP_RADIUS,
    };
    const right = {
      x: ship.x + Math.cos(angle - 2.45) * SHIP_RADIUS,
      y: ship.y + Math.sin(angle - 2.45) * SHIP_RADIUS,
    };

    ctx.strokeStyle = "#95d6ff";
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.stroke();

    if (state.keys.thrust && state.respawnTimer <= 0) {
      const flameBack = { x: ship.x - cos * (SHIP_RADIUS - 1), y: ship.y - sin * (SHIP_RADIUS - 1) };
      ctx.strokeStyle = "#ffbd7a";
      ctx.beginPath();
      ctx.moveTo(flameBack.x, flameBack.y);
      ctx.lineTo(
        flameBack.x + Math.cos(angle + Math.PI * 0.45) * 8,
        flameBack.y + Math.sin(angle + Math.PI * 0.45) * 8,
      );
      ctx.moveTo(flameBack.x, flameBack.y);
      ctx.lineTo(
        flameBack.x + Math.cos(angle - Math.PI * 0.45) * 8,
        flameBack.y + Math.sin(angle - Math.PI * 0.45) * 8,
      );
      ctx.stroke();
    }
  }

  function drawAsteroids() {
    ctx.strokeStyle = "#9bb2d1";
    ctx.lineWidth = 2;
    for (let i = 0; i < state.asteroids.length; i += 1) {
      const asteroid = state.asteroids[i];
      ctx.beginPath();
      for (let j = 0; j < asteroid.vertices.length; j += 1) {
        const vertex = asteroid.vertices[j];
        const radius = asteroid.radius * vertex.jitter;
        const angle = asteroid.rotation + vertex.t;
        const x = asteroid.x + Math.cos(angle) * radius;
        const y = asteroid.y + Math.sin(angle) * radius;
        if (j === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  function drawBullets() {
    ctx.fillStyle = "#f4ecb8";
    for (let i = 0; i < state.bullets.length; i += 1) {
      const bullet = state.bullets[i];
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles() {
    for (let i = 0; i < state.particles.length; i += 1) {
      const particle = state.particles[i];
      const alpha = clamp(particle.life / particle.ttl, 0, 1);
      ctx.fillStyle = `${particle.color}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
      ctx.fillRect(particle.x - 1, particle.y - 1, 2.2, 2.2);
    }
  }

  function drawBackground() {
    const bg = ctx.createLinearGradient(0, 0, state.width, state.height);
    bg.addColorStop(0, "#0a1223");
    bg.addColorStop(1, "#050910");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, state.width, state.height);

    for (let i = 0; i < state.stars.length; i += 1) {
      const star = state.stars[i];
      const twinkle = 0.55 + Math.sin((performance.now() / 500) * star.z + i) * 0.25;
      ctx.fillStyle = `rgba(194, 223, 255, ${twinkle})`;
      const size = star.z;
      ctx.fillRect(star.x, star.y, size, size);
    }

    ctx.strokeStyle = "#101d30";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, state.width, state.height);
  }

  function draw() {
    drawBackground();
    drawAsteroids();
    drawBullets();
    drawShip();
    drawParticles();
  }

  function frame(now) {
    if (state.lastTime === 0) {
      state.lastTime = now;
    }
    const deltaMs = Math.min(34, now - state.lastTime);
    state.lastTime = now;

    if (state.mode === STATE_RUNNING && !state.paused) {
      updateRunning(deltaMs);
    }
    draw();
    requestAnimationFrame(frame);
  }

  function setControl(control, active) {
    if (control === "left") state.keys.left = active;
    if (control === "right") state.keys.right = active;
    if (control === "thrust") state.keys.thrust = active;
    if (control === "fire") state.keys.fire = active;
  }

  function resetMomentaryControls() {
    if (!state.pointer.active) {
      return;
    }
    state.keys.left = false;
    state.keys.right = false;
    state.keys.thrust = false;
  }

  function updatePointerControls(clientX, clientY) {
    state.pointer.x = clientX;
    state.pointer.y = clientY;
    resetMomentaryControls();

    const horizontalZone = state.width * 0.3;
    const verticalZone = state.height * 0.4;
    if (clientX < horizontalZone) {
      state.keys.left = true;
    } else if (clientX > state.width - horizontalZone) {
      state.keys.right = true;
    } else {
      state.keys.thrust = clientY < state.height - verticalZone;
    }
  }

  function bindKeyboard() {
    const controlKeys = new Set(["arrowleft", "arrowright", "arrowup", "a", "d", "w", " ", "enter", "p", "escape"]);

    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (controlKeys.has(key)) {
        ensureAudioReady();
      }
      if (controlKeys.has(key) && (state.keyboardActive || document.activeElement === canvas)) {
        event.preventDefault();
      }
      if (key === "arrowleft" || key === "a") state.keys.left = true;
      if (key === "arrowright" || key === "d") state.keys.right = true;
      if (key === "arrowup" || key === "w") state.keys.thrust = true;
      if (key === " " || key === "spacebar" || key === "enter") {
        state.keys.fire = true;
      }
      if (key === "p" || key === "escape") {
        togglePause();
      }
    });

    document.addEventListener("keyup", (event) => {
      const key = event.key.toLowerCase();
      if (controlKeys.has(key) && (state.keyboardActive || document.activeElement === canvas)) {
        event.preventDefault();
      }
      if (key === "arrowleft" || key === "a") state.keys.left = false;
      if (key === "arrowright" || key === "d") state.keys.right = false;
      if (key === "arrowup" || key === "w") state.keys.thrust = false;
      if (key === " " || key === "spacebar" || key === "enter") {
        state.keys.fire = false;
      }
    });

    canvas.addEventListener("focus", () => {
      state.keyboardActive = true;
    });
    canvas.addEventListener("blur", () => {
      state.keyboardActive = false;
      state.keys.left = false;
      state.keys.right = false;
      state.keys.thrust = false;
      state.keys.fire = false;
    });
  }

  function bindPointer() {
    canvas.addEventListener("pointerdown", (event) => {
      ensureAudioReady();
      state.pointer.active = true;
      state.keyboardActive = true;
      canvas.focus();
      updatePointerControls(event.clientX, event.clientY);
      if (state.mode === STATE_RUNNING) {
        fireBullet();
      }
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!state.pointer.active) {
        return;
      }
      updatePointerControls(event.clientX, event.clientY);
    });

    const stopPointer = () => {
      state.pointer.active = false;
      state.keys.left = false;
      state.keys.right = false;
      state.keys.thrust = false;
    };

    window.addEventListener("pointerup", stopPointer);
    window.addEventListener("pointercancel", stopPointer);
  }

  function bindButtons() {
    document.querySelectorAll("[data-control]").forEach((button) => {
      const control = button.getAttribute("data-control");
      const activate = (event) => {
        event.preventDefault();
        ensureAudioReady();
        if (control === "fire") {
          if (state.mode === STATE_RUNNING) {
            fireBullet();
          }
          state.keys.fire = true;
          return;
        }
        if (control === "pause") {
          togglePause();
          return;
        }
        setControl(control, true);
      };
      const deactivate = (event) => {
        event.preventDefault();
        setControl(control, false);
      };

      button.addEventListener("pointerdown", activate);
      button.addEventListener("pointerup", deactivate);
      button.addEventListener("pointercancel", deactivate);
      button.addEventListener("pointerleave", deactivate);
    });
  }

  window.addEventListener("resize", () => {
    resize();
    if (state.mode !== STATE_RUNNING) {
      draw();
    }
  });

  resize();
  bindKeyboard();
  bindPointer();
  bindButtons();
  updateHud();
  runStateEl.textContent = "Ready";
  gameDialog.show({
    title: "Asteroids",
    description:
      "Destroy asteroids, survive incoming waves, and protect your lives.",
    actionLabel: "Play",
    onAction: () => {
      ensureAudioReady();
      startGame();
    },
  });
  draw();
  requestAnimationFrame(frame);
})();
