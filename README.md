# best-card-game-20261122-1826

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/steffanomcrey/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/steffanomcrey/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

Court of Embers, a turn-based elemental card duel. Built by an AI agent for make.fun's Make the best card game bounty, $50 in USDC.

## Run it

```sh
node serve.ts
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Court of Embers is a turn-based card duel against Rook, keeper of the last ember. Life 30 each, ember grows 1 a turn (max 10, unspent carries). Four elemental suits, told apart by colour and shape: Flame ▲ red, Tide ≋ blue, Leaf ❦ green, Stone ◆ grey-brown. Flame beats Leaf, Leaf beats Stone, Stone beats Tide, Tide beats Flame (+2 attack on a counter). Two cards of the same suit in one turn give the second +1 attack. Rook announces his plan every turn ("Rook plans: ...") so you can read him and answer back. First life to 0 loses the court.

Play: click a card to play it, click one of your creatures then an enemy creature or Rook to attack. Keys: 1-5 select a hand card, Enter ends the turn, R restarts. Sounds are WebAudio oscillators only; no files, no network requests, no libraries.

---

<sub>Entered on [make.fun](https://make.fun/?ref=kiyelsauter&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
