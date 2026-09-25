import { WeaponType, EnemyType, CharacterType } from './types';

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const MAX_PROJECTILES = 600;
export const MAX_PARTICLES = 800;
export const MAX_ENEMIES = 300;
export const MAX_DAMAGE_NUMBERS = 100;
export const MAX_XP_ORBS = 200;
export const MAX_DRONES = 6;

export const GRID_CELL_SIZE = 80;
export const SPAWN_DISTANCE = 600;
export const XP_ATTRACT_RANGE = 120;
export const XP_ATTRACT_SPEED = 6;

export const GAME_DURATION = 20 * 60; // 20 minutes in seconds

export const WEAPON_DEFS: Record<WeaponType, {
  name: string;
  description: string;
  icon: string;
  color: string;
  baseDamage: number;
  baseCooldown: number;
  baseSpeed: number;
  baseRadius: number;
}> = {
  data_spike: {
    name: 'Data Spike',
    description: 'Projétil rápido que perfura inimigos em linha reta',
    icon: '⚡',
    color: '#00FFFF',
    baseDamage: 12,
    baseCooldown: 0.8,
    baseSpeed: 500,
    baseRadius: 4,
  },
  firewall_ring: {
    name: 'Firewall Ring',
    description: 'Escudo giratório de energia que machuca inimigos ao redor',
    icon: '🔥',
    color: '#FF6600',
    baseDamage: 8,
    baseCooldown: 0.5,
    baseSpeed: 0,
    baseRadius: 80,
  },
  null_bomb: {
    name: 'Null Bomb',
    description: 'Explode em área ao atingir inimigo',
    icon: '💣',
    color: '#FF00FF',
    baseDamage: 25,
    baseCooldown: 2.0,
    baseSpeed: 300,
    baseRadius: 6,
  },
  overclock: {
    name: 'Overclock',
    description: 'Aumenta velocidade de ataque de todas as armas',
    icon: '⚙️',
    color: '#00FF88',
    baseDamage: 0,
    baseCooldown: 0,
    baseSpeed: 0,
    baseRadius: 0,
  },
  chain_hack: {
    name: 'Chain Hack',
    description: 'Projétil que ricocheteia entre inimigos',
    icon: '🔗',
    color: '#FFFF00',
    baseDamage: 10,
    baseCooldown: 1.2,
    baseSpeed: 400,
    baseRadius: 5,
  },
  swarm_drone: {
    name: 'Swarm Drone',
    description: 'Drones que orbitam o jogador e disparam automaticamente',
    icon: '🛸',
    color: '#88FF00',
    baseDamage: 6,
    baseCooldown: 0.6,
    baseSpeed: 350,
    baseRadius: 3,
  },
  emp_pulse: {
    name: 'EMP Pulse',
    description: 'Pulso que paralisa brevemente todos os inimigos na tela',
    icon: '💫',
    color: '#8800FF',
    baseDamage: 15,
    baseCooldown: 5.0,
    baseSpeed: 0,
    baseRadius: 300,
  },
  data_leech: {
    name: 'Data Leech',
    description: 'Drena vida dos inimigos para o jogador',
    icon: '🩸',
    color: '#FF0066',
    baseDamage: 5,
    baseCooldown: 1.5,
    baseSpeed: 250,
    baseRadius: 5,
  },
};

export const ENEMY_DEFS: Record<EnemyType, {
  name: string;
  hp: number;
  damage: number;
  speed: number;
  radius: number;
  color: string;
  xpValue: number;
}> = {
  bug: {
    name: 'Bug',
    hp: 15,
    damage: 5,
    speed: 100,
    radius: 8,
    color: '#FF4444',
    xpValue: 1,
  },
  virus: {
    name: 'Virus',
    hp: 40,
    damage: 10,
    speed: 70,
    radius: 14,
    color: '#FF8800',
    xpValue: 3,
  },
  corrupted: {
    name: 'Corrupted Data',
    hp: 120,
    damage: 20,
    speed: 35,
    radius: 22,
    color: '#AA00FF',
    xpValue: 8,
  },
  guardian: {
    name: 'Firewall Guardian',
    hp: 80,
    damage: 15,
    speed: 50,
    radius: 18,
    color: '#FF00AA',
    xpValue: 5,
  },
  boss: {
    name: 'Boss Trojan',
    hp: 800,
    damage: 30,
    speed: 30,
    radius: 40,
    color: '#FF0000',
    xpValue: 50,
  },
};

export const CHARACTER_DEFS: Record<CharacterType, {
  name: string;
  description: string;
  hp: number;
  speed: number;
  color: string;
}> = {
  hacker: {
    name: 'HACKER',
    description: 'Balanceado — HP e velocidade equilibrados',
    hp: 100,
    speed: 160,
    color: '#00FFFF',
  },
  ghost: {
    name: 'GHOST',
    description: 'Mais rápido, porém com menos HP',
    hp: 60,
    speed: 220,
    color: '#FF00FF',
  },
};

export const LEVEL_XP_TABLE = [
  0, 5, 12, 22, 35, 50, 70, 95, 125, 160,
  200, 250, 310, 380, 460, 550, 660, 790, 940, 1120,
  1330, 1580, 1880, 2240, 2680, 3200, 3840, 4600, 5500, 6600,
];

export function getXpForLevel(level: number): number {
  if (level < LEVEL_XP_TABLE.length) return LEVEL_XP_TABLE[level] ?? 9999;
  return 6600 + (level - 29) * 1500;
}
