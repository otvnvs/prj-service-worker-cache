// ─── State ────────────────────────────────────────────────────────────────────

const W = () => window.innerWidth;
const H = () => window.innerHeight;

const state = {
  running: false,
  score: 0,
  level: 1,
  lives: 3,
  maxLives: 3,
  player: {
    x: 0,
    y: 0,
    w: 32,
    h: 40,
    speed: 4.5,
    invincible: false,
    spreadShot: false,
    spreadTimer: 0,
  },
  bullets: [],
  enemyBullets: [],
  enemies: [],
  powerups: [],
  explosions: [],
  keys: {},
  shootCooldown: 0,
  enemyShootTimer: 0,
  spawnTimer: 0,
  spawnInterval: 120,
  bossActive: false,
  boss: null,
  levelTimer: 0,
  enemiesKilled: 0,
  levelTarget: 12,
  frameId: null,
};

// ─── DOM references ───────────────────────────────────────────────────────────

const arena = document.getElementById('arena');
const playerEl = document.getElementById('player');
const engineEl = document.getElementById('player-engine');
const scoreEl = document.getElementById('hud-score');
const livesEl = document.getElementById('hud-lives');
const levelEl = document.getElementById('hud-level');
const swEl = document.getElementById('sw-indicator');
const bossBar = document.getElementById('boss-bar');
const bossBarFill = document.getElementById('boss-bar-fill');
const startScreen = document.getElementById('screen-start');
const gameoverScreen = document.getElementById('screen-gameover');
const finalScoreEl = document.getElementById('final-score');

// ─── Stars ────────────────────────────────────────────────────────────────────

function buildStars() {
  const counts = [30, 55, 90];
  const speeds = [18, 9, 4.5];
  document.querySelectorAll('.star-layer').forEach((layer, i) => {
    for (let s = 0; s < counts[i]; s++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDuration =
        speeds[i] + Math.random() * speeds[i] + 's';
      star.style.animationDelay = -Math.random() * 20 + 's';
      layer.appendChild(star);
    }
  });
}

// ─── Player ───────────────────────────────────────────────────────────────────

function initPlayer() {
  const p = state.player;
  p.x = W() / 2;
  p.y = H() - 100;
  p.invincible = false;
  p.spreadShot = false;
  p.spreadTimer = 0;
  updatePlayerEl();
}

function updatePlayerEl() {
  const p = state.player;
  playerEl.style.left = p.x + 'px';
  playerEl.style.top = p.y + 'px';
}

function movePlayer() {
  const p = state.player;
  if (state.keys['ArrowLeft'] || state.keys['a'])
    p.x = Math.max(p.w / 2, p.x - p.speed);
  if (state.keys['ArrowRight'] || state.keys['d'])
    p.x = Math.min(W() - p.w / 2, p.x + p.speed);
  if (state.keys['ArrowUp'] || state.keys['w'])
    p.y = Math.max(60, p.y - p.speed);
  if (state.keys['ArrowDown'] || state.keys['s'])
    p.y = Math.min(H() - p.h, p.y + p.speed);
  updatePlayerEl();
}

// ─── Bullets ─────────────────────────────────────────────────────────────────

function spawnBullet() {
  if (state.shootCooldown > 0) return;
  const p = state.player;

  if (p.spreadShot) {
    // Three-way spread
    for (const dx of [-1.8, 0, 1.8]) {
      createBullet(p.x + dx, p.y, -9, 'bullet-player-spread');
    }
    state.shootCooldown = 10;
  } else {
    createBullet(p.x, p.y, -10, 'bullet-player');
    state.shootCooldown = 8;
  }
}

function createBullet(x, y, vy, cls) {
  const el = document.createElement('div');
  el.className = 'bullet ' + cls;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  arena.appendChild(el);
  state.bullets.push({ x, y, vy, el, cls });
}

function createEnemyBullet(x, y, vx, vy, cls) {
  const el = document.createElement('div');
  el.className = 'bullet ' + cls;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  arena.appendChild(el);
  state.enemyBullets.push({ x, y, vx, vy, el });
}

function updateBullets() {
  state.bullets = state.bullets.filter((b) => {
    b.y += b.vy;
    b.x += b.vx || 0;
    b.el.style.top = b.y + 'px';
    b.el.style.left = b.x + 'px';
    if (b.y < -20) {
      b.el.remove();
      return false;
    }
    return true;
  });

  state.enemyBullets = state.enemyBullets.filter((b) => {
    b.y += b.vy;
    b.x += b.vx || 0;
    b.el.style.top = b.y + 'px';
    b.el.style.left = b.x + 'px';
    if (b.y > H() + 20) {
      b.el.remove();
      return false;
    }
    return true;
  });
}

// ─── Enemies ─────────────────────────────────────────────────────────────────

const ENEMY_TYPES = ['a', 'b', 'c'];

function spawnEnemy() {
  const lvl = state.level;
  // Bias toward heavier types as level rises
  const pool =
    lvl >= 3
      ? ['a', 'a', 'b', 'b', 'c', 'c']
      : lvl >= 2
        ? ['a', 'a', 'a', 'b', 'b', 'c']
        : ['a', 'a', 'a', 'a', 'b', 'b'];
  const type = pool[Math.floor(Math.random() * pool.length)];
  const hp = { a: 1, b: 2, c: 4 }[type];
  const speed = (0.6 + Math.random() * 0.6) * (1 + (lvl - 1) * 0.15);
  const x = 40 + Math.random() * (W() - 80);

  const el = document.createElement('div');
  el.className = `enemy enemy-${type}`;
  el.style.left = x + 'px';
  el.style.top = '-50px';
  arena.appendChild(el);

  state.enemies.push({
    x,
    y: -50,
    type,
    hp,
    maxHp: hp,
    speed,
    el,
    dx: (Math.random() - 0.5) * 1.5,
    shootTimer: Math.floor(Math.random() * 80),
  });
}

function spawnBoss() {
  state.bossActive = true;
  const hp = 30 + state.level * 20;
  const el = document.createElement('div');
  el.className = 'enemy enemy-boss';
  el.style.left = W() / 2 + 'px';
  el.style.top = '-80px';
  const shield = document.createElement('div');
  shield.className = 'enemy-boss-shield';
  el.appendChild(shield);
  arena.appendChild(el);
  state.boss = {
    x: W() / 2,
    y: -80,
    hp,
    maxHp: hp,
    el,
    dx: 1.4 + state.level * 0.2,
    dy: 0.3,
    phase: 0,
    shootTimer: 0,
  };
  bossBar.classList.remove('hidden');
  bossBarFill.style.width = '100%';
}

function updateEnemies() {
  state.enemies = state.enemies.filter((e) => {
    e.y += e.speed;
    e.x += e.dx;
    // Bounce off walls
    if (e.x < 20 || e.x > W() - 20) e.dx *= -1;
    e.el.style.top = e.y + 'px';
    e.el.style.left = e.x + 'px';

    // Enemy shooting
    e.shootTimer--;
    if (e.shootTimer <= 0) {
      const interval = Math.max(60, 140 - state.level * 10);
      e.shootTimer = interval + Math.floor(Math.random() * 40);
      if (e.type === 'c') {
        createEnemyBullet(e.x, e.y + 20, -0.5, 5, 'bullet-enemy-heavy');
        createEnemyBullet(e.x, e.y + 20, 0.5, 5, 'bullet-enemy-heavy');
      } else {
        createEnemyBullet(
          e.x,
          e.y + 14,
          0,
          5 + state.level * 0.3,
          'bullet-enemy'
        );
      }
    }

    if (e.y > H() + 60) {
      e.el.remove();
      return false;
    }
    return true;
  });

  // Boss movement
  if (state.boss) {
    const b = state.boss;
    b.x += b.dx;
    b.y += b.dy;
    if (b.x < 60 || b.x > W() - 60) b.dx *= -1;
    if (b.y > 140) b.dy = 0;
    b.el.style.left = b.x + 'px';
    b.el.style.top = b.y + 'px';

    // Boss shooting pattern
    b.shootTimer++;
    if (b.shootTimer % 30 === 0) {
      const spread = Math.floor(b.shootTimer / 30) % 3;
      if (spread === 0) {
        // Straight volley
        for (let i = -2; i <= 2; i++) {
          createEnemyBullet(
            b.x + i * 12,
            b.y + 30,
            i * 0.4,
            5.5,
            'bullet-boss'
          );
        }
      } else if (spread === 1) {
        // Fan
        for (let i = -1; i <= 1; i++) {
          createEnemyBullet(
            b.x + i * 18,
            b.y + 30,
            i * 1.2,
            6,
            'bullet-enemy-heavy'
          );
        }
      } else {
        // Aimed
        const p = state.player;
        const angle = Math.atan2(p.y - b.y, p.x - b.x);
        createEnemyBullet(
          b.x,
          b.y + 30,
          Math.cos(angle) * 6,
          Math.sin(angle) * 6,
          'bullet-boss'
        );
      }
    }
    bossBarFill.style.width = (b.hp / b.maxHp) * 100 + '%';
  }
}

// ─── Powerups ─────────────────────────────────────────────────────────────────

function maybePowerup(x, y) {
  if (Math.random() > 0.18) return;
  const el = document.createElement('div');
  el.className = 'powerup';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  arena.appendChild(el);
  state.powerups.push({ x, y, el });
}

function updatePowerups() {
  state.powerups = state.powerups.filter((p) => {
    p.y += 2;
    p.el.style.top = p.y + 'px';
    if (p.y > H() + 30) {
      p.el.remove();
      return false;
    }

    // Collect
    const pl = state.player;
    if (Math.abs(pl.x - p.x) < 20 && Math.abs(pl.y - p.y) < 20) {
      p.el.remove();
      activatePowerup();
      return false;
    }
    return true;
  });
}

function activatePowerup() {
  state.player.spreadShot = true;
  state.player.spreadTimer = 300;
  state.score += 50;
}

// ─── Collisions ───────────────────────────────────────────────────────────────

function checkCollisions() {
  const pl = state.player;

  // Player bullets vs enemies
  state.bullets = state.bullets.filter((b) => {
    let hit = false;

    // vs boss
    if (state.boss) {
      const bo = state.boss;
      if (Math.abs(b.x - bo.x) < 32 && Math.abs(b.y - bo.y) < 26) {
        bo.hp--;
        b.el.remove();
        hit = true;
        if (bo.hp <= 0) killBoss();
      }
    }

    if (!hit) {
      state.enemies = state.enemies.filter((e) => {
        const size = { a: 14, b: 20, c: 22 }[e.type] || 16;
        if (!hit && Math.abs(b.x - e.x) < size && Math.abs(b.y - e.y) < size) {
          e.hp--;
          hit = true;
          b.el.remove();
          flashEnemy(e);
          if (e.hp <= 0) {
            killEnemy(e);
            return false;
          }
        }
        return true;
      });
    }
    return !hit;
  });

  if (pl.invincible) return;

  // Enemy bullets vs player
  state.enemyBullets = state.enemyBullets.filter((b) => {
    if (Math.abs(b.x - pl.x) < 14 && Math.abs(b.y - pl.y) < 18) {
      b.el.remove();
      hitPlayer();
      return false;
    }
    return true;
  });

  // Enemies vs player (ramming)
  state.enemies.forEach((e) => {
    const size = { a: 14, b: 20, c: 22 }[e.type] || 16;
    if (Math.abs(e.x - pl.x) < size && Math.abs(e.y - pl.y) < size) {
      hitPlayer();
    }
  });
}

function flashEnemy(e) {
  e.el.classList.add('hit');
  setTimeout(() => e.el.classList.remove('hit'), 150);
}

function killEnemy(e) {
  const size = { a: 'sm', b: 'md', c: 'md' }[e.type] || 'sm';
  spawnExplosion(e.x, e.y, size);
  e.el.remove();
  const pts = { a: 100, b: 200, c: 400 }[e.type] || 100;
  state.score += pts * state.level;
  state.enemiesKilled++;
  maybePowerup(e.x, e.y);
}

function killBoss() {
  spawnExplosion(state.boss.x, state.boss.y, 'lg');
  shakeScreen();
  state.boss.el.remove();
  state.score += 5000 * state.level;
  state.boss = null;
  state.bossActive = false;
  bossBar.classList.add('hidden');
  state.enemiesKilled += 10;
  // Extra life reward
  if (state.lives < state.maxLives) state.lives++;
  nextLevel();
}

function hitPlayer() {
  if (state.player.invincible) return;
  state.lives--;
  spawnExplosion(state.player.x, state.player.y, 'sm');
  shakeScreen();
  updateHUD();
  if (state.lives <= 0) {
    gameOver();
    return;
  }
  // Brief invincibility
  state.player.invincible = true;
  playerEl.classList.add('invincible');
  setTimeout(() => {
    state.player.invincible = false;
    playerEl.classList.remove('invincible');
  }, 2000);
}

// ─── Explosions ───────────────────────────────────────────────────────────────

function spawnExplosion(x, y, size) {
  const el = document.createElement('div');
  el.className = `explosion explosion-${size}`;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  arena.appendChild(el);
  const duration = { sm: 400, md: 500, lg: 800 }[size] || 400;
  setTimeout(() => el.remove(), duration);
}

function shakeScreen() {
  arena.classList.add('shake');
  setTimeout(() => arena.classList.remove('shake'), 260);
}

// ─── Level progression ────────────────────────────────────────────────────────

function checkLevelProgress() {
  if (state.bossActive) return;
  if (state.enemiesKilled >= state.levelTarget && !state.bossActive) {
    // Clear remaining enemies, spawn boss
    state.enemies.forEach((e) => e.el.remove());
    state.enemies = [];
    state.enemyBullets.forEach((b) => b.el.remove());
    state.enemyBullets = [];
    spawnBoss();
  }
}

function nextLevel() {
  state.level++;
  state.enemiesKilled = 0;
  state.levelTarget = 12 + state.level * 4;
  state.spawnInterval = Math.max(45, 120 - state.level * 10);
  showLevelBanner();
}

function showLevelBanner() {
  const old = document.getElementById('level-banner');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'level-banner';
  el.innerHTML = `<h2>Level ${state.level}</h2><p>ENEMIES INCOMING</p>`;
  arena.appendChild(el);
  setTimeout(() => el.remove(), 2100);
}

// ─── HUD ──────────────────────────────────────────────────────────────────────

function updateHUD() {
  scoreEl.textContent = String(state.score).padStart(6, '0');
  levelEl.textContent = state.level;
  livesEl.innerHTML = '';
  for (let i = 0; i < state.maxLives; i++) {
    const ic = document.createElement('div');
    ic.className = 'life-icon' + (i >= state.lives ? ' lost' : '');
    livesEl.appendChild(ic);
  }
}

// ─── Main loop ────────────────────────────────────────────────────────────────

function gameLoop() {
  if (!state.running) return;

  // Input
  if (state.keys[' '] || state.keys['z']) spawnBullet();
  if (state.shootCooldown > 0) state.shootCooldown--;

  // Spread shot timer
  if (state.player.spreadShot) {
    state.player.spreadTimer--;
    if (state.player.spreadTimer <= 0) state.player.spreadShot = false;
  }

  movePlayer();

  // Spawn enemies
  if (!state.bossActive) {
    state.spawnTimer++;
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0;
      spawnEnemy();
    }
  }

  updateEnemies();
  updateBullets();
  updatePowerups();
  checkCollisions();
  checkLevelProgress();
  updateHUD();

  state.frameId = requestAnimationFrame(gameLoop);
}

// ─── Game start / over ────────────────────────────────────────────────────────

function startGame() {
  // Reset
  Object.assign(state, {
    running: true,
    score: 0,
    level: 1,
    lives: 3,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    powerups: [],
    explosions: [],
    shootCooldown: 0,
    enemyShootTimer: 0,
    spawnTimer: 0,
    spawnInterval: 120,
    bossActive: false,
    boss: null,
    enemiesKilled: 0,
    levelTarget: 12,
  });
  state.player.spreadShot = false;
  state.player.invincible = false;

  // Clear arena entities
  document
    .querySelectorAll('.bullet, .enemy, .powerup, .explosion, #level-banner')
    .forEach((el) => el.remove());
  playerEl.classList.remove('invincible');
  bossBar.classList.add('hidden');

  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');

  initPlayer();
  updateHUD();
  showLevelBanner();
  cancelAnimationFrame(state.frameId);
  state.frameId = requestAnimationFrame(gameLoop);
}

function gameOver() {
  state.running = false;
  cancelAnimationFrame(state.frameId);
  finalScoreEl.textContent = String(state.score).padStart(6, '0');
  gameoverScreen.classList.remove('hidden');
}

// ─── Input ────────────────────────────────────────────────────────────────────

window.addEventListener('keydown', (e) => {
  state.keys[e.key] = true;
  if (e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  state.keys[e.key] = false;
});

// Touch controls
let touchX = null,
  touchY = null;
window.addEventListener('touchstart', (e) => {
  touchX = e.touches[0].clientX;
  touchY = e.touches[0].clientY;
  state.keys[' '] = true;
});
window.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault();
    const dx = e.touches[0].clientX - touchX;
    const dy = e.touches[0].clientY - touchY;
    state.player.x = Math.max(16, Math.min(W() - 16, state.player.x + dx));
    state.player.y = Math.max(60, Math.min(H() - 40, state.player.y + dy));
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  },
  { passive: false }
);
window.addEventListener('touchend', () => {
  state.keys[' '] = false;
});

// ─── SW control ─────────────────────────────────────────────────────────────────

function sendActionToSW(action) {
  const sw = navigator.serviceWorker?.controller;
  if (!sw) {
    log('No active Service Worker — try reloading the page.', 'err');
    return;
  }
  //setStatus(action === 'CLEAN_UP' ? 'Dehydrating...' : 'Rehydrating...');
  console.log(`Sending: ${action}`, 'info');
  sw.postMessage({ action });
}

navigator.serviceWorker?.addEventListener('message', (event) => {
  const { type, action, ok, error } = event.data || {};

  if (type === 'UPDATE_AVAILABLE') {
    console.log('New SW version detected — reloading.', 'info');
    window.location.reload();
    return;
  }

  if (type === 'ACTION_DONE') {
    if (!ok) {
      console.log(`Failed (${action}): ${error}`, 'err');
      //setStatus(`Error: ${error}`);
    } else if (action === 'CLEAN_UP') {
      console.log('Cache wiped.', 'ok');
      //setStatus('Cache wiped.');
    } else if (action === 'REFRESH_ALL') {
      console.log('Cache refreshed — reloading.', 'ok');
      //setStatus('Cache refreshed. Reloading...');
      setTimeout(() => window.location.reload(), 600);
    }
    //setButtonsBusy(false);
    //refreshCacheList();
  }
});

// ─── SW badge ─────────────────────────────────────────────────────────────────

async function updateSWBadge() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg && reg.active) {
    swEl.textContent = 'SW: cached';
    swEl.classList.add('active');
  }
}

navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.type === 'UPDATE_AVAILABLE') window.location.reload();
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

buildStars();
updateSWBadge();

// Register SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg)
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  });
}
