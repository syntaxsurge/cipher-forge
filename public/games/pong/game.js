(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const aiScoreEl = document.getElementById("aiScore");
  const playerScoreEl = document.getElementById("playerScore");
  const aiScorePillEl = document.getElementById("aiScorePill");
  const playerScorePillEl = document.getElementById("playerScorePill");
  const overlayEl = document.getElementById("overlay");
  const overlayTitleEl = document.getElementById("overlayTitle");
  const overlayTextEl = document.getElementById("overlayText");
  const startBtn = document.getElementById("startBtn");

  const WIN_SCORE = 7;
  const STATE = {
    running: false,
    aiScore: 0,
    playerScore: 0,
    playerInput: 0,
    playerTargetY: null,
    pointerActive: false,
    keyboardActive: false,
    aiSpeed: 460,
  };

  const game = {
    width: 0,
    height: 0,
    paddleWidth: 14,
    paddleHeight: 110,
    margin: 28,
    ballSize: 14,
    playerY: 0,
    aiY: 0,
    playerSpeed: 540,
    ballX: 0,
    ballY: 0,
    ballVX: 0,
    ballVY: 0,
  };

  let lastTime = 0;

  const plopSfx = new Audio("./assets/ping_pong_8bit_plop.wav");
  const beepSfx = new Audio("./assets/ping_pong_8bit_beeep.wav");
  plopSfx.preload = "auto";
  beepSfx.preload = "auto";

  function playSfx(audio) {
    const instance = audio.cloneNode();
    instance.volume = 0.4;
    void instance.play().catch(() => {});
  }

  function popScore(pillEl) {
    pillEl.classList.remove("score-pop");
    // Restart animation by forcing reflow.
    void pillEl.offsetWidth;
    pillEl.classList.add("score-pop");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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

    game.width = width;
    game.height = height;
    game.playerY = clamp(game.playerY || height * 0.5, game.paddleHeight * 0.5, height - game.paddleHeight * 0.5);
    game.aiY = clamp(game.aiY || height * 0.5, game.paddleHeight * 0.5, height - game.paddleHeight * 0.5);
  }

  function resetBall(direction) {
    game.ballX = game.width * 0.5;
    game.ballY = game.height * 0.5;
    const speed = 420;
    const angle = (Math.random() * 0.7 - 0.35);
    game.ballVX = speed * direction;
    game.ballVY = speed * angle;
  }

  function startMatch() {
    STATE.running = true;
    STATE.aiScore = 0;
    STATE.playerScore = 0;
    aiScoreEl.textContent = "0";
    playerScoreEl.textContent = "0";
    game.playerY = game.height * 0.5;
    game.aiY = game.height * 0.5;
    STATE.playerInput = 0;
    STATE.playerTargetY = null;
    canvas.focus();
    STATE.keyboardActive = true;
    resetBall(Math.random() > 0.5 ? 1 : -1);
    overlayEl.classList.add("hide");
    playSfx(beepSfx);
  }

  function endMatch(playerWon) {
    STATE.running = false;
    overlayTitleEl.textContent = playerWon ? "You Win" : "AI Wins";
    overlayTextEl.textContent = `Final score ${STATE.playerScore} - ${STATE.aiScore}. Play again?`;
    startBtn.textContent = "Rematch";
    overlayEl.classList.remove("hide");
    playSfx(beepSfx);
  }

  function scorePoint(playerScored) {
    if (playerScored) {
      STATE.playerScore += 1;
      playerScoreEl.textContent = String(STATE.playerScore);
      popScore(playerScorePillEl);
      playSfx(beepSfx);
      if (STATE.playerScore >= WIN_SCORE) {
        endMatch(true);
        return;
      }
      resetBall(-1);
    } else {
      STATE.aiScore += 1;
      aiScoreEl.textContent = String(STATE.aiScore);
      popScore(aiScorePillEl);
      playSfx(beepSfx);
      if (STATE.aiScore >= WIN_SCORE) {
        endMatch(false);
        return;
      }
      resetBall(1);
    }
  }

  function update(delta) {
    if (!STATE.running) return;

    if (STATE.pointerActive && STATE.playerTargetY !== null) {
      const dy = STATE.playerTargetY - game.playerY;
      const step = game.playerSpeed * delta;
      if (Math.abs(dy) <= step) {
        game.playerY = STATE.playerTargetY;
      } else {
        game.playerY += Math.sign(dy) * step;
      }
    } else if (STATE.playerInput !== 0) {
      game.playerY += STATE.playerInput * game.playerSpeed * delta;
    }

    game.playerY = clamp(
      game.playerY,
      game.paddleHeight * 0.5,
      game.height - game.paddleHeight * 0.5,
    );

    const aiDelta = game.ballY - game.aiY;
    const aiStep = STATE.aiSpeed * delta;
    if (Math.abs(aiDelta) <= aiStep) {
      game.aiY = game.ballY;
    } else {
      game.aiY += Math.sign(aiDelta) * aiStep;
    }
    game.aiY = clamp(
      game.aiY,
      game.paddleHeight * 0.5,
      game.height - game.paddleHeight * 0.5,
    );

    game.ballX += game.ballVX * delta;
    game.ballY += game.ballVY * delta;

    if (game.ballY <= game.ballSize * 0.5) {
      game.ballY = game.ballSize * 0.5;
      game.ballVY *= -1;
    }
    if (game.ballY >= game.height - game.ballSize * 0.5) {
      game.ballY = game.height - game.ballSize * 0.5;
      game.ballVY *= -1;
    }

    const playerX = game.width - game.margin - game.paddleWidth;
    const aiX = game.margin;
    const ballLeft = game.ballX - game.ballSize * 0.5;
    const ballRight = game.ballX + game.ballSize * 0.5;
    const ballTop = game.ballY - game.ballSize * 0.5;
    const ballBottom = game.ballY + game.ballSize * 0.5;

    const playerTop = game.playerY - game.paddleHeight * 0.5;
    const playerBottom = game.playerY + game.paddleHeight * 0.5;
    if (
      ballRight >= playerX &&
      ballLeft <= playerX + game.paddleWidth &&
      ballBottom >= playerTop &&
      ballTop <= playerBottom &&
      game.ballVX > 0
    ) {
      const offset = (game.ballY - game.playerY) / (game.paddleHeight * 0.5);
      game.ballX = playerX - game.ballSize * 0.5;
      game.ballVX = -Math.abs(game.ballVX) * 1.04;
      game.ballVY += offset * 130;
      playSfx(plopSfx);
    }

    const aiTop = game.aiY - game.paddleHeight * 0.5;
    const aiBottom = game.aiY + game.paddleHeight * 0.5;
    if (
      ballLeft <= aiX + game.paddleWidth &&
      ballRight >= aiX &&
      ballBottom >= aiTop &&
      ballTop <= aiBottom &&
      game.ballVX < 0
    ) {
      const offset = (game.ballY - game.aiY) / (game.paddleHeight * 0.5);
      game.ballX = aiX + game.paddleWidth + game.ballSize * 0.5;
      game.ballVX = Math.abs(game.ballVX) * 1.04;
      game.ballVY += offset * 130;
      playSfx(plopSfx);
    }

    if (game.ballX < -30) {
      scorePoint(true);
    } else if (game.ballX > game.width + 30) {
      scorePoint(false);
    }
  }

  function drawNet() {
    ctx.strokeStyle = "rgba(143, 188, 255, 0.25)";
    ctx.lineWidth = 2;
    const x = game.width * 0.5;
    for (let y = 0; y < game.height; y += 22) {
      ctx.beginPath();
      ctx.moveTo(x, y + 3);
      ctx.lineTo(x, y + 13);
      ctx.stroke();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, game.width, game.height);
    const bg = ctx.createLinearGradient(0, 0, game.width, game.height);
    bg.addColorStop(0, "#0d1628");
    bg.addColorStop(1, "#060b14");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, game.width, game.height);

    drawNet();

    const playerX = game.width - game.margin - game.paddleWidth;
    const aiX = game.margin;

    ctx.fillStyle = "#7ce4ff";
    ctx.fillRect(aiX, game.aiY - game.paddleHeight * 0.5, game.paddleWidth, game.paddleHeight);

    ctx.fillStyle = "#7effbf";
    ctx.fillRect(playerX, game.playerY - game.paddleHeight * 0.5, game.paddleWidth, game.paddleHeight);

    ctx.fillStyle = "#ffe27d";
    ctx.fillRect(
      game.ballX - game.ballSize * 0.5,
      game.ballY - game.ballSize * 0.5,
      game.ballSize,
      game.ballSize,
    );

    ctx.strokeStyle = "#101c30";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, game.width, game.height);
  }

  function loop(now) {
    if (lastTime === 0) lastTime = now;
    const delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    update(delta);
    draw();
    requestAnimationFrame(loop);
  }

  function bindPointer() {
    function setFromPointer(clientY) {
      const rect = canvas.getBoundingClientRect();
      const y = clientY - rect.top;
      STATE.playerTargetY = clamp(y, game.paddleHeight * 0.5, game.height - game.paddleHeight * 0.5);
    }

    canvas.addEventListener("pointerdown", (event) => {
      STATE.pointerActive = true;
      STATE.keyboardActive = true;
      canvas.focus();
      setFromPointer(event.clientY);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!STATE.pointerActive) return;
      setFromPointer(event.clientY);
    });
    window.addEventListener("pointerup", () => {
      STATE.pointerActive = false;
    });
  }

  function bindKeyboard() {
    const controlKeys = new Set(["arrowup", "arrowdown", "w", "s"]);

    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (controlKeys.has(key) && (STATE.keyboardActive || document.activeElement === canvas)) {
        event.preventDefault();
      }
      if (key === "arrowup" || key === "w") {
        STATE.playerInput = -1;
      }
      if (key === "arrowdown" || key === "s") {
        STATE.playerInput = 1;
      }
    });
    document.addEventListener("keyup", (event) => {
      const key = event.key.toLowerCase();
      if (controlKeys.has(key) && (STATE.keyboardActive || document.activeElement === canvas)) {
        event.preventDefault();
      }
      if (key === "arrowup" || key === "w" || key === "arrowdown" || key === "s") {
        STATE.playerInput = 0;
      }
    });

    canvas.addEventListener("focus", () => {
      STATE.keyboardActive = true;
    });
    canvas.addEventListener("blur", () => {
      STATE.keyboardActive = false;
      STATE.playerInput = 0;
    });
  }

  function bindMobileButtons() {
    document.querySelectorAll("[data-control]").forEach((button) => {
      const control = button.getAttribute("data-control");
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        STATE.playerInput = control === "up" ? -1 : 1;
      });
      button.addEventListener("pointerup", () => {
        STATE.playerInput = 0;
      });
      button.addEventListener("pointercancel", () => {
        STATE.playerInput = 0;
      });
      button.addEventListener("pointerleave", () => {
        STATE.playerInput = 0;
      });
    });
  }

  startBtn.addEventListener("click", () => {
    startBtn.textContent = "Start Match";
    startMatch();
  });
  window.addEventListener("resize", resize);

  resize();
  bindPointer();
  bindKeyboard();
  bindMobileButtons();
  draw();
  requestAnimationFrame(loop);
})();
