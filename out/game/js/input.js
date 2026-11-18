// Keyboard and pointer input. Held keys steer the warden's arc; the pointer
// aims it straight at the cursor. One-shot presses (start/restart, pulse, pause,
// mute) are queued as bit flags and taken once by the loop, so a press between
// two frames is never lost and never counted twice.
import { CENTER } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PULSE = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PULSE = new Set(['Space', 'ShiftLeft', 'ShiftRight']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  let left = false;
  let right = false;
  let actions = 0;
  let pointer = null;
  let view = { scale: 1, x: 0, y: 0 };

  function aimFromEvent(event) {
    // The canvas is device-pixel sized while the stage is a fixed logical area:
    // map the cursor through the same transform the renderer uses.
    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * target.width / (window.devicePixelRatio || 1);
    const y = ((event.clientY - rect.top) / rect.height) * target.height / (window.devicePixelRatio || 1);
    const stageX = (x - view.x) / view.scale;
    const stageY = (y - view.y) / view.scale;
    pointer = Math.atan2(stageY - CENTER.y, stageX - CENTER.x);
  }

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM | (event.code === 'Space' ? ACTION_PULSE : 0);
    } else if (PULSE.has(event.code)) {
      if (!event.repeat) actions |= event.code === 'Space' ? ACTION_CONFIRM | ACTION_PULSE : ACTION_PULSE;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    if (event.code !== 'Escape') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
  });
  target.addEventListener('pointermove', (event) => {
    aimFromEvent(event);
  });
  target.addEventListener('pointerdown', (event) => {
    aimFromEvent(event);
    actions |= ACTION_CONFIRM;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    turn() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** Angle the pointer points at, relative to the core, or null before the mouse moves. */
    aim() {
      return pointer;
    },
    /** Tell the input how the stage is laid out, so pointer aim maps correctly. */
    setView(next) {
      view = next;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
