const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

let gameStarted = false;
let gameOver = false;
let level = 1;
let projectileActive = false;
let playerHealth = 4;
let bombFrequency = 2000; // Initial frequency of bombs in ms
let lastBombTime = 0; // Tracks time since last bomb drop
let hitEffect = false; // Trigger for hit effect

function resizeCanvas() {
  canvas.width = window.innerWidth > 800 ? 800 : window.innerWidth;
  canvas.height = window.innerHeight > 600 ? 600 : window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const player = {
  x: canvas.width / 2 - 25,
  y: canvas.height - 60,
  width: 50,
  height: 60,
  speed: 5,
  dx: 0,
};

const enemies = [];
const projectiles = [];
const bombs = [];
const enemyWidth = 50;
const enemyHeight = 50;
let enemySpeed = 2;
const enemyRows = 3;
const enemyCols = 8;
const projectileSpeed = 7;
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
  ctx.fillStyle = "purple";
  bombs.forEach((bomb) => {
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
  enemies.forEach((enemy) => {
    enemy.x += enemy.dx;
    if (enemy.x + enemy.width > canvas.width || enemy.x < 0) {
      enemy.dx *= -1;
      enemy.y += enemyHeight;
    }
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
      player.y < enemy.y + enemy.height &&
      player.y + player.height > enemy.y
    ) {
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
}

function update() {
  if (!gameStarted) return;
  clear();
  drawPlayer();
  drawEnemies();
  drawProjectiles();
  drawBombs();
  drawScore();
  newPos();
  moveEnemies();
  moveProjectiles();
  moveBombs();
  detectCollision();
  if (gameOver) {
    drawGameOver();
    return;
  }
  dropBombs();
  requestAnimationFrame(update);
}

function moveRight() {
  player.dx = player.speed;
}
function moveLeft() {
  player.dx = -player.speed;
}
function shoot() {
  if (!projectileActive) {
    projectiles.push({
      x: player.x + player.width / 2 - 2.5,
      y: player.y,
      width: 5,
      height: 10,
    });
    projectileActive = true;
  }
}

function keyDown(e) {
  if (e.key === "ArrowRight" || e.key === "Right") moveRight();
  else if (e.key === "ArrowLeft" || e.key === "Left") moveLeft();
  else if (e.key === " " || e.key === "Spacebar") shoot();
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
  playerHealth = 4;
  enemySpeed = 2;
  bombFrequency = 2000;
  bombSpeed = 1.5;
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
