// The game's rules and state, with no drawing and no browser in it: the crystal
// core, the warden's rotating arc, the shards converging on it, wave pacing,
// combo chain, prism battery and hearts. step() advances one fixed step and
// returns what happened as bit flags, so the caller can react without the world
// knowing about screens or sound. Nothing allocates after createWorld returns.
import { CENTER, COMBO, CORE, ENEMY, FIELD, MOTE, PULSE, SHIELD, WAVE } from './config.js';
import { KIND_ELITE, KIND_HUNTER, KIND_MOTE, KIND_SHARD } from './entities.js';

export const EVENT_DEFLECT = 1;
export const EVENT_MOTE = 2;
export const EVENT_HURT = 4;
export const EVENT_PULSE = 8;
export const EVENT_WAVE = 16;
export const EVENT_OVER = 32;

const PI2 = Math.PI * 2;

/** Shortest signed difference between two angles. */
function angleDiff(a, b) {
  let diff = (b - a) % PI2;
  if (diff > Math.PI) diff -= PI2;
  if (diff < -Math.PI) diff += PI2;
  return diff;
}

/** A point just outside a random edge of the stage. */
function edgePoint(random, margin) {
  const side = Math.floor(random() * 4);
  const along = random() * (side % 2 === 0 ? FIELD.width : FIELD.height);
  if (side === 0) return { x: along, y: -margin };
  if (side === 1) return { x: FIELD.width + margin, y: along };
  if (side === 2) return { x: along, y: FIELD.height + margin };
  return { x: -margin, y: along };
}

export function createWorld(random, entities) {
  const state = {
    // The pooled enemies, sparks and rings live here too: rules and drawing
    // both read them, and the renderer only ever looks.
    entities,
    // The core.
    hearts: CORE.hearts,
    invuln: 0,
    coreFlash: 0,
    // The warden.
    angle: -Math.PI / 2,
    energy: SHIELD.startEnergy,
    cooldown: 0,
    hot: 0,
    // Run state.
    score: 0,
    wave: 1,
    waveTime: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    deflected: 0,
    elapsed: 0,
    // The pulse's expanding shockwave; 0 when none is flying.
    pulse: 0,
    pulseRadius: 0,
    // Presentation feedback the renderer reads: shake in stage units, flash 0..1.
    shake: 0,
    flash: 0,
    banner: 0,
    // Internal timers.
    spawnTimer: ENEMY.interval,
    moteTimer: MOTE.interval,
  };

  function reset() {
    state.hearts = CORE.hearts;
    state.invuln = 0;
    state.coreFlash = 0;
    state.angle = -Math.PI / 2;
    state.energy = SHIELD.startEnergy;
    state.cooldown = 0;
    state.hot = 0;
    state.score = 0;
    state.wave = 1;
    state.waveTime = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.bestCombo = 0;
    state.deflected = 0;
    state.elapsed = 0;
    state.pulse = 0;
    state.pulseRadius = 0;
    state.shake = 0;
    state.flash = 0;
    state.banner = 0;
    state.spawnTimer = ENEMY.interval;
    state.moteTimer = MOTE.interval;
    entities.clear();
  }

  function spawnInterval() {
    return Math.max(ENEMY.minInterval, ENEMY.interval * ENEMY.intervalScale ** (state.wave - 1));
  }

  function spawnShard() {
    const point = edgePoint(random, 34);
    const dx = CENTER.x - point.x;
    const dy = CENTER.y - point.y;
    const distance = Math.hypot(dx, dy) || 1;
    const speed = ENEMY.baseSpeed + ENEMY.speedPerWave * (state.wave - 1) * (0.82 + random() * 0.4);
    let kind = KIND_SHARD;
    let vx = (dx / distance) * speed;
    let vy = (dy / distance) * speed;
    if (state.wave >= ENEMY.hunterWave && random() < ENEMY.hunterChance) {
      kind = KIND_HUNTER;
      // Hunters launch a little off-line and curve in as they fly.
      const angle = Math.atan2(dy, dx) + (random() - 0.5) * 1.2;
      vx = Math.cos(angle) * speed * 0.92;
      vy = Math.sin(angle) * speed * 0.92;
    } else if (state.wave >= ENEMY.eliteWave && random() < ENEMY.eliteChance) {
      kind = KIND_ELITE;
    }
    entities.spawn(kind, point.x, point.y, vx, vy, (random() - 0.5) * 5);
  }

  function spawnMote() {
    const point = edgePoint(random, 24);
    const dx = CENTER.x - point.x;
    const dy = CENTER.y - point.y;
    const distance = Math.hypot(dx, dy) || 1;
    entities.spawn(KIND_MOTE, point.x, point.y, (dx / distance) * MOTE.speed, (dy / distance) * MOTE.speed, 1.6);
  }

  /**
   * A deflected elite breaks into two hunting shards that curve back in: the
   * reward for the big hit is a second, faster problem.
   */
  function splitElite(enemy) {
    const base = Math.atan2(enemy.y - CENTER.y, enemy.x - CENTER.x) + Math.PI / 2;
    for (const side of [-1, 1]) {
      const angle = base + side * 0.9;
      entities.spawn(KIND_HUNTER, enemy.x, enemy.y, Math.cos(angle) * 95, Math.sin(angle) * 95, 3 * side);
    }
  }

  function deflect(enemy) {
    enemy.active = false;
    state.deflected += 1;
    state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
    state.comboTimer = COMBO.window;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    state.energy = Math.min(SHIELD.maxEnergy, state.energy + SHIELD.gain);
    state.hot = 1;
    const multiplier = 1 + Math.min(state.combo - 1, COMBO.cap) * COMBO.step;
    state.score += Math.round(ENEMY.points * multiplier);
    const color = enemy.kind === KIND_HUNTER ? '#ff5da2' : enemy.kind === KIND_ELITE ? '#ffb347' : '#3ee6c4';
    entities.burst(enemy.x, enemy.y, enemy.kind === KIND_ELITE ? 20 : 9, color, 230, 3.6, 0.5);
    entities.ring(enemy.x, enemy.y, 6, 46, 0.32, color, 2.5);
    if (enemy.kind === KIND_ELITE) splitElite(enemy);
  }

  function firePulse() {
    state.energy -= PULSE.cost;
    state.pulse = PULSE.life;
    state.pulseRadius = SHIELD.radius * 0.6;
    state.hot = 1;
    entities.ring(CENTER.x, CENTER.y, SHIELD.radius * 0.6, PULSE.radius, PULSE.life, '#7af0ff', 7);
    entities.burst(CENTER.x, CENTER.y, 40, '#7af0ff', 340, 4, 0.65);
  }

  function hurt() {
    state.hearts -= 1;
    state.invuln = CORE.invuln;
    state.combo = 0;
    state.comboTimer = 0;
    state.coreFlash = 1;
    state.shake = 16;
    state.flash = 0.7;
    entities.burst(CENTER.x, CENTER.y, 30, '#ff7b6b', 260, 4, 0.7);
    entities.ring(CENTER.x, CENTER.y, CORE.radius, 160, 0.45, '#ff7b6b', 5);
  }

  /**
   * One fixed step. `steer` is -1, 0 or 1; `aim` is a pointer angle or null;
   * `wantsPulse` is whether the pulse was asked for this step. With `harmless`
   * set (the title screen's backdrop) things fly but nothing collides.
   */
  function step(dt, steer, aim, wantsPulse, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - 42 * dt);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - 2.4 * dt);
    if (state.coreFlash > 0) state.coreFlash = Math.max(0, state.coreFlash - 1.7 * dt);
    if (state.hot > 0) state.hot = Math.max(0, state.hot - 2.8 * dt);
    if (state.banner > 0) state.banner = Math.max(0, state.banner - 1.1 * dt);
    if (state.invuln > 0) state.invuln = Math.max(0, state.invuln - dt);
    if (state.cooldown > 0) state.cooldown = Math.max(0, state.cooldown - dt);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    // Steering: the pointer aims straight at the cursor; keys spin the arc.
    if (steer !== 0) {
      state.angle = (state.angle + steer * SHIELD.turnSpeed * dt) % PI2;
    } else if (aim !== null) {
      const chase = angleDiff(state.angle, aim);
      const limit = SHIELD.chaseSpeed * dt;
      state.angle += Math.max(-limit, Math.min(limit, chase));
    }

    // The pulse's front sweeps outward.
    if (state.pulse > 0) {
      state.pulse -= dt;
      const front = 1 - Math.max(state.pulse, 0) / PULSE.life;
      state.pulseRadius = SHIELD.radius * 0.6 + (PULSE.radius - SHIELD.radius * 0.6) * front;
    }

    if (!harmless) {
      // Wave pacing and trickle recharge.
      state.waveTime += dt;
      if (state.waveTime >= WAVE.seconds && state.wave < WAVE.max) {
        state.wave += 1;
        state.waveTime = 0;
        state.banner = 1;
        events |= EVENT_WAVE;
      }
      state.energy = Math.min(SHIELD.maxEnergy, state.energy + 2.2 * dt);
    }
    // Shards and motes arrive on every screen: the title uses them as a live
    // backdrop (harmless steps skip every collision).
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnShard();
      state.spawnTimer += harmless ? Math.max(spawnInterval(), 0.8) : spawnInterval();
    }
    state.moteTimer -= dt;
    if (state.moteTimer <= 0) {
      spawnMote();
      state.moteTimer += MOTE.interval + random() * MOTE.intervalJitter;
    }

    if (wantsPulse && !harmless && state.energy >= PULSE.cost && state.pulse <= 0) {
      firePulse();
      events |= EVENT_PULSE;
    }

    const enemies = entities.enemies;
    for (let index = 0; index < enemies.length; index += 1) {
      const enemy = enemies[index];
      if (!enemy.active) continue;
      enemy.prevX = enemy.x;
      enemy.prevY = enemy.y;
      enemy.born += dt;
      enemy.rot += enemy.spin * dt;

      if (enemy.kind === KIND_HUNTER) {
        const wanted = Math.atan2(CENTER.y - enemy.y, CENTER.x - enemy.x);
        const current = Math.atan2(enemy.vy, enemy.vx);
        const turned = current + Math.max(-ENEMY.hunterTurn * dt, Math.min(ENEMY.hunterTurn * dt, angleDiff(current, wanted)));
        const speed = Math.hypot(enemy.vx, enemy.vy);
        enemy.vx = Math.cos(turned) * speed;
        enemy.vy = Math.sin(turned) * speed;
      }
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      if (enemy.kind === KIND_HUNTER && random() < 0.3) {
        entities.spark(enemy.x, enemy.y, (random() - 0.5) * 26, (random() - 0.5) * 26, 2.3, 0.3, '#ff5da2', 3);
      }

      const dx = enemy.x - CENTER.x;
      const dy = enemy.y - CENTER.y;
      const distance = Math.hypot(dx, dy);
      const prevDistance = Math.hypot(enemy.prevX - CENTER.x, enemy.prevY - CENTER.y);
      const bearing = Math.atan2(dy, dx);
      const inArc = Math.abs(angleDiff(state.angle, bearing)) <= SHIELD.halfSpan;

      if (enemy.kind === KIND_MOTE) {
        // A mote caught on the arc mints a spare heart (or points at full hearts).
        if (!harmless && inArc && Math.abs(distance - SHIELD.radius) < 60) {
          enemy.active = false;
          events |= EVENT_MOTE;
          if (state.hearts < CORE.maxHearts) state.hearts += 1;
          else state.score += 50;
          entities.burst(enemy.x, enemy.y, 18, '#ffe66d', 210, 3.6, 0.55);
          entities.ring(enemy.x, enemy.y, 8, 60, 0.4, '#ffe66d', 3);
          continue;
        }
      } else {
        // The pulse wipes anything its front has passed.
        if (state.pulse > 0 && distance < state.pulseRadius) {
          enemy.active = false;
          if (!harmless) {
            state.score += Math.round(ENEMY.points * 0.5);
            state.deflected += 1;
            entities.burst(enemy.x, enemy.y, 10, '#7af0ff', 200, 3, 0.45);
          }
          continue;
        }
        // The arc deflects anything crossing the ring inside its span; the
        // crossing test catches shards too fast to land inside the band.
        const crossedRing = prevDistance >= SHIELD.radius && distance < SHIELD.radius;
        const resting = Math.abs(distance - SHIELD.radius) < enemy.radius + 5;
        if (!harmless && inArc && state.cooldown <= 0 && (crossedRing || resting)) {
          deflect(enemy);
          state.cooldown = SHIELD.cooldown;
          events |= EVENT_DEFLECT;
          continue;
        }
      }

      // Reached the core.
      if (distance < enemy.radius + CORE.radius) {
        enemy.active = false;
        if (!harmless) {
          entities.burst(CENTER.x + dx * 0.4, CENTER.y + dy * 0.4, 12, '#ff7b6b', 190, 3, 0.4);
          hurt();
          events |= EVENT_HURT;
          if (state.hearts <= 0) {
            events |= EVENT_OVER;
            break;
          }
        }
        continue;
      }

      if (enemy.x < -80 || enemy.x > FIELD.width + 80 || enemy.y < -80 || enemy.y > FIELD.height + 80) {
        enemy.active = false;
      }
    }

    entities.updateVisuals(dt);
    return events;
  }

  reset();
  return { state, reset, step };
}
