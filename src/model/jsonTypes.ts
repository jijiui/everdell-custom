import {
  AdornmentName,
  CardName,
  EventName,
  EventNameToPlayerId,
  GameInput,
  GameInputMultiStep,
  GameLogEntry,
  GameOptions,
  LocationNameToPlayerIds,
  PlayedCardInfo,
  PlayedEventInfo,
  PlayerStatus,
  ResourceType,
  RiverDestinationMapSpots,
  Season,
  WorkerPlacementInfo,
  TrainCarTileName,
  TrainTicketStatus,
  VisitorName,
} from "./types";

export type GameJSON = {
  gameId: string;
  gameSecret: string;
  gameState: GameStateJSON;
};

export type GameStateJSON = {
  gameStateId: number;
  gameOptions: GameOptions;
  activePlayerId: string;
  // PlayerId of the player who owns the current undo snapshot (if any).
  // When set, only this player may trigger UNDO, even if it's not their turn yet.
  undoOwnerPlayerId?: string | null;
  players: PlayerJSON[];
  meadowCards: CardName[];
  discardPile: CardStackJSON<CardName>;
  deck: CardStackJSON<CardName>;
  locationsMap: LocationNameToPlayerIds;
  eventsMap: EventNameToPlayerId;
  pendingGameInputs: GameInputMultiStep[];
  playedGameInputs: GameInput[];
  gameLog: GameLogEntry[];
  riverDestinationMap: RiverDestinationMapJSON | null;
  adornmentsPile: CardStackJSON<AdornmentName> | null;
  stationCards: (CardName | null)[] | null;
  trainCarTileStack: TrainCarTileStackJSON | null;
  visitorStack: VisitorStackJSON | null;
  gameStateJSONForUndo: GameStateJSON | null;
};

export type CardStackJSON<T> = {
  name: string;
  numCards: number;
  cards: T[];
};

export type PlayerJSON = {
  name: string;
  playerSecret?: string;
  playerId: string;
  playedCards: Partial<Record<CardName, PlayedCardInfo[]>>;
  numCardsInHand: number;
  cardsInHand: CardName[] | null;
  resources: Record<ResourceType, number>;
  currentSeason: Season;
  numWorkers: number;
  claimedEvents: Partial<Record<EventName, PlayedEventInfo>>;
  placedWorkers: WorkerPlacementInfo[];
  playerStatus: PlayerStatus;
  numAdornmentsInHand: number;
  adornmentsInHand: AdornmentName[];
  playedAdornments: AdornmentName[];
  numAmbassadors: number;
  trainTicketStatus: TrainTicketStatus | null;
  reservedCard: CardName | "UNUSED" | "USED";
  numGoldenLeaf: number;
  claimedVisitors: VisitorName[];
};

export type RiverDestinationMapJSON = {
  spots: RiverDestinationMapSpots;
};

export type TrainCarTileStackJSON = {
  revealed: (TrainCarTileName | null)[];
  rest: TrainCarTileName[];
};

export type VisitorStackJSON = {
  revealed: (VisitorName | null)[];
  rest: VisitorName[];
};
