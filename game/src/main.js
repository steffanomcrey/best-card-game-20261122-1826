// main.js — Court of Embers: state machine and shot modes.
// Normal mode: title -> play -> win/loss, fully playable with mouse and keys.
// Shot mode (?shot=title|table|win|loss): renders that exact state from a
// deterministic seed, for the screenshots. No network requests anywhere.
import { newGame, scriptedTable, endTurn, checkWin } from './rules.js';
import { takeAiTurn } from './ai.js';
import { renderTable, renderTitle, renderEnd } from './render.js';
import { bindInput, bindLifeAttack } from './input.js';
import { sfx, setMuted, isMuted } from './audio.js';

const app = document.getElementById('app');
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') ?? 20261123) || 20261123;

const ui = { selectedHand: null, attackerId: null, pendingSpell: null, justDealt: false, muted: false };
let game = newGame(seed);
let mode = 'title';

function currentGame() {
  return game;
}

function refresh() {
  if (mode === 'title') renderTitle(app);
  else if (game.phase === 'win' || game.phase === 'loss') renderEnd(app, game);
  else renderTable(app, game, ui);
  bindScreenButtons();
}

function bindScreenButtons() {
  const startBtn = document.getElementById('start-game');
  if (startBtn) startBtn.addEventListener('click', startGame);
}

function startGame() {
  game = newGame(seed);
  mode = 'play';
  ui.selectedHand = null;
  ui.attackerId = null;
  ui.pendingSpell = null;
  ui.justDealt = true;
  sfx.deal();
  refresh();
  window.setTimeout(() => { ui.justDealt = false; }, 400);
}

function restart() {
  mode = 'title';
  game = newGame(seed);
  ui.selectedHand = null;
  ui.attackerId = null;
  ui.pendingSpell = null;
  refresh();
}

function afterPlayerAction() {
  ui.selectedHand = null;
  ui.pendingSpell = null;
  ui.attackerId = null;
  if (game.phase === 'win' || game.phase === 'loss') {
    if (game.winner === 'player') sfx.win();
    else sfx.loss();
  }
  refresh();
}

function doEndTurn() {
  if (game.phase !== 'play' || game.active !== 'player' || mode !== 'play') return;
  ui.selectedHand = null;
  ui.attackerId = null;
  ui.pendingSpell = null;
  endTurn(game);
  sfx.turn();
  refresh();
  // Rook acts after a short beat so the intent line is readable.
  window.setTimeout(() => {
    if (game.phase !== 'play' || game.active !== 'ai') return;
    takeAiTurn(game);
    if (game.phase === 'win' || game.phase === 'loss') {
      if (game.winner === 'player') sfx.win();
      else sfx.loss();
      refresh();
      return;
    }
    endTurn(game);
    sfx.turn();
    refresh();
  }, 650);
}

const hooks = {
  start: startGame,
  restart,
  endTurn: doEndTurn,
  afterPlayerAction,
  refresh,
  toggleSound() {
    setMuted(!isMuted());
    ui.muted = isMuted();
    refresh();
  },
};

bindInput(app, currentGame, ui, hooks);
bindLifeAttack(app, currentGame, ui, hooks);

// --- Shot modes: deterministic renders for the four screenshots. ---
if (shot === 'title') {
  mode = 'title';
  game = newGame(seed);
  refresh();
} else if (shot === 'table') {
  mode = 'play';
  game = scriptedTable(seed);
  refresh();
} else if (shot === 'win') {
  mode = 'play';
  game = scriptedTable(seed);
  game.ai.life = 0;
  game.winner = 'player';
  game.phase = 'win';
  game.log.push('Ember Burst hits Rook for 3. Victory! The court is yours.');
  refresh();
} else if (shot === 'loss') {
  mode = 'play';
  game = scriptedTable(seed);
  game.player.life = 0;
  game.winner = 'ai';
  game.phase = 'loss';
  game.log.push('Boulder Troll strikes your life for 3. Defeat. Rook takes the embers.');
  refresh();
} else {
  mode = 'title';
  refresh();
}

// Expose a tiny handle for headless smoke tests (state reads only;
// the game itself never reads the network and never leaves this page).
window.__courtOfEmbers = { getGame: currentGame, startGame, doEndTurn };
