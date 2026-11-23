// deck.js — Court of Embers: suits, the 40-card deck, seeded shuffle.
// Suits are told apart by colour AND by shape glyph, never by text alone:
//   Flame ▲ red, Tide ≋ blue, Leaf ❦ green, Stone ◆ grey-brown.
// Element wheel: Flame beats Leaf, Leaf beats Stone, Stone beats Tide,
// Tide beats Flame. A countering attacker gets +2 attack (see rules.js).

export const SUITS = {
  flame: { name: 'Flame', glyph: '▲', color: '#e0492f', dark: '#8f1d0c', beats: 'leaf' },
  tide: { name: 'Tide', glyph: '≋', color: '#2f7fd0', dark: '#144a80', beats: 'flame' },
  leaf: { name: 'Leaf', glyph: '❦', color: '#3da35d', dark: '#1d5c31', beats: 'stone' },
  stone: { name: 'Stone', glyph: '◆', color: '#8a7a5c', dark: '#4d4231', beats: 'tide' },
};

export function suitOf(name) {
  return SUITS[name] ?? null;
}

// Deterministic RNG (mulberry32) so every ?shot= render is identical.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(cards, rng) {
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

let nextId = 1;
function creature(suit, name, cost, attack, health) {
  return { id: nextId++, kind: 'creature', suit, name, cost, attack, health, maxHealth: health };
}
function spell(suit, name, cost, effect, text) {
  return { id: nextId++, kind: 'spell', suit, name, cost, effect, text };
}

// 8 creatures per suit, costs 1-5. 32 creatures + 8 spells = 40 cards.
const CREATURES = {
  flame: [
    ['Spark Sprite', 1, 1, 1],
    ['Ember Imp', 1, 2, 1],
    ['Cinder Wolf', 2, 2, 2],
    ['Ash Phoenix', 2, 3, 2],
    ['Blaze Drake', 3, 3, 3],
    ['Magma Golem', 3, 4, 4],
    ['Flame Herald', 4, 5, 4],
    ['Inferno Wyrm', 5, 6, 6],
  ],
  tide: [
    ['Mist Eel', 1, 1, 2],
    ['Tide Sprite', 1, 2, 1],
    ['Foam Knight', 2, 2, 3],
    ['Coral Serpent', 2, 3, 2],
    ['Wave Rider', 3, 3, 4],
    ['Rain Caller', 3, 4, 3],
    ['Deep Kraken', 4, 5, 5],
    ['Ocean Leviathan', 5, 6, 7],
  ],
  leaf: [
    ['Thorn Sprout', 1, 1, 2],
    ['Spore Bat', 1, 2, 1],
    ['Vine Wolf', 2, 2, 3],
    ['Bloom Dryad', 2, 3, 2],
    ['Moss Bear', 3, 4, 3],
    ['Root Guardian', 3, 3, 5],
    ['Grove Stag', 4, 5, 4],
    ['Ancient Treant', 5, 6, 7],
  ],
  stone: [
    ['Pebble Golem', 1, 1, 3],
    ['Slate Bat', 1, 2, 1],
    ['Granite Hound', 2, 2, 3],
    ['Marble Knight', 2, 3, 3],
    ['Quartz Serpent', 3, 4, 3],
    ['Boulder Troll', 3, 3, 6],
    ['Obsidian Drake', 4, 5, 5],
    ['Mountain Colossus', 5, 6, 8],
  ],
};

const SPELLS = [
  ['flame', 'Ember Burst', 2, 'damage3', 'Deal 3 damage.'],
  ['flame', 'Ember Burst', 2, 'damage3', 'Deal 3 damage.'],
  ['tide', 'Tidal Surge', 2, 'draw2', 'Draw 2 cards.'],
  ['tide', 'Tidal Surge', 2, 'draw2', 'Draw 2 cards.'],
  ['leaf', 'Verdant Bloom', 2, 'heal5', 'Restore 5 life.'],
  ['leaf', 'Verdant Bloom', 2, 'heal5', 'Restore 5 life.'],
  ['stone', 'Quake', 3, 'quake2', 'Deal 2 damage to every enemy creature.'],
  ['stone', 'Quake', 3, 'quake2', 'Deal 2 damage to every enemy creature.'],
];

// buildDeck returns a fresh 40-card deck (new object identities each call).
export function buildDeck() {
  nextId = 1;
  const cards = [];
  for (const suit of ['flame', 'tide', 'leaf', 'stone']) {
    for (const [name, cost, attack, health] of CREATURES[suit]) {
      cards.push(creature(suit, name, cost, attack, health));
    }
  }
  for (const [suit, name, cost, effect, text] of SPELLS) {
    cards.push(spell(suit, name, cost, effect, text));
  }
  return cards;
}

export function deckSummary(deck) {
  const bySuit = { flame: 0, tide: 0, leaf: 0, stone: 0 };
  let creatures = 0;
  let spells = 0;
  for (const c of deck) {
    bySuit[c.suit]++;
    if (c.kind === 'creature') creatures++;
    else spells++;
  }
  return { total: deck.length, creatures, spells, bySuit };
}
