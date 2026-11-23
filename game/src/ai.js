// ai.js — Rook, the AI opponent. Readable and counterable on purpose:
// every turn it announces its plan in one intent line before it acts,
// so the player can see the threat and answer it.
import { counters, canPlayCard, playCard, attack } from './rules.js';

// Pick the best affordable card to play: highest cost first, prefer a
// creature whose suit counters something on the player's board.
export function pickCardToPlay(game) {
  const ai = game.ai;
  const affordable = ai.hand
    .map((card, i) => ({ card, i }))
    .filter(({ card, i }) => canPlayCard(game, 'ai', i).ok);
  if (affordable.length === 0) return -1;
  affordable.sort((a, b) => {
    const counterA = game.player.board.some((c) => counters(a.card.suit, c.suit)) ? 1 : 0;
    const counterB = game.player.board.some((c) => counters(b.card.suit, c.suit)) ? 1 : 0;
    if (counterB !== counterA) return counterB - counterA;
    return b.card.cost - a.card.cost;
  });
  return affordable[0].i;
}

// Describe the plan in plain words for the intent line.
export function describeIntent(game) {
  const ai = game.ai;
  const parts = [];
  const idx = pickCardToPlay(game);
  if (idx >= 0) parts.push(`play ${ai.hand[idx].name}`);
  const ready = ai.board.filter((c) => c.canAttack);
  if (ready.length > 0) {
    const target = game.player.board.find((c) => counters(ready[0].suit, c.suit)) ?? game.player.board[0];
    if (target) parts.push(`strike ${target.name} with ${ready[0].name}`);
    else parts.push(`strike your life with ${ready[0].name}`);
  }
  if (parts.length === 0) parts.push('hold ember and wait');
  return `Rook plans: ${parts.join(', then ')}.`;
}

// Run one full AI turn: announce intent, play up to two cards, attack
// with every ready creature (lethal first, then the best counter trade),
// then hand the turn back.
export function takeAiTurn(game) {
  game.intent = describeIntent(game);
  game.log.push(game.intent);
  let played = 0;
  while (played < 2) {
    const idx = pickCardToPlay(game);
    if (idx < 0) break;
    const card = game.ai.hand[idx];
    let target = 'life';
    if (card.effect === 'damage3' && game.player.board.length > 0) {
      const weak = game.player.board.slice().sort((a, b) => a.health - b.health)[0];
      target = weak.id;
    }
    playCard(game, 'ai', idx, target);
    played++;
    if (game.phase !== 'play') return;
  }
  const attackers = game.ai.board.filter((c) => c.canAttack);
  for (const atk of attackers) {
    if (game.phase !== 'play') break;
    const foeLife = game.player.life;
    if (atk.attack >= foeLife) {
      attack(game, 'ai', atk.id, 'life');
      continue;
    }
    // Best trade: a defender this attacker counters, else the weakest.
    const countered = game.player.board.find((c) => counters(atk.suit, c.suit));
    const target = countered ?? game.player.board.slice().sort((a, b) => a.health - b.health)[0];
    if (target) attack(game, 'ai', atk.id, target.id);
    else attack(game, 'ai', atk.id, 'life');
  }
}
