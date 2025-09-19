Everdell Custom (Cross-Turn Undo)

This repository is built on top of https://github.com/ymichael/everdell.

Feature: Cross-Turn Undo
- After a player ends their turn, the previous player can perform a one-time Undo while it is the next player’s turn.
- The Undo remains available until the next player submits any action. Once the next player submits, the Undo snapshot is invalidated.

How To Use
- When creating a game, enable "Allow undo".
- During play: after you end your turn, if it becomes your opponent’s turn, you (the previous active player) will see an "Undo last action" option on your screen.
- Click "Undo last action" before your opponent submits an action to revert the game back to your turn.

Notes
- The current active player never sees the previous player’s Undo option.
- If the next player acts first, the Undo option disappears for the previous player.

Development Quick Start
- Install deps: `npm ci`
- Run dev server: set `DB_PATH=./db/game.sqlite` and run `npx next dev`, then open http://localhost:3000
