import { GetServerSideProps } from "next";

import { GameJSON, PlayerJSON } from "../../model/jsonTypes";
import {
  GameInputType,
  GameInput,
  ResourceType,
  CardName,
  EventName,
  LocationName,
} from "../../model/types";
import { Game as GameModel } from "../../model/game";
import Game from "../../components/Game";

import { testInitialGameState } from "../../model/testHelpers";

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Create Test Game Here
  const playerNames = ["Michael", "Elynn", "Chris", "Vanessa"];
  const numPlayers = playerNames.length;
  const gameState = testInitialGameState({
    numPlayers,
    playerNames,
    meadowCards: [
      CardName.TEA_HOUSE,
      CardName.GENERAL_STORE,
      CardName.GENERAL_STORE,
    ],
    specialEvents: [
      EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
      EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
      EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
      EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
    ],
    shuffleDeck: true,
    gameOptions: {
      pearlbrook: true,
      newleaf: {
        cards: true,
        forestLocations: true,
        reserving: true,
        station: true,
        specialEvents: true,
        ticket: true,
        visitors: true,
        knoll: true,
      },
    },
  });

  gameState.locationsMap[LocationName.FOREST_TWO_WILD] = [];
  gameState.locationsMap[LocationName.FOREST_ONE_PEBBLE_THREE_CARD] = [];
  gameState.locationsMap[
    LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD
  ] = [];

  gameState.players.forEach((player, idx) => {
    for (let i = 0; i < idx; i++) {
      player.nextSeason();
    }

    player.drawCards(gameState, idx);
    player.addCardToHand(gameState, CardName.RANGER);
    player.addCardToHand(gameState, CardName.BARD);

    player.gainResources(gameState, {
      [ResourceType.VP]: 12,
      [ResourceType.TWIG]: 4,
      [ResourceType.BERRY]: 7,
      [ResourceType.PEBBLE]: 3,
      [ResourceType.RESIN]: 6,
    });

    // City
    player.addToCity(gameState, CardName.UNIVERSITY);
    player.addToCity(gameState, CardName.DUNGEON);
    player.addToCity(gameState, CardName.AIR_BALLOON);
    player.addToCity(gameState, CardName.INNKEEPER);
    player.addToCity(gameState, CardName.INVENTOR);
    player.addToCity(gameState, CardName.GREENHOUSE);
    player.addToCity(gameState, CardName.MINE).usedForCritter = true;
    player.reserveCard(CardName.CLOCK_TOWER);
  });

  gameState.replenishMeadow();
  gameState.replenishStation();

  const game = new GameModel({
    gameId: "testGameId",
    gameSecret: "testGameSecret",
    gameState,
    gameOptions: {
      realtimePoints: true,
    },
  });

  game.applyGameInput({
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location: LocationName.FOREST_ONE_PEBBLE_THREE_CARD,
    },
  });
  game.applyGameInput({
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
    },
  });
  game.applyGameInput({
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
    },
  });
  game.applyGameInput({
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location: LocationName.FOREST_ONE_PEBBLE_THREE_CARD,
    },
  });

  const player = game.getActivePlayer();
  const isActivePlayer = true;
  return {
    props: {
      gameJSON: game.toJSON(false /* includePrivate */),
      viewingPlayerJSON: player.toJSON(true /* includePrivate */),
      gameInputs: isActivePlayer ? game.getGameInputs() : [],
    },
  };
};

export default function TestGamePage(props: {
  gameJSON: GameJSON;
  gameInputs: GameInput[];
  viewingPlayerJSON: PlayerJSON;
}) {
  const { gameJSON, gameInputs, viewingPlayerJSON } = props;
  return (
    <Game
      gameJSON={gameJSON}
      gameInputs={gameInputs}
      viewingPlayerJSON={viewingPlayerJSON}
    />
  );
}
