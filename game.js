const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

let gameStarted = false;
let gameOver = false;
let level = 1;
let projectileActive = false;
let playerHealth = 5;
let bombFrequency = 2000; // Initial frequency of bombs in ms
let lastBombTime = 0; // Tracks time since last bomb drop
let hitEffect = false; // Trigger for hit effect

let mobile = false;
if (window.innerWidth <= 600 || window.innerHeight <= 800) mobile = true;

const shootSound = new Audio("sounds/lazer-shot.wav"); // Load the shoot sound effect
const hitSound = new Audio("sounds/hit.wav"); // Load the hit sound effect
const specialEnemySound = new Audio("sounds/emergency-warning.mp3"); // Load the special enemy sound effect

const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");
const shootButton = document.getElementById("shootButton");

if (mobile) {
  // Touch event listeners for mobile controls
  leftButton.addEventListener("touchstart", () => {
    moveLeft();
  });

  rightButton.addEventListener("touchstart", () => {
    moveRight();
  });

  shootButton.addEventListener("touchstart", () => {
    shoot();
  });

  leftButton.addEventListener("touchend", () => {
    player.dx = 0;
  });

  rightButton.addEventListener("touchend", () => {
    player.dx = 0;
  });
} else {
  leftButton.style.display = "none";
  rightButton.style.display = "none";
  shootButton.style.display = "none"; // Hide the buttons on desktop
}

function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth, 800);
  canvas.height = Math.min(window.innerHeight-120, 600);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const player = {
  x: canvas.width / 2 - (mobile ? 20 : 25),
  y: canvas.height - (mobile ? 48 : 60),
  width: mobile ? 40 : 50,
  height: mobile ? 48 : 60,
  speed: 5,
  dx: 0,
};
const enemies = [];
const projectiles = [];
const bombs = [];
const enemyWidth = mobile ? 30 : 50;
const enemyHeight = mobile ? 30 : 50;
const enemyRows = 3;
const enemyCols = mobile ? 6 : 8;
const projectileSpeed = 7;
let enemySpeed = mobile ? 1.5 : 2;
let bombSpeed = 1.5; // Slow initial bomb speed
let score = 0;

function createEnemies() {
  for (let row = 0; row < enemyRows; row++) {
    for (let col = 0; col < enemyCols; col++) {
      enemies.push({
        x: col * (enemyWidth + 10) + 30,
        y: row * (enemyHeight + 10) + 30,
        width: enemyWidth,
        height: enemyHeight,
        dx: enemySpeed,
      });
    }
  }
}

function drawPlayer() {
  if (hitEffect) {
    ctx.fillStyle = "red"; // Hit effect color
  } else {
    ctx.fillStyle = "green"; // Normal tree color
  }

  // Tree base triangle
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y); // Top of tree
  ctx.lineTo(player.x, player.y + player.height); // Bottom left
  ctx.lineTo(player.x + player.width, player.y + player.height); // Bottom right
  ctx.closePath();
  ctx.fill();

  // Tree decorations
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(player.x + 10, player.y + 20, 5, 0, Math.PI * 2); // Left ornament
  ctx.fill();

  ctx.beginPath();
  ctx.arc(player.x + player.width - 10, player.y + 30, 5, 0, Math.PI * 2); // Right ornament
  ctx.fill();

  ctx.beginPath();
  ctx.arc(player.x + player.width / 2, player.y + 45, 5, 0, Math.PI * 2); // Center ornament
  ctx.fill();
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(
      enemy.x + enemy.width / 2,
      enemy.y + enemy.height / 2,
      enemy.width / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "gold";
    ctx.fillRect(enemy.x + enemy.width / 2 - 5, enemy.y - 5, 10, 10);
    ctx.fillStyle = "gray";
    ctx.fillRect(enemy.x + enemy.width / 2 - 2, enemy.y - 10, 4, 5);
  });
}

function drawProjectiles() {
  ctx.fillStyle = "yellow";
  projectiles.forEach((projectile) => {
    ctx.fillRect(
      projectile.x,
      projectile.y,
      projectile.width,
      projectile.height
    );
  });
}

function drawBombs() {
  bombs.forEach((bomb) => {
    if (bomb.special) {
      ctx.fillStyle = "blue"; // Special enemy bomb color
    } else {
      ctx.fillStyle = "purple"; // Regular bomb color
    }
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, bomb.width / 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function clear() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function newPos() {
  player.x += player.dx;
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width)
    player.x = canvas.width - player.width;
}

function moveEnemies() {
  let hitWall = false;

  // Check if any enemy hits the wall
  enemies.forEach((enemy) => {
    if (enemy.x + enemy.width > canvas.width || enemy.x < 0) {
      hitWall = true;
    }
  });

  // If any enemy hits the wall, reverse direction and move the block down
  if (hitWall) {
    enemies.forEach((enemy) => {
      enemy.dx *= -1; // Reverse direction
      enemy.y += enemyHeight; // Move down

      if (enemy.y + enemy.height > canvas.height) { // If enemy reaches the bottom, it's game over
        playerHealth = 0;
        gameOver = true;
      }
    });
  }

  // Move all enemies in their current direction
  enemies.forEach((enemy) => {
    enemy.x += enemy.dx;
  });
}

function moveProjectiles() {
  projectiles.forEach((projectile, index) => {
    projectile.y -= projectileSpeed;
    if (projectile.y + projectile.height < 0) {
      projectiles.splice(index, 1);
      projectileActive = false;
    }
  });
}

function moveBombs() {
  bombs.forEach((bomb, index) => {
    bomb.y += bombSpeed;
    if (bomb.y > canvas.height) {
      bombs.splice(index, 1); // Remove bomb if off-screen
    }
  });
}

function dropBombs() {
  const currentTime = Date.now();
  if (currentTime - lastBombTime > bombFrequency) {
    enemies.forEach((enemy) => {
      if (Math.random() < 0.05) {
        // Low probability for dropping bomb
        bombs.push({
          x: enemy.x + enemy.width / 2,
          y: enemy.y + enemy.height,
          width: 10,
          height: 10,
        });
      }
    });
    lastBombTime = currentTime;
  }
}

function detectCollision() {
  // Enemy collision with player
  enemies.forEach((enemy, enemyIndex) => {
    projectiles.forEach((projectile, projectileIndex) => {
      if (
        projectile.x < enemy.x + enemy.width &&
        projectile.x + projectile.width > enemy.x &&
        projectile.y < enemy.y + enemy.height &&
        projectile.y + projectile.height > enemy.y
      ) {
        enemies.splice(enemyIndex, 1);
        projectiles.splice(projectileIndex, 1);
        score += 10;
        projectileActive = false;
      }
    });

    // If an enemy collides with the player, it's game over
    if (
      player.x < enemy.x + enemy.width &&
      player.x + player.width > enemy.x &&
      player.y < enemy.y + enemy.height
    ) {
      playerHealth = 0;
      gameOver = true;
    }
  });

  // Bomb collision with player
  bombs.forEach((bomb, bombIndex) => {
    if (
      player.x < bomb.x + bomb.width &&
      player.x + player.width > bomb.x &&
      player.y < bomb.y + bomb.height &&
      player.y + player.height > bomb.y
    ) {
      bombs.splice(bombIndex, 1);
      playerHealth -= 1;
      hitEffect = true;
      hitSound.play(); // Play the hit sound effect
      setTimeout(() => (hitEffect = false), 200);

      if (playerHealth <= 0) {
        gameOver = true;
      }
    }
  });

  // Check if all enemies are destroyed
  if (enemies.length === 0 && !gameOver) {
    level++;
    enemySpeed *= 1.15;
    bombFrequency = Math.max(bombFrequency * 0.9, 500);
    bombSpeed *= 1.05;
    createEnemies();
  }
}

function drawScore() {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 10, 20);
  ctx.fillText(`Level: ${level}`, 10, 50);
  ctx.fillText(`Health: ${playerHealth}`, 10, 80);
}

function drawGameOver() {
  ctx.fillStyle = "white";
  ctx.font = "40px Arial";
  ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2);
  restartButton.style.display = "block";
  projectileActive = false;
}

function moveRight() {
  player.dx = player.speed;
}
function moveLeft() {
  player.dx = -player.speed;
}
function shoot() {
  if (!projectileActive && !gameOver) {
    projectiles.push({
      x: player.x + player.width / 2 - 2.5,
      y: player.y,
      width: 5,
      height: 10,
    });
    projectileActive = true;
    shootSound.play(); // Play the shoot sound effect
  }
}

function keyDown(e) {
  if (e.key === "ArrowRight" || e.key === "Right") moveRight();
  else if (e.key === "ArrowLeft" || e.key === "Left") moveLeft();
  else if (e.key === " " || e.code === "Space") shoot();
}

function keyUp(e) {
  if (
    e.key === "ArrowRight" ||
    e.key === "Right" ||
    e.key === "ArrowLeft" ||
    e.key === "Left"
  )
    player.dx = 0;
}

function startGame() {
  gameStarted = true;
  gameOver = false;
  level = 1;
  score = 0;
  playerHealth = 5;
  enemySpeed = mobile ? 1.5 : 2;
  bombFrequency = 2000;
  bombSpeed = 1.5;
  specialEnemyLastAppearance = Date.now();
  enemies.length = 0;
  projectiles.length = 0;
  bombs.length = 0;
  player.x = canvas.width / 2 - 25;
  player.y = canvas.height - 60;
  startButton.style.display = "none";
  restartButton.style.display = "none";
  createEnemies();
  update();
}

document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
let specialEnemy = null;
let specialEnemyLastAppearance = Date.now();
const specialEnemyFrequency = 20000; // Minimum time between appearances in ms
const specialEnemySpeed = mobile ? 1.5 : 3;
const specialEnemyInitialDelay = 10000; // Initial delay before first appearance in ms

function createSpecialEnemy() {
  specialEnemy = {
    x: -enemyWidth,
    y: 10,
    width: enemyWidth,
    height: enemyHeight,
    dx: specialEnemySpeed,
  };
  specialEnemySound.play(); // Play the special enemy sound effect
}

function moveSpecialEnemy() {
  if (specialEnemy) {
    specialEnemy.x += specialEnemy.dx;
    if (specialEnemy.x > canvas.width) {
      resetSpecialEnemy();
    }
  }
}

function resetSpecialEnemy() {
  specialEnemy = null;
  specialEnemySound.pause(); // Stop the special enemy sound effect
  specialEnemySound.currentTime = 0; // Reset the sound effect
}

function drawSpecialEnemy() {
  if (specialEnemy) {
    // Draw the sleigh body
    ctx.fillStyle = "red";
    ctx.fillRect(
      specialEnemy.x,
      specialEnemy.y + specialEnemy.height / 3,
      specialEnemy.width,
      specialEnemy.height / 3
    );

    // Draw the sleigh seat
    ctx.fillStyle = "gold";
    ctx.fillRect(
      specialEnemy.x + specialEnemy.width / 4,
      specialEnemy.y,
      specialEnemy.width / 2,
      specialEnemy.height / 3
    );

    // Draw the sleigh runners
    ctx.strokeStyle = "brown";
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Left runner
    ctx.moveTo(specialEnemy.x, specialEnemy.y + (2 * specialEnemy.height) / 3);
    ctx.lineTo(
      specialEnemy.x + specialEnemy.width / 3,
      specialEnemy.y + specialEnemy.height
    );
    ctx.stroke();
    // Right runner
    ctx.beginPath();
    ctx.moveTo(
      specialEnemy.x + (2 * specialEnemy.width) / 3,
      specialEnemy.y + specialEnemy.height
    );
    ctx.lineTo(
      specialEnemy.x + specialEnemy.width,
      specialEnemy.y + (2 * specialEnemy.height) / 3
    );
    ctx.stroke();
  }
}

function dropSpecialEnemyBombs() {
  if (specialEnemy && Math.random() < 0.05) {
    bombs.push({
      x: specialEnemy.x + specialEnemy.width / 2,
      y: specialEnemy.y + specialEnemy.height,
      width: 10,
      height: 10,
      special: true, // Mark this bomb as a special enemy bomb
    });
  }
}

function checkSpecialEnemyAppearance() {
  const currentTime = Date.now();
  if (
    !specialEnemy &&
    currentTime - specialEnemyLastAppearance >
      specialEnemyFrequency + specialEnemyInitialDelay
  ) {
    createSpecialEnemy();
    specialEnemyLastAppearance = currentTime;
  }
}

function update() {
  if (!gameStarted) return;
  clear();
  drawPlayer();
  drawProjectiles();
  drawBombs();
  drawSpecialEnemy();
  newPos();
  moveEnemies();
  moveProjectiles();
  moveBombs();
  moveSpecialEnemy();
  detectCollision();
  drawEnemies();
  drawScore();
  if (gameOver) {
    drawGameOver();
    resetSpecialEnemy();
    return;
  }
  dropBombs();
  dropSpecialEnemyBombs();
  checkSpecialEnemyAppearance();
  requestAnimationFrame(update);
}