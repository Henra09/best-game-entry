// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 stage is scaled to fit the window and centred, the margin filled
// with the backdrop. Everything is procedural canvas: gradient nebula, star
// field, glow via shadowBlur, particles, rings, panels. Screen shake offsets
// the whole stage; the HUD and panels stay still.
import { CENTER, COLORS, CORE, FIELD, FONT, SHIELD, WAVE } from './config.js';
import { KIND_ELITE, KIND_HUNTER, KIND_MOTE, KIND_SHARD } from './entities.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const ENEMY_COLOR = [COLORS.shard, COLORS.hunter, COLORS.elite, COLORS.mote];

/** A star field that never changes: generated once, painted every frame. */
function makeStars() {
  let a = 20260101;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const stars = [];
  for (let index = 0; index < 130; index += 1) {
    stars.push({ x: next() * FIELD.width, y: next() * FIELD.height, r: 0.6 + next() * 1.6, tw: next() * Math.PI * 2, sp: 0.6 + next() * 1.8 });
  }
  return stars;
}

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const stars = makeStars();
  let fonts = null;
  let nebula = null;

  const scoreLabel = cachedLabel('SCORE ');
  const waveLabel = cachedLabel('WAVE ');
  const finalLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');
  const deflectsLabel = cachedLabel('DEFLECTED ');
  const chainLabel = cachedLabel('CHAIN x');

  function buildStatics() {
    fonts = new Map();
    nebula = document.createElement('canvas');
    nebula.width = FIELD.width;
    nebula.height = FIELD.height;
    const g = nebula.getContext('2d');
    const gradient = g.createRadialGradient(CENTER.x, CENTER.y * 0.7, 60, CENTER.x, CENTER.y, 860);
    gradient.addColorStop(0, COLORS.bgA);
    gradient.addColorStop(1, COLORS.bgB);
    g.fillStyle = gradient;
    g.fillRect(0, 0, FIELD.width, FIELD.height);
    g.strokeStyle = COLORS.grid;
    g.lineWidth = 1;
    for (let x = 40; x < FIELD.width; x += 80) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, FIELD.height);
      g.stroke();
    }
    for (let y = 40; y < FIELD.height; y += 80) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(FIELD.width, y);
      g.stroke();
    }
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
    buildStatics();
  }

  function font(size) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    return fonts.get(size);
  }

  function text(value, x, y, size, color, align = 'center', blur = 0) {
    context.font = font(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.shadowBlur = blur;
    context.shadowColor = color;
    context.fillText(value, x, y);
    context.shadowBlur = 0;
    context.shadowColor = 'transparent';
  }

  function drawBackdrop(state, time) {
    context.drawImage(nebula, 0, 0);
    for (let index = 0; index < stars.length; index += 1) {
      const star = stars[index];
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * star.sp + star.tw));
      context.globalAlpha = twinkle * 0.8;
      context.fillStyle = '#cfe8ff';
      context.beginPath();
      context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    // The core's soft halo, breathing with time.
    const breathe = 1 + 0.06 * Math.sin(time * 2.4);
    const halo = context.createRadialGradient(CENTER.x, CENTER.y, 0, CENTER.x, CENTER.y, 130 * breathe);
    halo.addColorStop(0, 'rgba(122, 240, 255, 0.28)');
    halo.addColorStop(1, 'rgba(122, 240, 255, 0)');
    context.fillStyle = halo;
    context.beginPath();
    context.arc(CENTER.x, CENTER.y, 130 * breathe, 0, Math.PI * 2);
    context.fill();
    // The shield's track, a faint circle the arc rides.
    context.strokeStyle = COLORS.ring;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(CENTER.x, CENTER.y, SHIELD.radius, 0, Math.PI * 2);
    context.stroke();
  }

  function drawCore(state, time) {
    const hurt = state.invuln > 0;
    const color = hurt ? COLORS.hurt : COLORS.core;
    // Faceted crystal: a hexagon with inner facets.
    const wobble = 1 + 0.05 * Math.sin(time * 3.1);
    const r = CORE.radius * wobble;
    context.shadowBlur = hurt ? 30 : 22;
    context.shadowColor = color;
    context.fillStyle = hurt && Math.floor(state.invuln * 10) % 2 === 0 ? 'rgba(255,123,107,0.25)' : color;
    context.beginPath();
    for (let point = 0; point < 6; point += 1) {
      const angle = (point / 6) * Math.PI * 2 + time * 0.4;
      const px = CENTER.x + Math.cos(angle) * r;
      const py = CENTER.y + Math.sin(angle) * r;
      if (point === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.shadowColor = 'transparent';
    // Inner facet lines.
    context.strokeStyle = 'rgba(255,255,255,0.5)';
    context.lineWidth = 1.5;
    context.beginPath();
    for (let point = 0; point < 3; point += 1) {
      const angle = (point / 3) * Math.PI * 2 + time * 0.4;
      context.moveTo(CENTER.x + Math.cos(angle) * r * 0.9, CENTER.y + Math.sin(angle) * r * 0.9);
      context.lineTo(CENTER.x - Math.cos(angle) * r * 0.9, CENTER.y - Math.sin(angle) * r * 0.9);
    }
    context.stroke();
    if (state.coreFlash > 0) {
      context.globalAlpha = state.coreFlash * 0.7;
      context.fillStyle = '#ff7b6b';
      context.beginPath();
      context.arc(CENTER.x, CENTER.y, r + 14, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
  }

  function drawShield(state) {
    const hot = state.hot > 0;
    const ready = state.cooldown <= 0;
    const color = hot ? COLORS.hot : ready ? COLORS.shield : 'rgba(122, 240, 255, 0.4)';
    context.save();
    context.translate(CENTER.x, CENTER.y);
    context.rotate(state.angle);
    context.shadowBlur = hot ? 26 : 14;
    context.shadowColor = COLORS.shield;
    context.strokeStyle = color;
    context.lineWidth = 9;
    context.lineCap = 'round';
    context.beginPath();
    context.arc(0, 0, SHIELD.radius, -SHIELD.halfSpan, SHIELD.halfSpan);
    context.stroke();
    // End caps.
    context.fillStyle = color;
    for (const side of [-SHIELD.halfSpan, SHIELD.halfSpan]) {
      context.beginPath();
      context.arc(Math.cos(side) * SHIELD.radius, Math.sin(side) * SHIELD.radius, 6, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    context.shadowBlur = 0;
    context.shadowColor = 'transparent';
  }

  function drawEnemies(state, time) {
    const enemies = state.entities.enemies;
    for (let index = 0; index < enemies.length; index += 1) {
      const enemy = enemies[index];
      if (!enemy.active) continue;
      const color = ENEMY_COLOR[enemy.kind];
      context.shadowBlur = 12;
      context.shadowColor = color;
      context.fillStyle = color;
      if (enemy.kind === KIND_MOTE) {
        // A drifting prism mote: a four-pointed star.
        context.save();
        context.translate(enemy.x, enemy.y);
        context.rotate(time * 1.5);
        context.beginPath();
        for (let point = 0; point < 8; point += 1) {
          const angle = (point / 8) * Math.PI * 2;
          const radius = point % 2 === 0 ? enemy.radius * 1.4 : enemy.radius * 0.5;
          const px = Math.cos(angle) * radius;
          const py = Math.sin(angle) * radius;
          if (point === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.closePath();
        context.fill();
        context.restore();
      } else if (enemy.kind === KIND_ELITE) {
        context.save();
        context.translate(enemy.x, enemy.y);
        context.rotate(enemy.rot);
        context.beginPath();
        for (let point = 0; point < 8; point += 1) {
          const angle = (point / 8) * Math.PI * 2;
          const px = Math.cos(angle) * enemy.radius;
          const py = Math.sin(angle) * enemy.radius;
          if (point === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.closePath();
        context.fill();
        context.fillStyle = '#12102c';
        context.beginPath();
        context.arc(0, 0, enemy.radius * 0.45, 0, Math.PI * 2);
        context.fill();
        context.restore();
      } else {
        // Shards and hunters: elongated triangles pointing where they fly.
        const angle = Math.atan2(enemy.vy, enemy.vx);
        context.save();
        context.translate(enemy.x, enemy.y);
        context.rotate(angle);
        context.beginPath();
        context.moveTo(enemy.radius * 1.5, 0);
        context.lineTo(-enemy.radius * 0.9, enemy.radius * 0.75);
        context.lineTo(-enemy.radius * 0.4, 0);
        context.lineTo(-enemy.radius * 0.9, -enemy.radius * 0.75);
        context.closePath();
        context.fill();
        context.restore();
      }
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
    }
  }

  function drawEffects(state, time) {
    const entities = state.entities;
    // Particles.
    for (let index = 0; index < entities.particles.length; index += 1) {
      const particle = entities.particles[index];
      if (!particle.active) continue;
      const alpha = particle.life / particle.max;
      context.globalAlpha = alpha;
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * (0.4 + alpha * 0.6), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    // Rings.
    for (let index = 0; index < entities.rings.length; index += 1) {
      const ring = entities.rings[index];
      if (!ring.active) continue;
      const alpha = ring.life / ring.max;
      context.globalAlpha = alpha * 0.9;
      context.strokeStyle = ring.color;
      context.lineWidth = ring.width;
      context.beginPath();
      context.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 1;
    // The pulse's live front.
    if (state.pulse > 0) {
      context.globalAlpha = Math.min(1, state.pulse / 0.18);
      context.strokeStyle = COLORS.shield;
      context.lineWidth = 10;
      context.shadowBlur = 24;
      context.shadowColor = COLORS.shield;
      context.beginPath();
      context.arc(CENTER.x, CENTER.y, state.pulseRadius, 0, Math.PI * 2);
      context.stroke();
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
      context.globalAlpha = 1;
    }
  }

  function drawHud(state) {
    context.textBaseline = 'alphabetic';
    text(scoreLabel(state.score), 24, 44, 30, COLORS.text, 'left', 8);
    text(waveLabel(state.wave), FIELD.width / 2, 44, 26, COLORS.muted);
    // Hearts.
    for (let heart = 0; heart < CORE.maxHearts; heart += 1) {
      const x = FIELD.width - 34 - (CORE.maxHearts - 1 - heart) * 34;
      const y = 32;
      const alive = heart < state.hearts;
      context.shadowBlur = alive ? 10 : 0;
      context.shadowColor = COLORS.danger;
      context.fillStyle = alive ? COLORS.danger : 'rgba(143, 151, 201, 0.25)';
      drawHeart(x, y, 12);
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
    }
    // The prism battery, a bar under the score.
    const barWidth = 220;
    const fill = (state.energy / SHIELD.maxEnergy) * barWidth;
    context.fillStyle = 'rgba(122, 240, 255, 0.14)';
    context.fillRect(24, 56, barWidth, 10);
    const full = state.energy >= SHIELD.maxEnergy;
    context.fillStyle = full ? COLORS.gold : COLORS.shield;
    context.shadowBlur = full ? 12 : 6;
    context.shadowColor = context.fillStyle;
    context.fillRect(24, 56, fill, 10);
    context.shadowBlur = 0;
    context.shadowColor = 'transparent';
    if (full) text('PULSE READY — SPACE', 24 + barWidth / 2, 84, 15, COLORS.gold);
    // Combo chain, mid-left when live.
    if (state.combo >= 2) {
      const scale = 1 + Math.min(state.comboTimer / 2.4, 1) * 0.35;
      text(chainLabel(state.combo), 60, 140, Math.round(22 * scale), COLORS.gold, 'left', 10);
    }
    // Wave banner, fading in the middle of the arena.
    if (state.banner > 0) {
      context.globalAlpha = Math.min(1, state.banner);
      text(`WAVE ${state.wave}`, FIELD.width / 2, FIELD.height / 2 - 110, 46, COLORS.shield, 'center', 16);
      context.globalAlpha = 1;
    }
  }

  function drawHeart(x, y, size) {
    context.beginPath();
    context.moveTo(x, y + size * 0.3);
    context.bezierCurveTo(x, y, x - size * 0.7, y - size * 0.4, x - size * 0.7, y + size * 0.15);
    context.bezierCurveTo(x - size * 0.7, y + size * 0.6, x, y + size * 0.9, x, y + size * 1.2);
    context.bezierCurveTo(x, y + size * 0.9, x + size * 0.7, y + size * 0.6, x + size * 0.7, y + size * 0.15);
    context.bezierCurveTo(x + size * 0.7, y - size * 0.4, x, y, x, y + size * 0.3);
    context.fill();
  }

  function drawPanel(title, lines, prompt, subtitle) {
    const width = 640;
    const lineH = 34;
    const height = 128 + lines.length * lineH + 76;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = COLORS.panel;
    context.strokeStyle = 'rgba(122, 240, 255, 0.35)';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x, y, width, height, 18);
    context.fill();
    context.stroke();
    text(title, FIELD.width / 2, y + 86, 54, COLORS.text, 'center', 18);
    if (subtitle) text(subtitle, FIELD.width / 2, y + 122, 18, COLORS.shield, 'center', 6);
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + 168 + index * lineH, 20, COLORS.muted);
    }
    text(prompt, FIELD.width / 2, y + height - 34, 22, COLORS.gold, 'center', 8);
  }

  const TITLE_LINES = [
    'Rotate the warden arc. Deflect every shard before it reaches the core.',
    'Aim with the mouse (or steer with ← → / A D).',
    'SPACE fires the pulse when the battery is full. M mutes. P pauses.',
    'Gold motes are spare hearts — catch them on the arc.',
    '',
  ];
  const PAUSED_LINES = ['The shards hang in place. Press P to resume.'];
  const OVER_STATS = ['', '', ''];

  /** Paint one frame: the stage, then the HUD or a panel for the current screen. */
  function draw(state, screen, best, time) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = COLORS.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 2 : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 2 : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    context.save();
    context.beginPath();
    context.rect(0, 0, FIELD.width, FIELD.height);
    context.clip();
    drawBackdrop(state, time);
    drawEnemies(state, time);
    drawEffects(state, time);
    drawCore(state, time);
    drawShield(state);
    context.restore();
    if (state.flash > 0) {
      context.fillStyle = `rgba(255, 123, 107, ${state.flash * 0.28})`;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('PRISM WARDEN', TITLE_LINES, 'Press SPACE or click to start', 'the last light, held by one arc');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('PAUSED', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_STATS[0] = finalLabel(state.score);
      OVER_STATS[1] = bestLabel(Math.max(best, state.score));
      OVER_STATS[2] = `${deflectsLabel(state.deflected)}   ·   LONGEST CHAIN x${state.bestCombo}   ·   WAVE ${state.wave}`;
      drawPanel('CORE SHATTERED', OVER_STATS, 'Press SPACE or click to hold the line again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
