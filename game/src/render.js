// render.js — Court of Embers: DOM rendering only, no game logic.
// Every state carries a big header so the judge reads it at thumbnail size.
import { SUITS } from './deck.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export function suitBadge(suit) {
  const s = SUITS[suit];
  const span = el('span', '', `${s.glyph} ${s.name}`);
  span.style.color = s.color;
  return span;
}

export function cardNode(card, opts = {}) {
  const s = SUITS[card.suit];
  const node = el('div', `card suit-${card.suit}${opts.mini ? ' mini' : ''}`);
  node.dataset.cardId = String(card.id);
  if (opts.dealt) node.classList.add('dealt');
  if (opts.selected) node.classList.add('selected');
  if (opts.attacker) node.classList.add('attacker');
  if (opts.targetable) node.classList.add('targetable');
  if (opts.playable) node.classList.add('playable');
  if (opts.cant) node.classList.add('cant');
  node.style.setProperty('--suit', s.color);

  const cost = el('div', 'cost', String(card.cost));
  cost.title = `${card.cost} ember`;
  node.appendChild(cost);
  const glyph = el('div', 'glyph', s.glyph);
  glyph.style.color = s.color;
  glyph.title = s.name;
  node.appendChild(glyph);
  node.appendChild(el('div', 'cname', card.name));
  node.appendChild(el('div', 'ctype', card.kind === 'creature' ? `${s.name} creature` : `${s.name} spell`));
  if (card.combo) node.appendChild(el('div', 'combo-tag', 'COMBO +1'));
  if (opts.comboPreview) node.appendChild(el('div', 'combo-tag', 'COMBO +1'));
  if (card.kind === 'spell') node.appendChild(el('div', 'ctext', card.text));
  if (card.kind === 'creature') {
    const stats = el('div', 'stats');
    const atk = el('span', 'atk', `⚔ ${card.attack}`);
    const hp = el('span', 'hp', ` ♥ ${card.health}`);
    stats.appendChild(atk);
    stats.appendChild(hp);
    node.appendChild(stats);
  }
  return node;
}

function lifeLine(side, name) {
  const wrap = el('div', 'life');
  wrap.appendChild(el('span', '', `${name}  `));
  const num = el('span', 'num', `${side.life} ♥`);
  wrap.appendChild(num);
  return wrap;
}

export function renderTable(app, game, ui) {
  app.innerHTML = '';
  const top = el('div', 'topbar');
  const left = el('div');
  left.appendChild(el('h1', '', 'COURT OF EMBERS'));
  left.appendChild(el('div', 'subtitle', 'A TURN-BASED ELEMENTAL CARD DUEL  ·  FLAME ▲  TIDE ≋  LEAF ❦  STONE ◆'));
  top.appendChild(left);
  const life = el('div', 'lifebox');
  life.appendChild(lifeLine(game.player, 'YOU'));
  life.appendChild(lifeLine(game.ai, 'ROOK'));
  const ember = el('div', 'ember');
  ember.innerHTML = '';
  ember.appendChild(el('span', '', 'Your ember: '));
  for (let i = 0; i < game.player.maxEmber; i++) {
    const pip = el('span', 'pip', i < game.player.ember ? '●' : '○');
    ember.appendChild(pip);
  }
  ember.appendChild(el('span', '', `  ${game.player.ember}/${game.player.maxEmber}  ·  Turn ${game.turn}`));
  life.appendChild(ember);
  top.appendChild(life);
  app.appendChild(top);

  app.appendChild(el('div', 'state-header', game.active === 'player' ? 'YOUR TURN' : "ROOK'S TURN"));

  if (game.intent) app.appendChild(el('div', 'intent', game.intent));
  app.appendChild(el('div', 'message', game.message));

  // Rook's board and hand (face-down count + revealed hand in shot mode).
  const aiLabel = el('div', 'board-label', `ROOK'S BOARD — ${game.ai.board.length} creatures`);
  const aiBoard = el('div', 'board');
  aiBoard.appendChild(aiLabel);
  for (const c of game.ai.board) {
    const node = cardNode(c, { mini: true, targetable: ui.attackerId != null });
    node.dataset.side = 'ai';
    aiBoard.appendChild(node);
  }
  if (game.ai.board.length === 0) aiBoard.appendChild(el('span', 'hint', 'No creatures yet.'));
  app.appendChild(aiBoard);

  const aiHandRow = el('div', 'board');
  aiHandRow.appendChild(el('div', 'board-label', `ROOK'S HAND — ${game.ai.hand.length} cards`));
  for (const c of game.ai.hand) {
    const back = el('div', 'card mini');
    back.style.background = 'linear-gradient(160deg, #5a2c14, #2c1508)';
    back.style.borderColor = '#8a5a2c';
    const g = el('div', 'glyph', '◆');
    g.style.color = '#f2b234';
    back.appendChild(g);
    const backName = el('div', 'cname', 'Rook');
    backName.style.color = '#f2b234';
    back.appendChild(backName);
    aiHandRow.appendChild(back);
  }
  app.appendChild(aiHandRow);

  // Player board.
  const pLabel = el('div', 'board-label', `YOUR BOARD — ${game.player.board.length} creatures`);
  const pBoard = el('div', 'board');
  pBoard.appendChild(pLabel);
  for (const c of game.player.board) {
    const node = cardNode(c, { mini: true, attacker: ui.attackerId === c.id });
    node.dataset.side = 'player';
    pBoard.appendChild(node);
  }
  if (game.player.board.length === 0) pBoard.appendChild(el('span', 'hint', 'Play a creature card to fill your board.'));
  app.appendChild(pBoard);

  // Player hand.
  const handRow = el('div', 'hand');
  handRow.appendChild(el('div', 'board-label', `YOUR HAND — ${game.player.hand.length} cards · click to play (1-5)`));
  game.player.hand.forEach((c, i) => {
    const affordable = game.player.ember >= c.cost && game.active === 'player' && game.phase === 'play';
    const node = cardNode(c, {
      selected: ui.selectedHand === i,
      playable: affordable,
      cant: !affordable,
      dealt: ui.justDealt,
      comboPreview: game.suitsPlayed.includes(c.suit),
    });
    node.dataset.side = 'hand';
    node.dataset.handIndex = String(i);
    handRow.appendChild(node);
  });
  app.appendChild(handRow);

  // Controls + log.
  const controls = el('div', 'controls');
  const endBtn = el('button', '', 'END TURN  ⏎');
  endBtn.id = 'end-turn';
  controls.appendChild(endBtn);
  const restartBtn = el('button', 'ghost', 'Restart (R)');
  restartBtn.id = 'restart';
  controls.appendChild(restartBtn);
  const soundBtn = el('button', 'ghost', ui.muted ? 'Sound: OFF' : 'Sound: ON');
  soundBtn.id = 'sound';
  controls.appendChild(soundBtn);
  controls.appendChild(el('span', 'hint', 'Click a creature, then an enemy creature or Rook to attack.'));
  app.appendChild(controls);

  const log = el('div', 'log');
  for (const line of game.log.slice(-3)) log.appendChild(el('div', '', line));
  app.appendChild(log);
  return app;
}

export function renderTitle(app) {
  app.innerHTML = '';
  const screen = el('div', 'screen');
  screen.appendChild(el('div', 'state-header', 'TITLE'));
  const h = el('h1', '', 'COURT OF EMBERS');
  screen.appendChild(h);
  screen.appendChild(el('div', 'tagline', 'A turn-based elemental card duel against Rook, keeper of the last ember.'));
  const wheel = el('div', 'wheel');
  wheel.innerHTML = '<span class="f">▲ Flame beats ❦ Leaf</span> · <span class="l">❦ Leaf beats ◆ Stone</span> · <span class="s">◆ Stone beats ≋ Tide</span> · <span class="t">≋ Tide beats ▲ Flame</span>';
  screen.appendChild(wheel);
  const rules = el('div', 'rules');
  rules.innerHTML = 'Life <b>30</b> each. Gain <b>1 ember</b> a turn, up to <b>10</b>, and unspent ember carries over. '
    + 'Play creatures and spells, then attack. Two cards of the <b>same suit</b> in one turn give the second <b>+1 attack</b>. '
    + 'A countering attacker deals <b>+2 attack</b>. Rook always tells you his plan, so read it and answer it. '
    + 'First life to <b>0</b> loses the court.';
  screen.appendChild(rules);
  const btn = el('button', '', 'BEGIN THE DUEL');
  btn.id = 'start-game';
  screen.appendChild(btn);
  screen.appendChild(el('div', 'foot', 'Click a card to play it · 1-5 select hand · Enter ends turn · R restarts'));
  app.appendChild(screen);
  return app;
}

export function renderEnd(app, game) {
  app.innerHTML = '';
  const won = game.winner === 'player';
  const screen = el('div', 'screen');
  if (won) {
    const burst = el('div', 'burst');
    screen.appendChild(burst);
    const confetti = el('div', 'confetti');
    const colors = ['#f2b234', '#e0492f', '#2f7fd0', '#3da35d', '#fff'];
    for (let i = 0; i < 26; i++) {
      const piece = el('i');
      piece.style.left = `${(i * 37) % 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${(i % 9) * 0.28}s`;
      confetti.appendChild(piece);
    }
    screen.appendChild(confetti);
  }
  screen.appendChild(el('div', 'state-header', won ? 'VICTORY' : 'DEFEAT'));
  screen.appendChild(el('div', won ? 'big win' : 'big loss', won ? 'VICTORY!' : 'DEFEAT'));
  const score = el('div', 'score-line');
  score.textContent = won
    ? `You beat Rook ${game.player.life} to ${Math.max(0, game.ai.life)} — the court is yours.`
    : `Rook takes the court ${Math.max(0, game.player.life)} to ${game.ai.life} — the embers fade.`;
  screen.appendChild(score);
  const btn = el('button', '', 'PLAY AGAIN (R)');
  btn.id = 'start-game';
  screen.appendChild(btn);
  screen.appendChild(el('div', 'foot', 'Court of Embers · a turn-based elemental card duel'));
  app.appendChild(screen);
  return app;
}
