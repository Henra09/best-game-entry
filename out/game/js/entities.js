// Pooled game objects: the shards falling toward the core, the sparks they
// throw off, and the rings a pulse expands into. Every object is allocated at
// boot and reused, so a frame of play allocates nothing. Rules live in world.js;
// this file only owns storage, motion of the purely decorative bits, and the
// small helpers that hand objects out.
import { ENEMY_POOL, PARTICLE_POOL, RING_POOL } from './config.js';

export const KIND_SHARD = 0;
export const KIND_HUNTER = 1;
export const KIND_ELITE = 2;
export const KIND_MOTE = 3;

/** Collision radius per kind: elites are broad, hunters slim. */
export const KIND_RADIUS = [15, 13, 28, 12];

function makeEnemy() {
  return {
    active: false,
    kind: KIND_SHARD,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    vx: 0,
    vy: 0,
    radius: KIND_RADIUS[KIND_SHARD],
    rot: 0,
    spin: 0,
    born: 0,
  };
}

function makeParticle() {
  return { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0, size: 0, drag: 0, color: '#fff' };
}

function makeRing() {
  return { active: false, x: 0, y: 0, radius: 0, from: 0, to: 0, life: 0, max: 0, color: '#fff', width: 2 };
}

export function createEntities(random) {
  const enemies = [];
  const particles = [];
  const rings = [];
  for (let index = 0; index < ENEMY_POOL; index += 1) enemies.push(makeEnemy());
  for (let index = 0; index < PARTICLE_POOL; index += 1) particles.push(makeParticle());
  for (let index = 0; index < RING_POOL; index += 1) rings.push(makeRing());

  let particleCursor = 0;
  let ringCursor = 0;

  function freeEnemy() {
    for (let index = 0; index < enemies.length; index += 1) if (!enemies[index].active) return enemies[index];
    return null;
  }

  /** Hand out an enemy of `kind` at (x, y) with velocity (vx, vy). */
  function spawn(kind, x, y, vx, vy, spin) {
    const enemy = freeEnemy();
    if (enemy === null) return null;
    enemy.active = true;
    enemy.kind = kind;
    enemy.x = x;
    enemy.y = y;
    enemy.prevX = x;
    enemy.prevY = y;
    enemy.vx = vx;
    enemy.vy = vy;
    enemy.radius = KIND_RADIUS[kind];
    enemy.rot = random() * Math.PI * 2;
    enemy.spin = spin ?? (random() - 0.5) * 4;
    enemy.born = 0;
    return enemy;
  }

  /** One spark. Reuses the oldest slot when the pool is exhausted. */
  function spark(x, y, vx, vy, size, life, color, drag) {
    const particle = particles[particleCursor];
    particleCursor = (particleCursor + 1) % particles.length;
    particle.active = true;
    particle.x = x;
    particle.y = y;
    particle.vx = vx;
    particle.vy = vy;
    particle.size = size;
    particle.life = life;
    particle.max = life;
    particle.color = color;
    particle.drag = drag ?? 2.4;
    return particle;
  }

  /** A burst of `count` sparks flying out from (x, y) at random angles. */
  function burst(x, y, count, color, speed, size, life) {
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const fast = speed * (0.35 + random() * 0.9);
      spark(x, y, Math.cos(angle) * fast, Math.sin(angle) * fast, size * (0.6 + random() * 0.8), life * (0.6 + random() * 0.7), color);
    }
  }

  /** An expanding ring, the visual half of a deflect or a pulse. */
  function ring(x, y, from, to, life, color, width) {
    const entry = rings[ringCursor];
    ringCursor = (ringCursor + 1) % rings.length;
    entry.active = true;
    entry.x = x;
    entry.y = y;
    entry.from = from;
    entry.to = to;
    entry.radius = from;
    entry.life = life;
    entry.max = life;
    entry.color = color;
    entry.width = width ?? 2;
    return entry;
  }

  /** Advance everything purely decorative; rules do not read these back. */
  function updateVisuals(dt) {
    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      const damp = Math.max(0, 1 - particle.drag * dt);
      particle.vx *= damp;
      particle.vy *= damp;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
    for (let index = 0; index < rings.length; index += 1) {
      const entry = rings[index];
      if (!entry.active) continue;
      entry.life -= dt;
      if (entry.life <= 0) {
        entry.active = false;
        continue;
      }
      const progress = 1 - entry.life / entry.max;
      // Ease out: fast at first, settling as it fades.
      entry.radius = entry.from + (entry.to - entry.from) * (1 - (1 - progress) ** 2);
    }
  }

  function clear() {
    for (const enemy of enemies) enemy.active = false;
    for (const particle of particles) particle.active = false;
    for (const entry of rings) entry.active = false;
  }

  return { enemies, particles, rings, spawn, spark, burst, ring, updateVisuals, clear };
}
