// rules.js — Court of Embers: pure turn rules, no DOM, no audio.
// Importable from Node for headless validation as well as from the browser.
// Life 30 each. Ember: gain 1 per turn, max 10, unspent ember carries over.
// Combo: playing two cards of the same suit in one turn gives the second
// card +1 attack (creature) or +1 to its effect (spell).
// Counter: Flame beats Leaf, Leaf beats Stone, Stone beats Tide, Tide
// beats Flame; a countering attacker deals +2 attack.

import { SUITS, buildDeck, makeRng, shuffle } from './deck.js';

export const START_LIFE = 30;
export const MAX_EMBER = 10;
export const MAX_BOARD = 5;
export const MAX_HAND = 7;
export const COUNTER_BONUS = 2;
export const COMBO_BONUS = 1;

export function counters(attackerSuit, defenderSuit) {
  return SUITS[attackerSuit].beats === defenderSuit;
}

export function newSide(rng, deck) {
  const hand = [];
  for (let i = 0; i < 3; i++) hand.push(deck.pop());
  return { life: START_LIFE, ember: 1, maxEmber: 1, deck, hand, board: [], discard: [] };
}

export function newGame(seed = 20261123) {
  const rng = makeRng(seed);
  const playerDeck = shuffle(buildDeck(), rng);
  const aiDeck = shuffle(buildDeck(), rng);
  const game = {
    seed,
    turn: 1,
    phase: 'play',
    active: 'player',
    suitsPlayed: [],
    log: ['The duel begins. You hold the first ember.'],
    intent: '',
    message: 'Your turn: play a card, then attack.',
    player: newSide(rng, playerDeck),
    ai: newSide(rng, aiDeck),
    winner: null,
  };
  return game;
}

export function drawCard(side) {
  if (side.deck.length === 0) return null;
  if (side.hand.length >= MAX_HAND) return side.deck.pop();
  const card = side.deck.pop();
  side.hand.push(card);
  return card;
}

export function startTurn(game, sideName) {
  const side = game[sideName];
  game.active = sideName;
  game.suitsPlayed = [];
  side.maxEmber = Math.min(MAX_EMBER, side.maxEmber + (game.turn > 1 || sideName === 'ai' ? 1 : 0));
  side.ember = Math.min(MAX_EMBER, side.ember + 1);
  if (side.ember > side.maxEmber) side.ember = side.maxEmber;
  drawCard(side);
  for (const c of side.board) c.canAttack = true;
}

export function comboBonus(game, card) {
  return game.suitsPlayed.includes(card.suit) ? COMBO_BONUS : 0;
}

export function canPlayCard(game, sideName, handIndex) {
  const side = game[sideName];
  const card = side.hand[handIndex];
  if (!card) return { ok: false, why: 'no card there' };
  if (game.phase !== 'play' || game.active !== sideName) return { ok: false, why: 'not your turn' };
  if (card.kind === 'creature' && side.board.length >= MAX_BOARD) return { ok: false, why: 'board is full' };
  if (side.ember < card.cost) return { ok: false, why: 'not enough ember' };
  return { ok: true, card };
}

// Plays hand[handIndex] for sideName. target: 'life' for spells that hit
// the enemy, or an enemy board creature id for damage spells.
export function playCard(game, sideName, handIndex, target = 'life') {
  const check = canPlayCard(game, sideName, handIndex);
  if (!check.ok) return check;
  const side = game[sideName];
  const foe = game[sideName === 'player' ? 'ai' : 'player'];
  const card = check.card;
  const bonus = comboBonus(game, card);
  side.ember -= card.cost;
  side.hand.splice(handIndex, 1);
  game.suitsPlayed.push(card.suit);

  if (card.kind === 'creature') {
    const placed = { ...card, attack: card.attack + bonus, canAttack: false, justPlayed: true, combo: bonus > 0 };
    side.board.push(placed);
    game.log.push(`${sideName} summons ${card.name} (${card.attack + bonus}/${card.health})${bonus ? ' — same-suit combo +1!' : ''}`);
    return { ok: true, card: placed, bonus };
  }

  // Spells.
  let note = '';
  if (card.effect === 'damage3') {
    const dmg = 3 + bonus;
    if (target === 'life') {
      foe.life -= dmg;
      note = `${card.name} hits Rook for ${dmg}.`;
    } else {
      const t = foe.board.find((c) => c.id === target);
      if (t) {
        t.health -= dmg;
        note = `${card.name} hits ${t.name} for ${dmg}.`;
        sweepDead(foe);
      }
    }
  } else if (card.effect === 'draw2') {
    drawCard(side);
    drawCard(side);
    note = `${card.name} draws 2 cards.`;
  } else if (card.effect === 'heal5') {
    const healed = 5 + bonus;
    side.life = Math.min(START_LIFE, side.life + healed);
    note = `${card.name} restores ${healed} life.`;
  } else if (card.effect === 'quake2') {
    for (const c of foe.board) c.health -= 2 + bonus;
    sweepDead(foe);
    note = `${card.name} shakes every enemy creature for ${2 + bonus}.`;
  }
  side.discard.push(card);
  game.log.push(note);
  checkWin(game);
  return { ok: true, card, bonus, note };
}

export function sweepDead(side) {
  const dead = side.board.filter((c) => c.health <= 0);
  for (const c of dead) side.discard.push(c);
  side.board = side.board.filter((c) => c.health > 0);
  return dead;
}

// Attack with board creature attackerId against targetId ('life' or an
// enemy creature id). The defender strikes back with its own attack.
export function attack(game, sideName, attackerId, targetId) {
  const side = game[sideName];
  const foe = game[sideName === 'player' ? 'ai' : 'player'];
  const attacker = side.board.find((c) => c.id === attackerId);
  if (!attacker) return { ok: false, why: 'no such attacker' };
  if (game.phase !== 'play' || game.active !== sideName) return { ok: false, why: 'not your turn' };
  if (!attacker.canAttack) return { ok: false, why: 'that creature cannot attack yet' };

  let dmg = attacker.attack;
  let counterNote = '';
  if (targetId === 'life') {
    foe.life -= dmg;
    game.log.push(`${attacker.name} strikes Rook's life for ${dmg}.`);
  } else {
    const defender = foe.board.find((c) => c.id === targetId);
    if (!defender) return { ok: false, why: 'no such target' };
    if (counters(attacker.suit, defender.suit)) {
      dmg += COUNTER_BONUS;
      counterNote = ` — ${SUITS[attacker.suit].name} counters ${SUITS[defender.suit].name} (+${COUNTER_BONUS})!`;
    }
    defender.health -= dmg;
    let back = defender.attack;
    if (counters(defender.suit, attacker.suit)) back += COUNTER_BONUS;
    attacker.health -= back;
    game.log.push(`${attacker.name} hits ${defender.name} for ${dmg}${counterNote} and takes ${back} back.`);
    sweepDead(foe);
    sweepDead(side);
  }
  attacker.canAttack = false;
  attacker.justPlayed = false;
  checkWin(game);
  return { ok: true, damage: dmg, counterNote };
}

export function checkWin(game) {
  if (game.player.life <= 0 && game.ai.life <= 0) {
    game.winner = 'draw';
    game.phase = 'win';
  } else if (game.ai.life <= 0) {
    game.winner = 'player';
    game.phase = 'win';
  } else if (game.player.life <= 0) {
    game.winner = 'ai';
    game.phase = 'loss';
  }
  if (game.winner) {
    game.log.push(game.winner === 'player' ? 'Victory! The court is yours.' : 'Defeat. Rook takes the embers.');
  }
  return game.winner;
}

export function endTurn(game) {
  if (game.phase !== 'play') return;
  if (game.active === 'player') {
    game.turn++;
    startTurn(game, 'ai');
    game.message = "Rook's turn...";
  } else {
    game.turn++;
    startTurn(game, 'player');
    game.message = 'Your turn: play a card, then attack.';
  }
}

// Deterministic scripted mid-game table for ?shot=table (and the win/loss
// shots, which adjust life afterwards). Same seed, same table, every run.
export function scriptedTable(seed = 20261123) {
  const game = newGame(seed);
  const p = game.player;
  const a = game.ai;
  // Clear the dealt hands and lay out a readable mid-game board.
  p.hand = [
    { id: 101, kind: 'creature', suit: 'flame', name: 'Blaze Drake', cost: 3, attack: 3, health: 3, maxHealth: 3 },
    { id: 102, kind: 'creature', suit: 'tide', name: 'Wave Rider', cost: 3, attack: 3, health: 4, maxHealth: 4 },
    { id: 103, kind: 'spell', suit: 'leaf', name: 'Verdant Bloom', cost: 2, effect: 'heal5', text: 'Restore 5 life.' },
    { id: 104, kind: 'creature', suit: 'stone', name: 'Marble Knight', cost: 2, attack: 3, health: 3, maxHealth: 3 },
    { id: 105, kind: 'spell', suit: 'flame', name: 'Ember Burst', cost: 2, effect: 'damage3', text: 'Deal 3 damage.' },
  ];
  p.board = [
    { id: 201, kind: 'creature', suit: 'flame', name: 'Cinder Wolf', cost: 2, attack: 2, health: 2, maxHealth: 2, canAttack: true, justPlayed: false },
    { id: 202, kind: 'creature', suit: 'leaf', name: 'Moss Bear', cost: 3, attack: 4, health: 3, maxHealth: 3, canAttack: true, justPlayed: false, combo: true },
    { id: 203, kind: 'creature', suit: 'tide', name: 'Foam Knight', cost: 2, attack: 2, health: 3, maxHealth: 3, canAttack: false, justPlayed: true },
  ];
  a.hand = [
    { id: 301, kind: 'creature', suit: 'stone', name: 'Granite Hound', cost: 2, attack: 2, health: 3, maxHealth: 3 },
    { id: 302, kind: 'creature', suit: 'flame', name: 'Ash Phoenix', cost: 2, attack: 3, health: 2, maxHealth: 2 },
    { id: 303, kind: 'spell', suit: 'tide', name: 'Tidal Surge', cost: 2, effect: 'draw2', text: 'Draw 2 cards.' },
  ];
  a.board = [
    { id: 401, kind: 'creature', suit: 'stone', name: 'Boulder Troll', cost: 3, attack: 3, health: 6, maxHealth: 6, canAttack: true, justPlayed: false },
    { id: 402, kind: 'creature', suit: 'flame', name: 'Ember Imp', cost: 1, attack: 2, health: 1, maxHealth: 1, canAttack: true, justPlayed: false },
  ];
  p.ember = 5;
  p.maxEmber = 5;
  a.ember = 4;
  a.maxEmber = 4;
  p.life = 30;
  a.life = 24;
  game.turn = 6;
  game.active = 'player';
  game.suitsPlayed = ['leaf'];
  game.intent = 'Rook plans: play Granite Hound, then strike Cinder Wolf with Boulder Troll.';
  game.message = 'Your turn: play a card, then attack. Flame counters Leaf, Tide counters Flame.';
  game.log = [
    'Turn 5: Rook played Boulder Troll.',
    'Turn 5: Moss Bear hit Boulder Troll for 4.',
    'Turn 6: your ember rises to 5.',
  ];
  return game;
}
