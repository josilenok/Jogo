import {
  Player, Projectile, Enemy, Particle, DamageNumber, Weapon,
  Drone, UpgradeOption, XPOrb, Camera, Keys,
  WeaponType, EnemyType, CharacterType, GameState, GameStats,
} from './types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  MAX_PROJECTILES, MAX_PARTICLES, MAX_ENEMIES, MAX_DAMAGE_NUMBERS, MAX_XP_ORBS, MAX_DRONES,
  GRID_CELL_SIZE, SPAWN_DISTANCE, XP_ATTRACT_RANGE, XP_ATTRACT_SPEED,
  GAME_DURATION, WEAPON_DEFS, ENEMY_DEFS, CHARACTER_DEFS, getXpForLevel,
} from './constants';
import { GameAudio } from './audio';

// ========== SPATIAL GRID ==========
class SpatialGrid {
  cells: Map<number, number[]> = new Map();
  cellSize: number;
  constructor(cellSize: number) { this.cellSize = cellSize; }
  clear() { this.cells.clear(); }
  key(cx: number, cy: number) { return cx * 100000 + cy; }
  insert(idx: number, x: number, y: number) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const k = this.key(cx, cy);
    let arr = this.cells.get(k);
    if (!arr) { arr = []; this.cells.set(k, arr); }
    arr.push(idx);
  }
  query(x: number, y: number, range: number): number[] {
    const result: number[] = [];
    const minCx = Math.floor((x - range) / this.cellSize);
    const maxCx = Math.floor((x + range) / this.cellSize);
    const minCy = Math.floor((y - range) / this.cellSize);
    const maxCy = Math.floor((y + range) / this.cellSize);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const arr = this.cells.get(this.key(cx, cy));
        if (arr) for (let i = 0; i < arr.length; i++) result.push(arr[i]);
      }
    }
    return result;
  }
}

// ========== GAME ENGINE ==========
export class GameEngine {
  // Canvas
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  width = CANVAS_WIDTH;
  height = CANVAS_HEIGHT;
  dpr = 1;

  // State
  gameState: GameState = 'title';
  gameTime = 0;
  deltaTime = 0;
  lastFrameTime = 0;
  animFrame = 0;
  screenShake = 0;
  titlePulse = 0;

  // Camera
  camera: Camera = { x: 0, y: 0 };

  // Player
  player: Player = this.createPlayer('hacker');
  selectedCharacter: CharacterType = 'hacker';

  // Object pools
  projectiles: Projectile[] = [];
  enemies: Enemy[] = [];
  particles: Particle[] = [];
  damageNumbers: DamageNumber[] = [];
  xpOrbs: XPOrb[] = [];
  drones: Drone[] = [];

  // Weapons
  weapons: Weapon[] = [];
  overclockLevel = 0;
  firewallAngle = 0;

  // Spawn
  spawnTimer = 0;
  bossSpawned: Set<number> = new Set();
  difficultyMult = 1;

  // Upgrade
  upgradeOptions: UpgradeOption[] = [];

  // Input
  keys: Keys = { up: false, down: false, left: false, right: false };

  // Spatial grid
  enemyGrid = new SpatialGrid(GRID_CELL_SIZE);

  // Audio
  audio = new GameAudio();

  // Stats
  stats: GameStats = { kills: 0, time: 0, level: 1, character: 'hacker', upgradesCollected: 0 };

  // High scores (localStorage)
  highScores: Array<{ name: string; kills: number; time: number; character: string; level: number }> = [];

  // Grid animation offset
  gridOffset = { x: 0, y: 0 };

  // State change callback
  onStateChange: ((state: GameState) => void) | null = null;

  constructor() {
    this.initPools();
    this.loadHighScores();
  }

  // ========== POOL INIT ==========
  initPools() {
    this.projectiles = Array.from({ length: MAX_PROJECTILES }, (): Projectile => ({
      x: 0, y: 0, vx: 0, vy: 0, active: false,
      damage: 0, radius: 4, color: '#00FFFF', lifetime: 0, maxLifetime: 3,
      piercing: 0, weaponType: 'data_spike', speed: 0, targetId: -1, bounces: 0,
    }));
    this.enemies = Array.from({ length: MAX_ENEMIES }, (): Enemy => ({
      x: 0, y: 0, vx: 0, vy: 0, active: false,
      hp: 10, maxHp: 10, damage: 5, speed: 60, radius: 10,
      type: 'bug', color: '#FF4444', immuneTimer: 0, stunTimer: 0,
      isBoss: false, phase: 0,
    }));
    this.particles = Array.from({ length: MAX_PARTICLES }, (): Particle => ({
      x: 0, y: 0, vx: 0, vy: 0, active: false,
      color: '#FFFFFF', radius: 2, lifetime: 0, maxLifetime: 1, alpha: 1,
    }));
    this.damageNumbers = Array.from({ length: MAX_DAMAGE_NUMBERS }, (): DamageNumber => ({
      x: 0, y: 0, value: 0, lifetime: 0, maxLifetime: 0.8,
      color: '#FFFFFF', active: false, vy: -60,
    }));
    this.xpOrbs = Array.from({ length: MAX_XP_ORBS }, (): XPOrb => ({
      x: 0, y: 0, vx: 0, vy: 0, active: false, value: 1, radius: 4,
    }));
    this.drones = Array.from({ length: MAX_DRONES }, (): Drone => ({
      x: 0, y: 0, vx: 0, vy: 0, active: false, angle: 0, cooldown: 0.6, currentCooldown: 0,
    }));
  }

  // ========== INIT ==========
  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio.init();
    this.resize();
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.width = w;
    this.height = h;
  }

  // ========== PLAYER CREATION ==========
  createPlayer(type: CharacterType): Player {
    const def = CHARACTER_DEFS[type];
    return {
      x: 0, y: 0, vx: 0, vy: 0, active: true,
      hp: def?.hp ?? 100, maxHp: def?.hp ?? 100,
      speed: def?.speed ?? 160,
      xp: 0, xpToLevel: getXpForLevel(1),
      level: 1, kills: 0, invulnTimer: 0,
      characterType: type,
    };
  }

  // ========== START GAME ==========
  startGame(character: CharacterType) {
    this.audio.resume();
    this.selectedCharacter = character;
    this.player = this.createPlayer(character);
    this.weapons = [];
    this.overclockLevel = 0;
    this.firewallAngle = 0;
    this.gameTime = 0;
    this.spawnTimer = 0;
    this.bossSpawned.clear();
    this.difficultyMult = 1;
    this.stats = { kills: 0, time: 0, level: 1, character, upgradesCollected: 0 };
    this.screenShake = 0;

    // Reset pools
    for (const p of this.projectiles) p.active = false;
    for (const e of this.enemies) e.active = false;
    for (const p of this.particles) p.active = false;
    for (const d of this.damageNumbers) d.active = false;
    for (const o of this.xpOrbs) o.active = false;
    for (const d of this.drones) d.active = false;

    // Start with data_spike
    this.addWeapon('data_spike');

    this.gameState = 'playing';
    this.onStateChange?.('playing');
  }

  // ========== WEAPON MANAGEMENT ==========
  addWeapon(type: WeaponType) {
    const existing = this.weapons.find((w: Weapon) => w.type === type);
    if (existing) {
      existing.level++;
      existing.damage = (WEAPON_DEFS[type]?.baseDamage ?? 10) * (1 + existing.level * 0.3);
      existing.cooldown = (WEAPON_DEFS[type]?.baseCooldown ?? 1) * Math.max(0.3, 1 - existing.level * 0.1);
      if (type === 'swarm_drone') this.updateDrones();
      return;
    }
    const def = WEAPON_DEFS[type];
    if (!def) return;
    this.weapons.push({
      type,
      level: 1,
      cooldown: def.baseCooldown,
      currentCooldown: 0,
      damage: def.baseDamage,
      projectileSpeed: def.baseSpeed,
      radius: def.baseRadius,
      color: def.color,
    });
    if (type === 'overclock') {
      this.overclockLevel = 1;
    }
    if (type === 'swarm_drone') {
      this.updateDrones();
    }
  }

  updateDrones() {
    const droneWeapon = this.weapons.find((w: Weapon) => w.type === 'swarm_drone');
    const count = Math.min(droneWeapon?.level ?? 0, MAX_DRONES);
    for (let i = 0; i < MAX_DRONES; i++) {
      this.drones[i].active = i < count;
      this.drones[i].angle = (Math.PI * 2 / count) * i;
      this.drones[i].currentCooldown = 0;
    }
  }

  // ========== SPAWN PROJECTILE ==========
  spawnProjectile(x: number, y: number, vx: number, vy: number, weapon: Weapon) {
    for (const p of this.projectiles) {
      if (!p.active) {
        p.active = true;
        p.x = x; p.y = y; p.vx = vx; p.vy = vy;
        p.damage = weapon.damage;
        p.radius = weapon.radius;
        p.color = weapon.color;
        p.lifetime = 0;
        p.maxLifetime = 3;
        p.piercing = weapon.type === 'data_spike' ? weapon.level : 0;
        p.weaponType = weapon.type;
        p.speed = weapon.projectileSpeed;
        p.bounces = weapon.type === 'chain_hack' ? weapon.level + 1 : 0;
        p.targetId = -1;
        return p;
      }
    }
    return null;
  }

  // ========== SPAWN ENEMY ==========
  spawnEnemy(type: EnemyType, x: number, y: number) {
    for (const e of this.enemies) {
      if (!e.active) {
        const def = ENEMY_DEFS[type];
        if (!def) return null;
        const hpMult = this.difficultyMult;
        e.active = true;
        e.x = x; e.y = y; e.vx = 0; e.vy = 0;
        e.hp = def.hp * hpMult;
        e.maxHp = def.hp * hpMult;
        e.damage = def.damage * Math.sqrt(hpMult);
        e.speed = def.speed;
        e.radius = def.radius;
        e.type = type;
        e.color = def.color;
        e.immuneTimer = 0;
        e.stunTimer = 0;
        e.isBoss = type === 'boss';
        e.phase = 0;
        return e;
      }
    }
    return null;
  }

  // ========== SPAWN PARTICLES ==========
  spawnParticles(x: number, y: number, color: string, count: number, speed = 200) {
    for (let i = 0; i < count; i++) {
      for (const p of this.particles) {
        if (!p.active) {
          const angle = Math.random() * Math.PI * 2;
          const spd = (Math.random() * 0.7 + 0.3) * speed;
          p.active = true;
          p.x = x; p.y = y;
          p.vx = Math.cos(angle) * spd;
          p.vy = Math.sin(angle) * spd;
          p.color = color;
          p.radius = Math.random() * 3 + 1;
          p.lifetime = 0;
          p.maxLifetime = Math.random() * 0.5 + 0.2;
          p.alpha = 1;
          break;
        }
      }
    }
  }

  spawnDamageNumber(x: number, y: number, value: number, color: string) {
    for (const d of this.damageNumbers) {
      if (!d.active) {
        d.active = true;
        d.x = x + (Math.random() - 0.5) * 20;
        d.y = y;
        d.value = Math.round(value);
        d.lifetime = 0;
        d.maxLifetime = 0.8;
        d.color = color;
        d.vy = -80;
        return;
      }
    }
  }

  spawnXPOrb(x: number, y: number, value: number) {
    for (const o of this.xpOrbs) {
      if (!o.active) {
        o.active = true;
        o.x = x + (Math.random() - 0.5) * 20;
        o.y = y + (Math.random() - 0.5) * 20;
        o.vx = 0; o.vy = 0;
        o.value = value;
        o.radius = Math.min(3 + value, 8);
        return;
      }
    }
  }

  // ========== FIND NEAREST ENEMY ==========
  findNearestEnemy(x: number, y: number, range: number): Enemy | null {
    let best: Enemy | null = null;
    let bestDist = range * range;
    const candidates = this.enemyGrid.query(x, y, range);
    for (const idx of candidates) {
      const e = this.enemies[idx];
      if (!e?.active) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  // ========== UPDATE ==========
  update(dt: number) {
    if (this.gameState !== 'playing') return;
    this.deltaTime = Math.min(dt, 0.05); // cap at 50ms
    this.gameTime += this.deltaTime;
    this.stats.time = Math.floor(this.gameTime);
    this.difficultyMult = 1 + this.gameTime / 60; // increases every minute

    // Check victory
    if (this.gameTime >= GAME_DURATION) {
      this.gameState = 'victory';
      this.audio.victory();
      this.saveScore();
      this.onStateChange?.('victory');
      return;
    }

    // Update spatial grid
    this.enemyGrid.clear();
    for (let i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i].active) {
        this.enemyGrid.insert(i, this.enemies[i].x, this.enemies[i].y);
      }
    }

    this.updatePlayer();
    this.updateWeapons();
    this.updateProjectiles();
    this.updateEnemies();
    this.updateParticles();
    this.updateDamageNumbers();
    this.updateXPOrbs();
    this.updateDronesLogic();
    this.updateSpawning();
    this.checkBossSpawns();

    // Screen shake decay
    if (this.screenShake > 0) this.screenShake *= 0.9;
    if (this.screenShake < 0.5) this.screenShake = 0;

    // Camera follow
    this.camera.x = this.player.x - this.width / 2;
    this.camera.y = this.player.y - this.height / 2;
  }

  updatePlayer() {
    const p = this.player;
    let mx = 0, my = 0;
    if (this.keys.left) mx -= 1;
    if (this.keys.right) mx += 1;
    if (this.keys.up) my -= 1;
    if (this.keys.down) my += 1;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0) {
      mx /= len; my /= len;
      p.x += mx * p.speed * this.deltaTime;
      p.y += my * p.speed * this.deltaTime;
      // trail particles
      if (Math.random() < 0.3) {
        const charDef = CHARACTER_DEFS[p.characterType];
        this.spawnParticles(p.x, p.y, charDef?.color ?? '#00FFFF', 1, 40);
      }
    }
    if (p.invulnTimer > 0) p.invulnTimer -= this.deltaTime;
  }

  updateWeapons() {
    const ocMult = 1 + this.overclockLevel * 0.15;
    for (const w of this.weapons) {
      if (w.type === 'overclock') continue;
      w.currentCooldown -= this.deltaTime * ocMult;
      if (w.currentCooldown <= 0) {
        this.fireWeapon(w);
        w.currentCooldown = w.cooldown;
      }
    }
    // Firewall ring
    const fwWeapon = this.weapons.find((w: Weapon) => w.type === 'firewall_ring');
    if (fwWeapon) {
      this.firewallAngle += this.deltaTime * 3;
    }
  }

  fireWeapon(weapon: Weapon) {
    const p = this.player;
    switch (weapon.type) {
      case 'data_spike': {
        const target = this.findNearestEnemy(p.x, p.y, 500);
        if (!target) return;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;
        const vx = (dx / len) * weapon.projectileSpeed;
        const vy = (dy / len) * weapon.projectileSpeed;
        this.spawnProjectile(p.x, p.y, vx, vy, weapon);
        this.audio.shoot();
        break;
      }
      case 'null_bomb': {
        const target = this.findNearestEnemy(p.x, p.y, 400);
        if (!target) return;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;
        this.spawnProjectile(p.x, p.y, (dx / len) * weapon.projectileSpeed, (dy / len) * weapon.projectileSpeed, weapon);
        this.audio.shoot();
        break;
      }
      case 'chain_hack': {
        const target = this.findNearestEnemy(p.x, p.y, 450);
        if (!target) return;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;
        this.spawnProjectile(p.x, p.y, (dx / len) * weapon.projectileSpeed, (dy / len) * weapon.projectileSpeed, weapon);
        this.audio.shoot();
        break;
      }
      case 'data_leech': {
        const target = this.findNearestEnemy(p.x, p.y, 350);
        if (!target) return;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;
        this.spawnProjectile(p.x, p.y, (dx / len) * weapon.projectileSpeed, (dy / len) * weapon.projectileSpeed, weapon);
        break;
      }
      case 'emp_pulse': {
        // Stun all enemies on screen
        this.audio.empPulse();
        const range = weapon.radius + weapon.level * 50;
        for (const e of this.enemies) {
          if (!e.active) continue;
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          if (dx * dx + dy * dy < range * range) {
            e.stunTimer = 1.5 + weapon.level * 0.3;
            this.damageEnemy(e, weapon.damage);
          }
        }
        this.spawnParticles(p.x, p.y, '#8800FF', 30, 400);
        break;
      }
      case 'firewall_ring':
        // Handled in collision checks
        break;
    }
  }

  updateProjectiles() {
    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      proj.x += proj.vx * this.deltaTime;
      proj.y += proj.vy * this.deltaTime;
      proj.lifetime += this.deltaTime;
      if (proj.lifetime >= proj.maxLifetime) { proj.active = false; continue; }

      // Check collision with enemies
      const nearby = this.enemyGrid.query(proj.x, proj.y, 50);
      for (const idx of nearby) {
        const e = this.enemies[idx];
        if (!e?.active || e.immuneTimer > 0) continue;
        const dx = proj.x - e.x;
        const dy = proj.y - e.y;
        const dist = dx * dx + dy * dy;
        const hitDist = (proj.radius + e.radius) * (proj.radius + e.radius);
        if (dist < hitDist) {
          this.damageEnemy(e, proj.damage);
          // Data leech heals player
          if (proj.weaponType === 'data_leech') {
            this.player.hp = Math.min(this.player.hp + proj.damage * 0.5, this.player.maxHp);
            this.spawnParticles(this.player.x, this.player.y, '#FF0066', 3, 60);
          }
          // Null bomb explosion
          if (proj.weaponType === 'null_bomb') {
            this.nullBombExplode(proj.x, proj.y, proj.damage);
          }
          // Chain hack bounce
          if (proj.weaponType === 'chain_hack' && proj.bounces > 0) {
            proj.bounces--;
            const nextTarget = this.findNearestEnemy(proj.x, proj.y, 200);
            if (nextTarget) {
              const ndx = nextTarget.x - proj.x;
              const ndy = nextTarget.y - proj.y;
              const nlen = Math.sqrt(ndx * ndx + ndy * ndy);
              if (nlen > 0) {
                proj.vx = (ndx / nlen) * proj.speed;
                proj.vy = (ndy / nlen) * proj.speed;
              }
            } else {
              proj.active = false;
            }
            continue;
          }
          // Piercing
          if (proj.piercing > 0) {
            proj.piercing--;
          } else {
            proj.active = false;
          }
          break;
        }
      }
    }
  }

  nullBombExplode(x: number, y: number, damage: number) {
    this.audio.explosion();
    this.spawnParticles(x, y, '#FF00FF', 25, 300);
    this.screenShake = 8;
    const range = 100;
    const nearby = this.enemyGrid.query(x, y, range);
    for (const idx of nearby) {
      const e = this.enemies[idx];
      if (!e?.active) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy < range * range) {
        this.damageEnemy(e, damage * 0.6);
      }
    }
  }

  damageEnemy(e: Enemy, damage: number) {
    if (e.immuneTimer > 0) return;
    e.hp -= damage;
    this.spawnDamageNumber(e.x, e.y - e.radius, damage, '#FFFFFF');
    this.spawnParticles(e.x, e.y, e.color, 3, 100);
    this.audio.hit();
    if (e.hp <= 0) {
      this.killEnemy(e);
    }
  }

  killEnemy(e: Enemy) {
    e.active = false;
    this.player.kills++;
    this.stats.kills = this.player.kills;
    const xpVal = ENEMY_DEFS[e.type]?.xpValue ?? 1;
    this.spawnXPOrb(e.x, e.y, xpVal);
    this.spawnParticles(e.x, e.y, e.color, 12, 200);
    if (e.isBoss) {
      this.spawnParticles(e.x, e.y, '#FFFF00', 40, 400);
      this.audio.explosion();
      this.screenShake = 15;
      // Drop lots of XP
      for (let i = 0; i < 10; i++) {
        this.spawnXPOrb(e.x + (Math.random() - 0.5) * 60, e.y + (Math.random() - 0.5) * 60, 5);
      }
    }
  }

  updateEnemies() {
    const fwWeapon = this.weapons.find((w: Weapon) => w.type === 'firewall_ring');
    for (const e of this.enemies) {
      if (!e.active) continue;
      // Guardian immunity cycle
      if (e.type === 'guardian') {
        e.immuneTimer -= this.deltaTime;
        if (e.immuneTimer <= -3) e.immuneTimer = 2; // 2s immune, 3s vulnerable
      }
      // Stun
      if (e.stunTimer > 0) { e.stunTimer -= this.deltaTime; continue; }
      // Move toward player
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        e.x += (dx / dist) * e.speed * this.deltaTime;
        e.y += (dy / dist) * e.speed * this.deltaTime;
      }
      // Collision with player
      const playerDist = Math.sqrt(
        (e.x - this.player.x) ** 2 + (e.y - this.player.y) ** 2
      );
      if (playerDist < e.radius + 14 && this.player.invulnTimer <= 0) {
        this.player.hp -= e.damage;
        this.player.invulnTimer = 0.5;
        this.screenShake = 10;
        this.audio.playerHit();
        this.spawnParticles(this.player.x, this.player.y, '#FF0000', 8, 150);
        if (this.player.hp <= 0) {
          this.gameState = 'gameover';
          this.audio.gameOver();
          this.saveScore();
          this.onStateChange?.('gameover');
          return;
        }
      }
      // Firewall ring damage
      if (fwWeapon && playerDist < fwWeapon.radius + fwWeapon.level * 15) {
        if (e.immuneTimer <= 0) {
          // Damage per tick (not every frame)
          const fwDps = fwWeapon.damage * this.deltaTime * 3;
          e.hp -= fwDps;
          if (Math.random() < 0.1) this.spawnParticles(e.x, e.y, fwWeapon.color, 1, 50);
          if (e.hp <= 0) this.killEnemy(e);
        }
      }
    }
  }

  updateDronesLogic() {
    const droneWeapon = this.weapons.find((w: Weapon) => w.type === 'swarm_drone');
    if (!droneWeapon) return;
    const orbitRadius = 60 + droneWeapon.level * 10;
    const ocMult = 1 + this.overclockLevel * 0.15;
    for (const d of this.drones) {
      if (!d.active) continue;
      d.angle += this.deltaTime * 2;
      d.x = this.player.x + Math.cos(d.angle) * orbitRadius;
      d.y = this.player.y + Math.sin(d.angle) * orbitRadius;
      d.currentCooldown -= this.deltaTime * ocMult;
      if (d.currentCooldown <= 0) {
        const target = this.findNearestEnemy(d.x, d.y, 300);
        if (target) {
          const dx = target.x - d.x;
          const dy = target.y - d.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            this.spawnProjectile(
              d.x, d.y,
              (dx / len) * droneWeapon.projectileSpeed,
              (dy / len) * droneWeapon.projectileSpeed,
              droneWeapon
            );
          }
        }
        d.currentCooldown = droneWeapon.cooldown;
      }
    }
  }

  updateParticles() {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.x += p.vx * this.deltaTime;
      p.y += p.vy * this.deltaTime;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.lifetime += this.deltaTime;
      p.alpha = 1 - p.lifetime / p.maxLifetime;
      if (p.lifetime >= p.maxLifetime) p.active = false;
    }
  }

  updateDamageNumbers() {
    for (const d of this.damageNumbers) {
      if (!d.active) continue;
      d.y += d.vy * this.deltaTime;
      d.lifetime += this.deltaTime;
      if (d.lifetime >= d.maxLifetime) d.active = false;
    }
  }

  updateXPOrbs() {
    for (const o of this.xpOrbs) {
      if (!o.active) continue;
      const dx = this.player.x - o.x;
      const dy = this.player.y - o.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < XP_ATTRACT_RANGE) {
        const speed = XP_ATTRACT_SPEED * (1 - dist / XP_ATTRACT_RANGE) + 2;
        o.x += (dx / dist) * speed;
        o.y += (dy / dist) * speed;
      }
      if (dist < 16) {
        o.active = false;
        this.player.xp += o.value;
        if (this.player.xp >= this.player.xpToLevel) {
          this.levelUp();
        }
      }
    }
  }

  // ========== LEVEL UP ==========
  levelUp() {
    this.player.level++;
    this.player.xp = 0;
    this.player.xpToLevel = getXpForLevel(this.player.level);
    this.stats.level = this.player.level;
    this.audio.levelUp();
    this.generateUpgradeOptions();
    this.gameState = 'levelup';
    this.onStateChange?.('levelup');
  }

  generateUpgradeOptions() {
    const allTypes: WeaponType[] = [
      'data_spike', 'firewall_ring', 'null_bomb', 'overclock',
      'chain_hack', 'swarm_drone', 'emp_pulse', 'data_leech',
    ];
    // Shuffle
    const shuffled = allTypes.sort(() => Math.random() - 0.5);
    this.upgradeOptions = shuffled.slice(0, 3).map((type: WeaponType): UpgradeOption => {
      const def = WEAPON_DEFS[type];
      const existing = this.weapons.find((w: Weapon) => w.type === type);
      return {
        type,
        name: def?.name ?? type,
        description: def?.description ?? '',
        icon: def?.icon ?? '?',
        color: def?.color ?? '#FFFFFF',
        isNew: !existing,
        currentLevel: existing?.level ?? 0,
      };
    });
  }

  selectUpgrade(index: number) {
    const option = this.upgradeOptions[index];
    if (!option) return;
    this.addWeapon(option.type);
    if (option.type === 'overclock') {
      this.overclockLevel++;
    }
    this.stats.upgradesCollected++;
    this.audio.select();
    this.gameState = 'playing';
    this.onStateChange?.('playing');
  }

  // ========== SPAWNING ==========
  updateSpawning() {
    this.spawnTimer -= this.deltaTime;
    if (this.spawnTimer <= 0) {
      const spawnRate = Math.max(0.3, 1.5 - this.gameTime / 300);
      this.spawnTimer = spawnRate;
      const count = Math.floor(1 + this.gameTime / 60);
      for (let i = 0; i < count; i++) {
        this.spawnRandomEnemy();
      }
    }
  }

  spawnRandomEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const dist = SPAWN_DISTANCE + Math.random() * 200;
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;

    // Pick type based on time
    let type: EnemyType = 'bug';
    const r = Math.random();
    if (this.gameTime > 600) {
      if (r < 0.25) type = 'corrupted';
      else if (r < 0.45) type = 'guardian';
      else if (r < 0.7) type = 'virus';
    } else if (this.gameTime > 300) {
      if (r < 0.15) type = 'corrupted';
      else if (r < 0.35) type = 'guardian';
      else if (r < 0.65) type = 'virus';
    } else if (this.gameTime > 120) {
      if (r < 0.05) type = 'corrupted';
      else if (r < 0.15) type = 'guardian';
      else if (r < 0.45) type = 'virus';
    } else {
      if (r < 0.3) type = 'virus';
    }
    this.spawnEnemy(type, x, y);
  }

  checkBossSpawns() {
    const bossTimes = [300, 600, 900]; // 5, 10, 15 minutes
    for (const t of bossTimes) {
      if (this.gameTime >= t && !this.bossSpawned.has(t)) {
        this.bossSpawned.add(t);
        const angle = Math.random() * Math.PI * 2;
        const boss = this.spawnEnemy('boss', this.player.x + Math.cos(angle) * 500, this.player.y + Math.sin(angle) * 500);
        if (boss) {
          // Scale boss with time
          const scale = 1 + (t / 300) * 0.5;
          boss.hp *= scale;
          boss.maxHp *= scale;
          boss.radius = 40 + (t / 300) * 10;
          this.audio.bossSpawn();
          this.screenShake = 12;
        }
      }
    }
  }

  // ========== RENDERING ==========
  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Clear
    ctx.fillStyle = '#0A0A12';
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.gameState === 'title') {
      this.renderTitle(ctx);
    } else if (this.gameState === 'select') {
      this.renderSelect(ctx);
    } else {
      // Apply camera + screen shake
      ctx.save();
      let shakeX = 0, shakeY = 0;
      if (this.screenShake > 0) {
        shakeX = (Math.random() - 0.5) * this.screenShake;
        shakeY = (Math.random() - 0.5) * this.screenShake;
      }
      ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);

      this.renderGrid(ctx);
      this.renderXPOrbs(ctx);
      this.renderProjectiles(ctx);
      this.renderFirewallRing(ctx);
      this.renderDrones(ctx);
      this.renderEnemies(ctx);
      this.renderPlayer(ctx);
      this.renderParticles(ctx);
      this.renderDamageNumbers(ctx);

      ctx.restore();

      // HUD (screen space)
      this.renderHUD(ctx);
    }

    ctx.restore();
    this.titlePulse += 0.02;
  }

  renderGrid(ctx: CanvasRenderingContext2D) {
    const gridSize = 80;
    const startX = Math.floor(this.camera.x / gridSize) * gridSize;
    const startY = Math.floor(this.camera.y / gridSize) * gridSize;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = startX; x < this.camera.x + this.width + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, this.camera.y);
      ctx.lineTo(x, this.camera.y + this.height);
      ctx.stroke();
    }
    for (let y = startY; y < this.camera.y + this.height + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(this.camera.x, y);
      ctx.lineTo(this.camera.x + this.width, y);
      ctx.stroke();
    }
  }

  renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const charDef = CHARACTER_DEFS[p.characterType];
    const color = charDef?.color ?? '#00FFFF';
    const blinking = p.invulnTimer > 0 && Math.floor(p.invulnTimer * 10) % 2 === 0;
    if (blinking) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    // Glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    // Body (hexagonal shape)
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const r = 14;
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
    // Inner
    ctx.fillStyle = '#0A0A12';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const r = 8;
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
    // Core
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  renderEnemies(ctx: CanvasRenderingContext2D) {
    for (const e of this.enemies) {
      if (!e.active) continue;
      // Check if on screen
      if (e.x < this.camera.x - 50 || e.x > this.camera.x + this.width + 50) continue;
      if (e.y < this.camera.y - 50 || e.y > this.camera.y + this.height + 50) continue;

      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.shadowBlur = 10;
      ctx.shadowColor = e.color;

      // Immune flash
      const immune = e.immuneTimer > 0;
      const stun = e.stunTimer > 0;

      if (stun) {
        ctx.globalAlpha = 0.5 + Math.sin(this.gameTime * 20) * 0.3;
      }

      ctx.fillStyle = immune ? '#FFFFFF' : e.color;

      if (e.isBoss) {
        // Boss: complex shape
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI / 4) * i + this.gameTime;
          const r = i % 2 === 0 ? e.radius : e.radius * 0.7;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        // HP bar
        const barW = e.radius * 2;
        const hpPct = e.hp / e.maxHp;
        ctx.fillStyle = '#333';
        ctx.fillRect(-barW / 2, -e.radius - 12, barW, 5);
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(-barW / 2, -e.radius - 12, barW * hpPct, 5);
      } else if (e.type === 'bug') {
        // Triangle
        ctx.beginPath();
        ctx.moveTo(0, -e.radius);
        ctx.lineTo(-e.radius, e.radius * 0.7);
        ctx.lineTo(e.radius, e.radius * 0.7);
        ctx.closePath();
        ctx.fill();
      } else if (e.type === 'virus') {
        // Diamond
        ctx.beginPath();
        ctx.moveTo(0, -e.radius);
        ctx.lineTo(e.radius, 0);
        ctx.lineTo(0, e.radius);
        ctx.lineTo(-e.radius, 0);
        ctx.closePath();
        ctx.fill();
      } else if (e.type === 'corrupted') {
        // Octagon
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI / 4) * i;
          ctx.lineTo(Math.cos(angle) * e.radius, Math.sin(angle) * e.radius);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        // Guardian: pentagon
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
          ctx.lineTo(Math.cos(angle) * e.radius, Math.sin(angle) * e.radius);
        }
        ctx.closePath();
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  renderFirewallRing(ctx: CanvasRenderingContext2D) {
    const fw = this.weapons.find((w: Weapon) => w.type === 'firewall_ring');
    if (!fw) return;
    const radius = fw.radius + fw.level * 15;
    const segments = 12 + fw.level * 4;
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.shadowBlur = 15;
    ctx.shadowColor = fw.color;
    ctx.strokeStyle = fw.color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < segments; i++) {
      const a1 = this.firewallAngle + (Math.PI * 2 / segments) * i;
      const a2 = a1 + (Math.PI * 2 / segments) * 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, radius, a1, a2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  renderDrones(ctx: CanvasRenderingContext2D) {
    for (const d of this.drones) {
      if (!d.active) continue;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#88FF00';
      ctx.fillStyle = '#88FF00';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i + d.angle;
        const r = 6;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      if (!p.active) continue;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  renderDamageNumbers(ctx: CanvasRenderingContext2D) {
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    for (const d of this.damageNumbers) {
      if (!d.active) continue;
      const alpha = 1 - d.lifetime / d.maxLifetime;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = d.color;
      ctx.fillText(String(d.value), d.x, d.y);
    }
    ctx.globalAlpha = 1;
  }

  renderXPOrbs(ctx: CanvasRenderingContext2D) {
    for (const o of this.xpOrbs) {
      if (!o.active) continue;
      ctx.save();
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00FF88';
      ctx.fillStyle = '#00FF88';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // ========== HUD ==========
  renderHUD(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const pad = 16;
    // HP bar
    const hpW = 200;
    const hpH = 12;
    const hpX = pad;
    const hpY = pad;
    ctx.fillStyle = 'rgba(255,0,0,0.3)';
    ctx.fillRect(hpX, hpY, hpW, hpH);
    ctx.fillStyle = '#FF4444';
    const hpPct = Math.max(0, p.hp / p.maxHp);
    ctx.fillRect(hpX, hpY, hpW * hpPct, hpH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(hpX, hpY, hpW, hpH);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, hpX + hpW / 2, hpY + 10);

    // XP bar
    const xpY = hpY + hpH + 4;
    ctx.fillStyle = 'rgba(0,255,136,0.2)';
    ctx.fillRect(hpX, xpY, hpW, 6);
    ctx.fillStyle = '#00FF88';
    const xpPct = p.xpToLevel > 0 ? p.xp / p.xpToLevel : 0;
    ctx.fillRect(hpX, xpY, hpW * xpPct, 6);

    // Level
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#00FF88';
    ctx.fillText(`LVL ${p.level}`, hpX, xpY + 22);

    // Timer
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px monospace';
    const remaining = Math.max(0, GAME_DURATION - this.gameTime);
    const min = Math.floor(remaining / 60);
    const sec = Math.floor(remaining % 60);
    ctx.fillStyle = remaining < 60 ? '#FF4444' : '#00FFFF';
    ctx.fillText(`${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`, this.width / 2, pad + 16);

    // Kills
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#FF00FF';
    ctx.fillText(`KILLS: ${p.kills}`, this.width - pad, pad + 14);

    // Weapons icons
    ctx.textAlign = 'left';
    ctx.font = '12px monospace';
    let wy = this.height - pad - 20;
    for (const w of this.weapons) {
      const def = WEAPON_DEFS[w.type];
      if (!def) continue;
      ctx.fillStyle = w.color;
      ctx.fillText(`${def.icon} ${def.name} Lv.${w.level}`, pad, wy);
      wy -= 18;
    }
  }

  // ========== TITLE SCREEN ==========
  renderTitle(ctx: CanvasRenderingContext2D) {
    // Animated grid bg
    this.renderTitleGrid(ctx);

    const cx = this.width / 2;
    const cy = this.height / 2;

    // Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00FFFF';
    ctx.font = `bold ${Math.min(64, this.width * 0.07)}px monospace`;
    ctx.fillStyle = '#00FFFF';
    ctx.fillText('CYBER SWARM', cx, cy - 80);
    ctx.shadowColor = '#FF00FF';
    ctx.font = `bold ${Math.min(20, this.width * 0.025)}px monospace`;
    ctx.fillStyle = '#FF00FF';
    ctx.fillText('ROGUELIKE BULLET-HEAVEN', cx, cy - 50);

    // Pulse start
    const pulse = 0.7 + Math.sin(this.titlePulse * 3) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.shadowColor = '#00FF88';
    ctx.font = `bold ${Math.min(22, this.width * 0.028)}px monospace`;
    ctx.fillStyle = '#00FF88';
    ctx.fillText('[ CLIQUE PARA INICIAR ]', cx, cy + 30);
    ctx.globalAlpha = 1;

    // High scores
    ctx.shadowBlur = 0;
    ctx.font = '14px monospace';
    ctx.fillStyle = '#888';
    if (this.highScores.length > 0) {
      ctx.fillText('MELHORES PONTUAÇÕES:', cx, cy + 80);
      ctx.font = '12px monospace';
      const top5 = this.highScores.slice(0, 5);
      top5.forEach((s: { name: string; kills: number; time: number }, i: number) => {
        const timeStr = `${Math.floor(s.time / 60)}:${String(s.time % 60).padStart(2, '0')}`;
        ctx.fillStyle = ['#FFD700', '#C0C0C0', '#CD7F32', '#888', '#888'][i] ?? '#888';
        ctx.fillText(`${i + 1}. ${s.name} — ${s.kills} kills — ${timeStr}`, cx, cy + 100 + i * 18);
      });
    }

    // Controls
    ctx.fillStyle = '#555';
    ctx.font = '12px monospace';
    ctx.fillText('WASD / Setas = Mover | ESC = Pausar | M = Mudo', cx, this.height - 30);

    ctx.restore();
  }

  renderTitleGrid(ctx: CanvasRenderingContext2D) {
    const gridSize = 60;
    const offset = (this.titlePulse * 20) % gridSize;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = -offset; x < this.width + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = -offset; y < this.height + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }

  // ========== SELECT SCREEN ==========
  renderSelect(ctx: CanvasRenderingContext2D) {
    this.renderTitleGrid(ctx);
    const cx = this.width / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00FFFF';
    ctx.font = `bold ${Math.min(36, this.width * 0.04)}px monospace`;
    ctx.fillStyle = '#00FFFF';
    ctx.fillText('SELECIONE SEU PERSONAGEM', cx, 80);
    ctx.shadowBlur = 0;

    const chars: CharacterType[] = ['hacker', 'ghost'];
    const cardW = Math.min(240, this.width * 0.3);
    const cardH = 260;
    const gap = 40;
    const startX = cx - (chars.length * cardW + (chars.length - 1) * gap) / 2;

    chars.forEach((type: CharacterType, i: number) => {
      const def = CHARACTER_DEFS[type];
      if (!def) return;
      const x = startX + i * (cardW + gap);
      const y = this.height / 2 - cardH / 2;

      // Card bg
      ctx.fillStyle = 'rgba(20, 20, 40, 0.9)';
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 10);
      ctx.fill();
      ctx.stroke();

      // Character shape
      ctx.save();
      ctx.translate(x + cardW / 2, y + 80);
      ctx.shadowBlur = 20;
      ctx.shadowColor = def.color;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const angle = (Math.PI / 3) * j - Math.PI / 6;
        const r = 30;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Name
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = def.color;
      ctx.fillText(def.name, x + cardW / 2, y + 140);

      // Stats
      ctx.font = '13px monospace';
      ctx.fillStyle = '#AAA';
      ctx.fillText(`HP: ${def.hp}`, x + cardW / 2, y + 170);
      ctx.fillText(`VEL: ${def.speed}`, x + cardW / 2, y + 190);

      // Description
      ctx.font = '11px monospace';
      ctx.fillStyle = '#888';
      ctx.fillText(def.description, x + cardW / 2, y + 220);

      // Click hint
      ctx.font = '12px monospace';
      ctx.fillStyle = def.color;
      ctx.fillText('[ CLIQUE ]', x + cardW / 2, y + cardH - 15);
    });

    ctx.restore();
  }

  getCharacterAtClick(mx: number, my: number): CharacterType | null {
    const cx = this.width / 2;
    const chars: CharacterType[] = ['hacker', 'ghost'];
    const cardW = Math.min(240, this.width * 0.3);
    const cardH = 260;
    const gap = 40;
    const startX = cx - (chars.length * cardW + (chars.length - 1) * gap) / 2;
    for (let i = 0; i < chars.length; i++) {
      const x = startX + i * (cardW + gap);
      const y = this.height / 2 - cardH / 2;
      if (mx >= x && mx <= x + cardW && my >= y && my <= y + cardH) {
        return chars[i];
      }
    }
    return null;
  }

  // ========== PAUSE ==========
  togglePause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.onStateChange?.('paused');
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.onStateChange?.('playing');
    }
  }

  // ========== HIGH SCORES ==========
  loadHighScores() {
    try {
      const raw = localStorage.getItem('cyberswarm_scores');
      this.highScores = raw ? JSON.parse(raw) : [];
    } catch {
      this.highScores = [];
    }
  }

  saveScore() {
    const entry = {
      name: this.selectedCharacter.toUpperCase(),
      kills: this.stats.kills,
      time: this.stats.time,
      character: this.selectedCharacter,
      level: this.stats.level,
    };
    this.highScores.push(entry);
    this.highScores.sort((a: { kills: number }, b: { kills: number }) => b.kills - a.kills);
    this.highScores = this.highScores.slice(0, 10);
    try {
      localStorage.setItem('cyberswarm_scores', JSON.stringify(this.highScores));
    } catch { /* ignore */ }
    // Also save to DB
    this.saveScoreToDb(entry).catch(() => {});
  }

  async saveScoreToDb(entry: { name: string; kills: number; time: number; character: string; level: number }) {
    try {
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch { /* silent */ }
  }

  // ========== INPUT ==========
  handleKeyDown(key: string) {
    switch (key.toLowerCase()) {
      case 'w': case 'arrowup': this.keys.up = true; break;
      case 's': case 'arrowdown': this.keys.down = true; break;
      case 'a': case 'arrowleft': this.keys.left = true; break;
      case 'd': case 'arrowright': this.keys.right = true; break;
      case 'escape':
        if (this.gameState === 'playing' || this.gameState === 'paused') this.togglePause();
        break;
      case 'm':
        this.audio.toggleMute();
        break;
    }
  }

  handleKeyUp(key: string) {
    switch (key.toLowerCase()) {
      case 'w': case 'arrowup': this.keys.up = false; break;
      case 's': case 'arrowdown': this.keys.down = false; break;
      case 'a': case 'arrowleft': this.keys.left = false; break;
      case 'd': case 'arrowright': this.keys.right = false; break;
    }
  }

  handleClick(mx: number, my: number) {
    this.audio.resume();
    if (this.gameState === 'title') {
      this.gameState = 'select';
      this.audio.select();
      this.onStateChange?.('select');
    } else if (this.gameState === 'select') {
      const char = this.getCharacterAtClick(mx, my);
      if (char) {
        this.startGame(char);
      }
    }
  }
}
