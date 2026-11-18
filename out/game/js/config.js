// PRISM WARDEN — tuning numbers and palette in one place. The arena is a fixed
// 1280x720 logical stage; the renderer scales it to the window, so no rule
// below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };
/** Arena centre: the crystal core sits here; everything falls toward it. */
export const CENTER = { x: FIELD.width / 2, y: FIELD.height / 2 };

/** The simulation's fixed step, in seconds: 60 updates a second on any display. */
export const STEP = 1 / 60;

/** Seconds a wave lasts, and the last wave: spawn rates stop growing there. */
export const WAVE = { seconds: 20, max: 9 };

export const CORE = {
  radius: 30,
  hearts: 3,
  maxHearts: 5,
  /** Seconds of mercy after a hit, so one shard cannot cost two hearts. */
  invuln: 1.1,
};

export const SHIELD = {
  /** Distance from the core at which the warden's arc travels. */
  radius: 96,
  /** Half the arc's opening, in radians: the arc spans twice this. */
  halfSpan: 0.62,
  /** Radians per second under keyboard steering. */
  turnSpeed: 5.8,
  /** Radians per second the arc chases a mouse-aimed angle. */
  chaseSpeed: 18,
  /** Seconds of rest after a deflect before the arc can block again. */
  cooldown: 0.1,
  /** Prism charge gained per deflect, and the battery's ceiling. */
  gain: 13,
  maxEnergy: 100,
  /** Charge carried into a fresh run. */
  startEnergy: 34,
};

/** The pulse: a shockwave bought with a full prism battery, fired with SPACE. */
export const PULSE = {
  cost: 100,
  radius: 250,
  life: 0.45,
};

export const ENEMY = {
  /** Seconds between spawns at wave 1, and the floor the rate decays toward. */
  interval: 1.12,
  intervalScale: 0.89,
  minInterval: 0.34,
  baseSpeed: 82,
  speedPerWave: 12,
  /** Hunters (curving) and elites (which burst into shards) arrive later. */
  hunterWave: 2,
  eliteWave: 3,
  hunterChance: 0.3,
  eliteChance: 0.22,
  hunterTurn: 1.5,
  points: 15,
};

export const MOTE = {
  /** A prism mote drifts in every so often; the arc turns it into a heart. */
  interval: 12,
  intervalJitter: 5,
  speed: 58,
};

export const COMBO = {
  /** Deflects closer together than this chain into a combo. */
  window: 2.4,
  /** Each chain step adds this much to the deflect's multiplier. */
  step: 0.5,
  cap: 6,
};

export const COLORS = {
  shard: '#3ee6c4',
  hunter: '#ff5da2',
  elite: '#ffb347',
  mote: '#ffe66d',
  shield: '#7af0ff',
  hot: '#ffffff',
  core: '#9fffe8',
  hurt: '#ff7b6b',
  backdrop: '#0a0820',
  bgA: '#191142',
  bgB: '#0d0a26',
  grid: 'rgba(122, 240, 255, 0.055)',
  ring: 'rgba(122, 240, 255, 0.13)',
  text: '#eef3ff',
  muted: '#8f97c9',
  panel: 'rgba(10, 8, 32, 0.86)',
  danger: '#ff5da2',
  gold: '#ffe66d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'prism-warden.best';

/** Pool sizes: every shard, spark and ring is allocated once, at boot. */
export const ENEMY_POOL = 96;
export const PARTICLE_POOL = 420;
export const RING_POOL = 16;
