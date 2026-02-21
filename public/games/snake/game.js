(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const overlayEl = document.getElementById("overlay");
  const overlayTitleEl = document.getElementById("overlayTitle");
  const overlayTextEl = document.getElementById("overlayText");
  const startBtn = document.getElementById("startBtn");

  const STORAGE_KEY = "cipherforge_snake_best";
  const GRID_COLS = 28;
  const GRID_ROWS = 18;
  const TICK_MS = 110;

  let running = false;
  let lastTick = 0;
  let score = 0;
  let bestScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
  let direction = { x: 1, y: 0 };
  let pendingDirection = { x: 1, y: 0 };
  let food = { x: 12, y: 8 };
  let snake = [];
  let touchStart = null;
  let keyboardActive = false;

  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setDirection(nextX, nextY) {
    if (nextX === -direction.x && nextY === -direction.y) {
      return;
    }
    pendingDirection = { x: nextX, y: nextY };
  }

  function spawnFood() {
    let next = null;
    while (!next) {
      const x = Math.floor(Math.random() * GRID_COLS);
      const y = Math.floor(Math.random() * GRID_ROWS);
      const taken = snake.some((part) => part.x === x && part.y === y);
      if (!taken) {
        next = { x, y };
      }
    }
    food = next;
  }

  function startRun() {
    snake = [
      { x: 6, y: 9 },
      { x: 5, y: 9 },
      { x: 4, y: 9 },
    ];
    direction = { x: 1, y: 0 };
    pendingDirection = { x: 1, y: 0 };
    score = 0;
    scoreEl.textContent = "0";
    spawnFood();
    running = true;
    lastTick = performance.now();
    keyboardActive = true;
    canvas.focus();
    overlayEl.classList.add("hide");
  }

  function endRun(reason) {
    running = false;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(STORAGE_KEY, String(bestScore));
      bestEl.textContent = String(bestScore);
    }

    overlayTitleEl.textContent = "Game Over";
    overlayTextEl.textContent = `${reason} Your score: ${score}. Tap restart for another run.`;
    startBtn.textContent = "Restart";
    overlayEl.classList.remove("hide");
  }

  function step() {
    direction = pendingDirection;
    const head = snake[0];
    const next = {
      x: head.x + direction.x,
      y: head.y + direction.y,
    };

    if (
      next.x < 0 ||
      next.x >= GRID_COLS ||
      next.y < 0 ||
      next.y >= GRID_ROWS
    ) {
      endRun("You hit the wall.");
      return;
    }

    const hitSelf = snake.some((part) => part.x === next.x && part.y === next.y);
    if (hitSelf) {
      endRun("You hit your tail.");
      return;
    }

    snake.unshift(next);

    if (next.x === food.x && next.y === food.y) {
      score += 10;
      scoreEl.textContent = String(score);
      spawnFood();
      return;
    }

    snake.pop();
  }

  function draw() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const cellW = width / GRID_COLS;
    const cellH = height / GRID_ROWS;

    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#0a1323");
    bg.addColorStop(1, "#060a13");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(95, 143, 202, 0.16)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_COLS; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * cellW, 0);
      ctx.lineTo(x * cellW, height);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_ROWS; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellH);
      ctx.lineTo(width, y * cellH);
      ctx.stroke();
    }

    ctx.fillStyle = "#ff8f55";
    ctx.fillRect(food.x * cellW + 2, food.y * cellH + 2, cellW - 4, cellH - 4);

    for (let i = snake.length - 1; i >= 0; i -= 1) {
      const part = snake[i];
      const isHead = i === 0;
      ctx.fillStyle = isHead ? "#8af7c9" : "#47d49c";
      ctx.fillRect(part.x * cellW + 2, part.y * cellH + 2, cellW - 4, cellH - 4);
    }

    ctx.strokeStyle = "#10192b";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, width, height);
  }

  function frame(now) {
    if (running && now - lastTick >= TICK_MS) {
      lastTick = now;
      step();
    }
    draw();
    requestAnimationFrame(frame);
  }

  function bindControls() {
    const controlKeys = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"]);

    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (controlKeys.has(key) && (keyboardActive || document.activeElement === canvas)) {
        event.preventDefault();
      }
      if (key === "arrowup" || key === "w") setDirection(0, -1);
      if (key === "arrowdown" || key === "s") setDirection(0, 1);
      if (key === "arrowleft" || key === "a") setDirection(-1, 0);
      if (key === "arrowright" || key === "d") setDirection(1, 0);
    });

    document.addEventListener("keyup", (event) => {
      const key = event.key.toLowerCase();
      if (controlKeys.has(key) && (keyboardActive || document.activeElement === canvas)) {
        event.preventDefault();
      }
    });

    canvas.addEventListener("focus", () => {
      keyboardActive = true;
    });
    canvas.addEventListener("blur", () => {
      keyboardActive = false;
    });

    document.querySelectorAll("[data-dir]").forEach((button) => {
      button.addEventListener("pointerdown", () => {
        keyboardActive = true;
        canvas.focus();
        const dir = button.getAttribute("data-dir");
        if (dir === "up") setDirection(0, -1);
        if (dir === "down") setDirection(0, 1);
        if (dir === "left") setDirection(-1, 0);
        if (dir === "right") setDirection(1, 0);
      });
    });

    canvas.addEventListener(
      "touchstart",
      (event) => {
        keyboardActive = true;
        canvas.focus();
        const touch = event.changedTouches[0];
        touchStart = { x: touch.clientX, y: touch.clientY };
      },
      { passive: true },
    );

    canvas.addEventListener(
      "touchend",
      (event) => {
        if (!touchStart) return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 16) {
          setDirection(dx > 0 ? 1 : -1, 0);
        } else if (Math.abs(dy) > 16) {
          setDirection(0, dy > 0 ? 1 : -1);
        }
        touchStart = null;
      },
      { passive: true },
    );
  }

  startBtn.addEventListener("click", () => startRun());
  window.addEventListener("resize", resize);

  bestEl.textContent = String(bestScore);
  resize();
  bindControls();
  draw();
  requestAnimationFrame(frame);
})();
