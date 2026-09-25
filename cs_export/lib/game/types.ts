// ========== CORE GAME TYPES ==========

export interface Vec2 {
  x: number;
  y: number;
}

export interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  xp: number;
  xpToLevel: number;
  level: number;
  kills: number;
  invulnTimer: number;
  characterType: CharacterType;
}

export interface Projectile extends Entity {
  damage: number;
  radius: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
  piercing: number;
  weaponType: WeaponType;
  speed: number;
  targetId: number;
  bounces: number;
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  radius: number;
  type: EnemyType;
  color: string;
  immuneTimer: number;
  stunTimer: number;
  isBoss: boolean;
  phase: number;
}

export interface Particle extends Entity {
  color: string;
  radius: number;
  lifetime: number;
  maxLifetime: number;
  alpha: number;
}

export interface DamageNumber {
  x: number;
  y: number;
  value: number;
  lifetime: number;
  maxLifetime: number;
  color: string;
  active: boolean;
  vy: number;
}

export interface Weapon {
  type: WeaponType;
  level: number;
  cooldown: number;
  currentCooldown: number;
  damage: number;
  projectileSpeed: number;
  radius: number;
  color: string;
}

export interface Drone extends Entity {
  angle: number;
  cooldown: number;
  currentCooldown: number;
}

export interface UpgradeOption {
  type: WeaponType;
  name: string;
  description: string;
  icon: string;
  color: string;
  isNew: boolean;
  currentLevel: number;
}

export type WeaponType =
  | 'data_spike'
  | 'firewall_ring'
  | 'null_bomb'
  | 'overclock'
  | 'chain_hack'
  | 'swarm_drone'
  | 'emp_pulse'
  | 'data_leech';

export type EnemyType = 'bug' | 'virus' | 'corrupted' | 'guardian' | 'boss';

export type CharacterType = 'hacker' | 'ghost';

export type GameState = 'title' | 'select' | 'playing' | 'levelup' | 'paused' | 'gameover' | 'victory';

export interface GameStats {
  kills: number;
  time: number;
  level: number;
  character: CharacterType;
  upgradesCollected: number;
}

export interface Camera {
  x: number;
  y: number;
}

export interface XPOrb extends Entity {
  value: number;
  radius: number;
}

export interface Keys {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}
