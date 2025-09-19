import {
  ProductionResourceMap,
  ResourceType,
  GameText,
  GameInput,
  IGameTextEntity,
  TextPartEntity,
  TrainCarTileName,
} from "./types";
import { TrainCarTileStackJSON } from "./jsonTypes";
import { toGameText, resourceMapToGameText } from "./gameText";
import { sumResources, GainAnyResource } from "./gameStatePlayHelpers";
import { GameState, GameStatePlayFn } from "./gameState";
import cloneDeep from "lodash/cloneDeep";
import shuffle from "lodash/shuffle";

export class TrainCarTile implements IGameTextEntity {
  readonly name: TrainCarTileName;
  readonly shortName: GameText;
  readonly resourcesToGain: ProductionResourceMap;
  readonly playInner: GameStatePlayFn | undefined;

  constructor({
    name,
    shortName,
    resourcesToGain,
    playInner,
  }: {
    name: TrainCarTileName;
    shortName: GameText;
    playInner?: GameStatePlayFn;
    resourcesToGain?: ProductionResourceMap;
  }) {
    this.name = name;
    this.shortName = shortName;
    this.resourcesToGain = resourcesToGain || {};
    this.playInner = playInner;
  }

  getGameTextPart(): TextPartEntity {
    return {
      type: "entity",
      entityType: "trainCarTile",
      trainCarTile: this.name,
    };
  }

  playTile(gameState: GameState, gameInput: GameInput): void {
    const player = gameState.getActivePlayer();
    if (this.resourcesToGain && sumResources(this.resourcesToGain)) {
      player.gainResources(gameState, this.resourcesToGain);
      gameState.addGameLogFromTrainCarTile(this.name, [
        player,
        " gained ",
        ...resourceMapToGameText(this.resourcesToGain),
        ".",
      ]);
    }
    this.playInner?.(gameState, gameInput);
  }

  static fromName(name: TrainCarTileName): TrainCarTile {
    if (!TRAIN_CAR_TILE_REGISTRY[name]) {
      throw new Error(`Invalid TrainCarTile name: ${name}`);
    }
    return TRAIN_CAR_TILE_REGISTRY[name];
  }
}

const TRAIN_CAR_TILE_REGISTRY: Record<TrainCarTileName, TrainCarTile> = {
  [TrainCarTileName.ONE_BERRY]: new TrainCarTile({
    name: TrainCarTileName.ONE_BERRY,
    shortName: toGameText(["BERRY"]),
    resourcesToGain: { [ResourceType.BERRY]: 1 },
  }),
  [TrainCarTileName.ONE_RESIN]: new TrainCarTile({
    name: TrainCarTileName.ONE_RESIN,
    shortName: toGameText(["RESIN"]),
    resourcesToGain: { [ResourceType.RESIN]: 1 },
  }),
  [TrainCarTileName.ONE_PEBBLE]: new TrainCarTile({
    name: TrainCarTileName.ONE_PEBBLE,
    shortName: toGameText(["PEBBLE"]),
    resourcesToGain: { [ResourceType.PEBBLE]: 1 },
  }),
  [TrainCarTileName.ONE_ANY]: new TrainCarTile({
    name: TrainCarTileName.ONE_ANY,
    shortName: toGameText(["ANY"]),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const gainAnyHelper = new GainAnyResource({
        trainCarTileContext: TrainCarTileName.ONE_ANY,
      });
      if (gainAnyHelper.matchesGameInput(gameInput)) {
        gainAnyHelper.play(gameState, gameInput);
      } else {
        // Ask the player what resources they want to gain
        gameState.pendingGameInputs.push(
          gainAnyHelper.getGameInput({
            prevInputType: gameInput.inputType,
          })
        );
      }
    },
  }),
  [TrainCarTileName.TWO_TWIG]: new TrainCarTile({
    name: TrainCarTileName.TWO_TWIG,
    shortName: toGameText(["TWIG", "TWIG"]),
    resourcesToGain: { [ResourceType.TWIG]: 2 },
  }),
  [TrainCarTileName.ONE_VP]: new TrainCarTile({
    name: TrainCarTileName.ONE_VP,
    shortName: toGameText(["VP"]),
    resourcesToGain: { [ResourceType.VP]: 1 },
  }),
};

export class TrainCarTileStack {
  private revealed: (TrainCarTileName | null)[];
  private rest: TrainCarTileName[];

  constructor({ revealed, rest }: TrainCarTileStackJSON) {
    this.revealed = revealed;
    this.rest = rest;
  }

  getRevealedTiles(): TrainCarTileName[] {
    this.revealed.forEach((x) => {
      if (!x) {
        throw new Error("Unexpected missing train car tile.");
      }
    });
    return [...this.revealed] as TrainCarTileName[];
  }

  peekAt(position: number): TrainCarTileName | null {
    return this.revealed[position];
  }

  pushTile(name: TrainCarTileName): void {
    this.rest.unshift(name);
  }

  replaceAt(position: number): TrainCarTileName {
    const [next, ...rest] = this.rest;
    this.rest = rest;
    const currTile = this.peekAt(position);
    if (currTile) {
      this.rest.push(currTile);
    }
    this.revealed[position] = next;
    return next;
  }

  toJSON(includePrivate: boolean): TrainCarTileStackJSON {
    return cloneDeep({
      revealed: this.revealed,
      rest: [],
      ...(includePrivate ? { rest: this.rest } : {}),
    });
  }

  static fromJSON(
    trainCarTileStackJSON: TrainCarTileStackJSON
  ): TrainCarTileStack {
    return new TrainCarTileStack(trainCarTileStackJSON);
  }
}

export function intialTrainCarTileStack(): TrainCarTileStack {
  const allTiles: TrainCarTileName[] = [];
  Object.values(TrainCarTileName).forEach((tileName) => {
    // Each tile as 3 copies
    allTiles.push(tileName, tileName, tileName);
  });
  const [one, two, three, ...rest] = shuffle(allTiles);
  return new TrainCarTileStack({
    revealed: [one, two, three],
    rest,
  });
}
