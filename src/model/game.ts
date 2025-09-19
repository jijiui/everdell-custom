import { generate as uuid } from "short-uuid";
import { Player, createPlayer } from "./player";
import { GameState } from "./gameState";
import { GameOptions, GameInput } from "./types";
import { GameJSON, HistoryItemJSON, HistoryStepJSON } from "./jsonTypes";
import { getGameJSONById, saveGameJSONById } from "./db";
import cloneDeep from "lodash/cloneDeep";

export class Game {
  public gameId: string;
  private gameSecret: string;
  private gameState: GameState;
  private gameOptionsDeprecated: Partial<GameOptions>;
  private historySnapshots: HistoryItemJSON[];

  constructor({
    gameId,
    gameSecret,
    gameState,
    gameOptions = null,
    history = [],
  }: {
    gameId: string;
    gameSecret: string;
    gameState: GameState;
    gameOptions?: Partial<GameOptions> | null;
    history?: HistoryItemJSON[];
  }) {
    this.gameId = gameId;
    this.gameSecret = gameSecret;
    this.gameState = gameState;
    this.gameOptionsDeprecated = gameOptions || {};
    this.historySnapshots = history || [];
  }

  get gameSecretUNSAFE(): string {
    return this.gameSecret;
  }

  isGameOver(): boolean {
    return this.gameState.isGameOver();
  }

  getPlayer(playerId: string): Player {
    return this.gameState.getPlayer(playerId);
  }

  getActivePlayer(): Player {
    return this.gameState.getActivePlayer();
  }

  getGameInputs(): GameInput[] {
    return this.gameState.getPossibleGameInputs();
  }

  getGameStateId(): number {
    return this.gameState.gameStateId;
  }

  getUndoOwnerPlayerId(): string | null {
    return this.gameState.getUndoOwnerPlayerId();
  }

  canPlayerUndo(playerId: string): boolean {
    return (
      this.gameState.hasUndoSnapshot() &&
      this.gameState.getUndoOwnerPlayerId() === playerId
    );
  }

  applyGameInput(gameInput: GameInput): void {
    const nextState = this.gameState.next(gameInput);
    // Record snapshot after applying input (post-state), map to latest log index.
    const logIdx = nextState.getGameLog().length - 1;
    const snapshot: HistoryItemJSON = {
      state: nextState.toJSON({ includePrivate: true, isRoot: false }),
      logIdx,
    };
    this.historySnapshots.push(snapshot);
    // Keep last 200 steps to bound payload size.
    if (this.historySnapshots.length > 200) {
      this.historySnapshots.splice(0, this.historySnapshots.length - 200);
    }
    this.gameState = GameState.fromJSON(snapshot.state);
  }

  async save(): Promise<void> {
    await saveGameJSONById(this.gameId, this.toJSON(true /* includePrivate */));
  }

  toJSON(includePrivate: boolean): GameJSON {
    return cloneDeep({
      gameId: this.gameId,
      gameSecret: "",
      gameState: this.gameState.toJSON({ includePrivate, isRoot: true }),
      historyMeta: this.historySnapshots.map((h) => ({
        gameStateId: h.state.gameStateId,
        logIdx: h.logIdx,
      } as HistoryStepJSON)),
      // Deprecated, remove after 3/1/21
      gameOptions: this.gameOptionsDeprecated,
      ...(includePrivate
        ? {
            gameSecret: this.gameSecret,
            history: this.historySnapshots,
          }
        : {}),
    });
  }

  getPlayerBySecret(playerSecret: string): Player | undefined {
    return this.gameState.players.find(
      (p) => p.playerSecretUNSAFE === playerSecret
    );
  }

  static fromJSON(gameJSON: GameJSON): Game {
    return new Game({
      ...gameJSON,
      gameState: GameState.fromJSON(gameJSON.gameState),
      history: (gameJSON as any).history || [],
    });
  }

  // Rewind to a given gameStateId if snapshot exists; trim history beyond it.
  rewindTo(gameStateId: number): boolean {
    const idx = this.historySnapshots.findIndex(
      (h) => h.state.gameStateId === gameStateId
    );
    if (idx === -1) return false;
    const target = this.historySnapshots[idx];
    this.gameState = GameState.fromJSON(target.state);
    this.historySnapshots = this.historySnapshots.slice(0, idx + 1);
    return true;
  }
}

function generateNewGameId(): string {
  return `v3:${uuid()}`;
}

export const createGameFromGameState = async (
  gameState: GameState
): Promise<Game> => {
  const game = new Game({
    gameId: generateNewGameId(),
    gameSecret: uuid(),
    gameState,
  });
  await game.save();
  return game;
};

export const createGame = async (
  playerNames: string[],
  gameOptions: Partial<GameOptions> = {
    realtimePoints: false,
  }
): Promise<Game> => {
  if (playerNames.length < 2 || playerNames.length > 4) {
    throw new Error(
      `Unable to create a game with ${playerNames.length} players`
    );
  }
  const players = playerNames.map((name) => createPlayer(name));
  const gameState = GameState.initialGameState({ players, gameOptions });
  const game = await createGameFromGameState(gameState);
  console.log(`Game created: ${game.gameId}`);
  return game;
};

export const getGameById = async (gameId: string): Promise<Game | null> => {
  const gameJSON = await getGameJSONById(gameId);
  return gameJSON ? Game.fromJSON(gameJSON) : null;
};
