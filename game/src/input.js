// input.js — Court of Embers: mouse + keyboard input, one job only.
// Click a hand card to play it (spells that need a target: click the card,
// then click the target). Click one of your creatures, then an enemy
// creature or Rook's life to attack. Keys: 1-5 select hand card,
// Enter ends turn, R restarts.
import { canPlayCard, playCard, attack, endTurn } from './rules.js';
import { sfx } from './audio.js';

export function bindInput(app, getGame, ui, hooks) {
  app.addEventListener('click', (event) => {
    const game = getGame();
    const target = event.target.closest('[data-card-id], #end-turn, #restart, #sound, #start-game');
    if (!target) return;
    if (target.id === 'start-game') { hooks.start(); return; }
    if (target.id === 'restart') { hooks.restart(); return; }
    if (target.id === 'sound') { hooks.toggleSound(); return; }
    if (target.id === 'end-turn') { hooks.endTurn(); return; }
    if (game.phase !== 'play' || game.active !== 'player') return;

    const side = target.dataset.side;
    if (side === 'hand') {
      const idx = Number(target.dataset.handIndex);
      const card = game.player.hand[idx];
      if (!card) return;
      if (ui.selectedHand === idx) { ui.selectedHand = null; hooks.refresh(); return; }
      if (card.kind === 'spell' && card.effect === 'damage3') {
        ui.selectedHand = idx;
        ui.pendingSpell = idx;
        game.message = 'Ember Burst: click an enemy creature or Rook to deal 3 damage.';
        hooks.refresh();
        return;
      }
      const res = playCard(game, 'player', idx, 'life');
      if (res.ok) { sfx.play(); ui.selectedHand = null; hooks.afterPlayerAction(); }
      else { sfx.error(); game.message = res.why; hooks.refresh(); }
      return;
    }
    if (side === 'player') {
      const id = Number(target.dataset.cardId);
      ui.attackerId = ui.attackerId === id ? null : id;
      game.message = ui.attackerId != null
        ? 'Now click an enemy creature, or Rook, to attack.'
        : 'Your turn: play a card, then attack.';
      hooks.refresh();
      return;
    }
    if (side === 'ai') {
      const id = Number(target.dataset.cardId);
      if (ui.pendingSpell != null) {
        const res = playCard(game, 'player', ui.pendingSpell, id);
        ui.pendingSpell = null;
        ui.selectedHand = null;
        if (res.ok) { sfx.play(); hooks.afterPlayerAction(); }
        else { sfx.error(); hooks.refresh(); }
        return;
      }
      if (ui.attackerId != null) {
        const res = attack(game, 'player', ui.attackerId, id);
        ui.attackerId = null;
        if (res.ok) { sfx.attack(); if (res.counterNote) sfx.counter(); hooks.afterPlayerAction(); }
        else { sfx.error(); game.message = res.why; hooks.refresh(); }
        return;
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    const game = getGame();
    if (event.key === 'r' || event.key === 'R') { hooks.restart(); return; }
    if (event.key === 'Enter') { hooks.endTurn(); return; }
    const n = Number(event.key);
    if (n >= 1 && n <= 5 && game.phase === 'play' && game.active === 'player') {
      const idx = n - 1;
      const card = game.player.hand[idx];
      if (!card) return;
      if (card.kind === 'spell' && card.effect === 'damage3') {
        ui.selectedHand = idx;
        ui.pendingSpell = idx;
        game.message = 'Ember Burst: click an enemy creature or Rook to deal 3 damage.';
        hooks.refresh();
        return;
      }
      const res = playCard(game, 'player', idx, 'life');
      if (res.ok) { sfx.play(); hooks.afterPlayerAction(); }
      else { sfx.error(); game.message = res.why; hooks.refresh(); }
    }
  });
}

// Attack Rook's life directly: clicking the life total with an attacker armed.
export function bindLifeAttack(app, getGame, ui, hooks) {
  app.addEventListener('click', (event) => {
    const game = getGame();
    if (game.phase !== 'play' || game.active !== 'player') return;
    if (ui.attackerId == null || ui.pendingSpell != null) return;
    const lifeBox = event.target.closest('.lifebox');
    if (!lifeBox) return;
    const res = attack(game, 'player', ui.attackerId, 'life');
    ui.attackerId = null;
    if (res.ok) { sfx.attack(); hooks.afterPlayerAction(); }
    else { sfx.error(); game.message = res.why; hooks.refresh(); }
  });
}
