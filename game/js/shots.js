// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (aim the arc at the shard that will arrive soonest, fire the
// pulse when the battery is full, chase motes), so the frame is what a short
// game really looks like and the same seed always gives the same frame.
import { CENTER, STEP } from './config.js';
import { KIND_MOTE } from './entities.js';
import { EVENT_OVER } from './world.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 34;
const END_LIMIT_SECONDS = 420;

/**
 * Pick the angle the autopilot wants the arc at this step: the most urgent
 * mote when one is close, else the shard arriving soonest. Returns null to
 * leave the arc where it is.
 */
function autopilot(state) {
  const entities = state.entities;
  let threat = null;
  let threatEta = Infinity;
  let mote = null;
  let moteEta = Infinity;
  for (let index = 0; index < entities.enemies.length; index += 1) {
    const enemy = entities.enemies[index];
    if (!enemy.active) continue;
    const dx = enemy.x - CENTER.x;
    const dy = enemy.y - CENTER.y;
    const distance = Math.hypot(dx, dy);
    const speed = Math.hypot(enemy.vx, enemy.vy) || 1;
    // Time until it would reach the arc, not the core: that is when the block matters.
    const eta = Math.max(0, distance - 96) / speed;
    if (enemy.kind === KIND_MOTE) {
      if (eta < moteEta) {
        moteEta = eta;
        mote = Math.atan2(dy, dx);
      }
      continue;
    }
    // Prefer what is closest to the ring; within that, what is nearest the arc.
    const bearing = Math.atan2(dy, dx);
    let turn = Math.abs(bearing - state.angle) % (Math.PI * 2);
    if (turn > Math.PI) turn = Math.PI * 2 - turn;
    const urgency = eta + turn * 0.05;
    if (urgency < threatEta) {
      threatEta = urgency;
      threat = bearing;
    }
  }
  if (mote !== null && moteEta < 3) return mote;
  return threat;
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    // The title screen's backdrop: real spawning, nothing collides, the arc idles.
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      const angle = -Math.PI / 2 + index * STEP * 0.5;
      world.step(STEP, 0, angle, false, true);
    }
    return { screen: 'title', best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const steps = Math.round(limit / STEP);
  for (let index = 0; index < steps; index += 1) {
    const aim = autopilot(world.state);
    const fire = world.state.energy >= 100 && world.state.pulse <= 0;
    if (world.step(STEP, 0, aim, fire, false) & EVENT_OVER) break;
  }
  const over = world.state.hearts <= 0;
  return { screen: over ? 'over' : 'play', best: world.state.score };
}
