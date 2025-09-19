import findIndex from "lodash/findIndex";
import isEqual from "lodash/isEqual";

import {
  AdornmentName,
  CardType,
  EventName,
  CardName,
  EventType,
  GameText,
  GameInput,
  LocationType,
  GameInputType,
  TextPartEntity,
  IGameTextEntity,
  ResourceType,
} from "./types";
import {
  GameState,
  GameStatePointsFn,
  GameStatePlayFn,
  GameStatePlayable,
} from "./gameState";
import {
  GainAnyResource,
  GainMoreThan1AnyResource,
} from "./gameStatePlayHelpers";
import { Event } from "./event";
import { CardStack } from "./cardStack";
import { Location } from "./location";
import { Card } from "./card";
import { Player } from "./player";
import { onlyRelevantProductionCards } from "./cardHelpers";
import {
  toGameText,
  cardListToGameText,
  resourceMapToGameText,
} from "./gameText";

// Pearlbrook Adornment
export class Adornment implements GameStatePlayable, IGameTextEntity {
  readonly name: AdornmentName;
  readonly description: GameText;
  readonly baseVP: number;
  readonly playInner: GameStatePlayFn;
  readonly pointsInner: GameStatePointsFn | undefined;

  constructor({
    name,
    description,
    baseVP = 0,
    pointsInner,
    playInner,
  }: {
    name: AdornmentName;
    description: GameText;
    baseVP?: number;
    pointsInner?: GameStatePointsFn;
    playInner: GameStatePlayFn;
  }) {
    this.name = name;
    this.description = description;
    this.baseVP = baseVP;
    this.pointsInner = pointsInner;
    this.playInner = playInner;
  }

  getGameTextPart(): TextPartEntity {
    return {
      type: "entity",
      entityType: "adornment",
      adornment: this.name,
    };
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    return !this.canPlayCheck(gameState, gameInput);
  }

  canPlayCheck(gameState: GameState, gameInput: GameInput): string | null {
    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
      const adornment = gameInput.clientOptions.adornment;
      if (!adornment) {
        return "Please select an Adornment to play";
      }
      const adornmentsInHand = player.getAdornmentsInHand();
      let idx = adornmentsInHand.indexOf(adornment);
      if (idx === -1) {
        return "May only play adornments that are in your hand";
      }
      const playedAdornments = player.getPlayedAdornments();
      idx = playedAdornments.indexOf(adornment);
      if (idx !== -1) {
        return "Cannot play an adornment that's already been played";
      }
      const numPearls = player.getNumResourcesByType(ResourceType.PEARL);
      if (numPearls < 1) {
        return "Must be able to pay 1 PEARL to play an adornment";
      }
      return null;
    }
    return null;
  }

  play(gameState: GameState, gameInput: GameInput): void {
    const canPlayError = this.canPlayCheck(gameState, gameInput);

    if (canPlayError) {
      throw new Error(canPlayError);
    }

    this.triggerAdornment(gameState, gameInput);
  }

  triggerAdornment(
    gameState: GameState,
    gameInput: GameInput = {
      inputType: GameInputType.PLAY_ADORNMENT,
      clientOptions: {
        adornment: this.name,
      },
    }
  ): void {
    if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
      this.playInner(gameState, gameInput);
    } else if (
      gameInput.inputType === GameInputType.SELECT_CARDS ||
      gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS ||
      gameInput.inputType === GameInputType.SELECT_RESOURCES
    ) {
      if (gameInput.adornmentContext === this.name) {
        this.playInner(gameState, gameInput);
      } else {
        throw new Error("Unexpected adornmentContext");
      }
    } else if (
      gameInput.inputType === GameInputType.SELECT_PLAYED_ADORNMENT &&
      gameInput.prevInputType === GameInputType.PLAY_ADORNMENT &&
      gameInput.adornmentContext === AdornmentName.MIRROR
    ) {
      this.playInner(gameState, gameInput);
    } else {
      this.playInner(gameState, gameInput);
    }
  }

  getPoints(player: Player, gameState: GameState): number {
    return (
      this.baseVP +
      (this.pointsInner?.(player.getPlayerForPoints(), gameState) ?? 0)
    );
  }

  static fromName(name: AdornmentName): Adornment {
    return ADORNMENT_REGISTRY[name];
  }
}

const ADORNMENT_REGISTRY: Record<AdornmentName, Adornment> = {
  [AdornmentName.BELL]: new Adornment({
    name: AdornmentName.BELL,
    description: toGameText([
      "Gain 3 BERRY. Also draw 1 CARD for every ",
      { type: "em", text: "Critter" },
      " in your city.",
      { type: "HR" },
      { type: "points", value: 1 },
      " for every 2 ",
      { type: "em", text: "Critters" },
      " in your city.",
    ]),
    pointsInner: (player) => {
      const numPlayedCritters = player.getNumPlayedCritters();
      return Math.floor(numPlayedCritters / 2);
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const numPlayedCritters = player.getNumPlayedCritters();
      gameState.addGameLogFromAdornment(AdornmentName.BELL, [
        player,
        " gained ",
        ...resourceMapToGameText({
          [ResourceType.BERRY]: 3,
          CARD: numPlayedCritters,
        }),
        ".",
      ]);
      player.gainResources(gameState, { [ResourceType.BERRY]: 3 });
      player.drawCards(gameState, numPlayedCritters);
    },
  }),
  [AdornmentName.COMPASS]: new Adornment({
    name: AdornmentName.COMPASS,
    description: toGameText([
      "You may reactivate 2 TRAVELER in your city.",
      { type: "HR" },
      { type: "points", value: 1 },
      " for each TRAVELER in your city.",
    ]),
    pointsInner: (player) => {
      return player.getNumCardType(CardType.TRAVELER);
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
        const cardOptions = player
          .getAllPlayedCardsByType(CardType.TRAVELER)
          .filter(({ cardName }) => {
            return Card.fromName(cardName).canReactivateCard(gameState);
          });
        if (cardOptions.length === 0) {
          return;
        }
        // Ask player to select up to 3
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: gameInput.inputType,
          label: "Select up to 2 TRAVELER to reactivate",
          cardOptions,
          adornmentContext: AdornmentName.COMPASS,
          maxToSelect: 2,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS &&
        gameInput.prevInputType === GameInputType.PLAY_ADORNMENT &&
        gameInput.adornmentContext === AdornmentName.COMPASS
      ) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (selectedCards.length === 0) {
          gameState.addGameLogFromAdornment(AdornmentName.COMPASS, [
            player,
            " declined to reactivate any TRAVELER.",
          ]);
          return;
        }
        if (selectedCards.length > gameInput.maxToSelect) {
          throw new Error(`Please select up to ${gameInput.maxToSelect} cards`);
        }
        selectedCards.forEach((selectedCard) => {
          if (
            findIndex(gameInput.cardOptions, (x) =>
              isEqual(selectedCard, x)
            ) === -1
          ) {
            throw new Error("Couldn't find selected card");
          }
        });
        gameState.addGameLogFromAdornment(AdornmentName.COMPASS, [
          player,
          " reactivated ",
          ...cardListToGameText(selectedCards.map(({ cardName }) => cardName)),
          ".",
        ]);
        selectedCards.forEach((playedCard) => {
          const targetCard = Card.fromName(playedCard.cardName);
          targetCard.reactivateCard(gameState, gameInput, player, playedCard);
        });
      }
    },
  }),
  [AdornmentName.GILDED_BOOK]: new Adornment({
    name: AdornmentName.GILDED_BOOK,
    description: toGameText([
      "Gain resources equal to the cost of any GOVERNANCE in your city.",
      { type: "HR" },
      { type: "points", value: 1 },
      " for each GOVERNANCE in your city.",
    ]),
    pointsInner: (player) => {
      return player.getNumCardType(CardType.GOVERNANCE);
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
        // Get all the governance cards in player's city
        const playedGovCards = player
          .getAllPlayedCardsByType(CardType.GOVERNANCE)
          .map((x) => x.cardName);
        if (playedGovCards.length !== 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.PLAY_ADORNMENT,
            label: ["Select a GOVERNANCE to gain resources equal to its cost."],
            adornmentContext: AdornmentName.GILDED_BOOK,
            cardOptions: playedGovCards,
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [],
            },
          });
        } else {
          gameState.addGameLogFromAdornment(AdornmentName.GILDED_BOOK, [
            player,
            " has no GOVERNANCE cards in city.",
          ]);
        }
      } else if (gameInput.inputType === GameInputType.SELECT_CARDS) {
        const selectedCard = gameInput.clientOptions.selectedCards;
        if (selectedCard.length !== 1) {
          throw new Error(`Must select exactly 1 card`);
        }
        const card = Card.fromName(selectedCard[0]);
        if (card.cardType !== CardType.GOVERNANCE) {
          throw new Error(`Must select GOVERNANCE card`);
        }
        gameState.addGameLogFromAdornment(AdornmentName.GILDED_BOOK, [
          player,
          " gained ",
          ...resourceMapToGameText(card.baseCost),
          ".",
        ]);
        player.gainResources(gameState, card.baseCost);
      } else {
        throw new Error(`Unexpected GameInputType ${gameInput.inputType}`);
      }
    },
  }),
  [AdornmentName.HOURGLASS]: new Adornment({
    name: AdornmentName.HOURGLASS,
    description: toGameText([
      "You may take the action of any 1 Forest location, and gain 1 ANY.",
      { type: "HR" },
      { type: "points", value: 1 },
      " for each DESTINATION in your city.",
    ]),
    pointsInner: (player) => {
      return player.getNumCardType(CardType.DESTINATION);
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const gainAnyHelper = new GainAnyResource({
        adornmentContext: AdornmentName.HOURGLASS,
      });
      if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
        // Ask player which forest location they want to copy
        const possibleForestLocations = gameState
          .getPlayableLocations({ checkCanPlaceWorker: false })
          .map((locationName) => {
            return Location.fromName(locationName);
          })
          .filter((location) => {
            return location.type === LocationType.FOREST;
          });
        if (possibleForestLocations.length === 0) {
          throw new Error("No eligible forest location available to copy.");
        }

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_LOCATION,
          prevInputType: gameInput.inputType,
          label: "Select forest location to copy",
          adornmentContext: AdornmentName.HOURGLASS,
          locationOptions: possibleForestLocations.map((x) => x.name),
          clientOptions: {
            selectedLocation: null,
          },
        });
        gameState.pendingGameInputs.push(
          gainAnyHelper.getGameInput({
            prevInputType: gameInput.inputType,
          })
        );
      } else if (
        gameInput.inputType === GameInputType.SELECT_LOCATION &&
        gameInput.adornmentContext === AdornmentName.HOURGLASS
      ) {
        const selectedLocation = gameInput.clientOptions.selectedLocation;
        if (
          !selectedLocation ||
          gameInput.locationOptions.indexOf(selectedLocation) === -1
        ) {
          throw new Error("Invalid location selected");
        }
        const location = Location.fromName(selectedLocation);
        if (location.type !== LocationType.FOREST) {
          throw new Error(
            `Cannot copy ${selectedLocation}. Only forest locations are allowed.`
          );
        }
        if (!location.canPlay(gameState, gameInput)) {
          throw new Error("Location can't be played");
        }
        gameState.addGameLogFromAdornment(AdornmentName.HOURGLASS, [
          player,
          " copied ",
          location,
          ".",
        ]);
        location.triggerLocation(gameState);
      } else if (gainAnyHelper.matchesGameInput(gameInput)) {
        gainAnyHelper.play(gameState, gameInput);
      }
    },
  }),
  [AdornmentName.KEY_TO_THE_CITY]: new Adornment({
    name: AdornmentName.KEY_TO_THE_CITY,
    description: toGameText([
      "Gain 2 ANY. Also draw 1 CARD for every ",
      { type: "em", text: "Construction" },
      " in your city.",
      { type: "HR" },
      { type: "points", value: 1 },
      " for every 2 Constructions in your city.",
    ]),
    pointsInner: (player) => {
      const numPlayedCritters = player.getNumPlayedConstructions();
      return Math.floor(numPlayedCritters / 2);
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const helper = new GainMoreThan1AnyResource({
        adornmentContext: AdornmentName.KEY_TO_THE_CITY,
        skipGameLog: true,
      });
      if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
        gameState.pendingGameInputs.push(
          helper.getGameInput(2, {
            prevInputType: gameInput.inputType,
          })
        );
      } else if (helper.matchesGameInput(gameInput)) {
        const numConstructions = player.getNumPlayedConstructions();
        gameState.addGameLogFromAdornment(AdornmentName.KEY_TO_THE_CITY, [
          player,
          " gained ",
          ...resourceMapToGameText({
            ...gameInput.clientOptions.resources,
            CARD: numConstructions,
          }),
          ".",
        ]);
        helper.play(gameState, gameInput);
        player.drawCards(gameState, numConstructions);
      } else {
        throw new Error(`Unexpected GameInputType ${gameInput.inputType}`);
      }
    },
  }),
  [AdornmentName.MASQUE]: new Adornment({
    name: AdornmentName.MASQUE,
    description: toGameText([
      "You may play 1 CARD worth up to 3 VP for free.",
      { type: "HR" },
      { type: "points", value: 1 },
      " for every 3 VP tokens you have.",
    ]),
    pointsInner: (player) => {
      let numVP = player.getNumResourcesByType(ResourceType.VP);
      player.forEachPlayedCard(({ cardName, resources = {} }) => {
        if (ResourceType.VP in resources) {
          numVP +=
            parseInt((resources[ResourceType.VP] as unknown) as string) || 0;
        }
      });
      return Math.floor(numVP / 3);
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
        // Find all playable cards worth up to 3 baseVP
        const playableCards: CardName[] = [];
        [...player.getCardsInHand(), ...gameState.meadowCards].forEach(
          (cardName) => {
            const card = Card.fromName(cardName as CardName);
            if (
              card.baseVP <= 3 &&
              card.canPlayIgnoreCostAndSource(gameState)
            ) {
              playableCards.push(card.name);
            }
          }
        );
        if (playableCards.length !== 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: gameInput.inputType,
            label: "Select CARD to play for free",
            cardOptions: playableCards,
            maxToSelect: 1,
            minToSelect: 1,
            adornmentContext: AdornmentName.MASQUE,
            clientOptions: {
              selectedCards: [],
            },
          });
        }
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.adornmentContext === AdornmentName.MASQUE
      ) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (!selectedCards) {
          throw new Error("No card selected");
        }
        if (selectedCards.length !== 1) {
          throw new Error("Please select one card");
        }
        const card = Card.fromName(selectedCards[0]);
        if (card.baseVP > 3) {
          throw new Error("Cannot play a card worth more than 3 base VP");
        }
        const cardExistInHand =
          player.getCardsInHand().indexOf(card.name) !== -1;
        const cardExistInMeadow =
          gameState.meadowCards.indexOf(card.name) !== -1;

        if (cardExistInHand && cardExistInMeadow) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: gameInput.inputType,
            prevInput: gameInput,
            adornmentContext: AdornmentName.MASQUE,
            label: ["Select where to play ", card.getGameTextPart(), " from"],
            options: ["Meadow", "Hand"],
            clientOptions: {
              selectedOption: null,
            },
          });
        } else if (cardExistInMeadow || cardExistInHand) {
          if (cardExistInMeadow) {
            gameState.removeCardFromMeadow(card.name);
            gameState.addGameLogFromAdornment(AdornmentName.MASQUE, [
              player,
              " played ",
              card,
              " from the Meadow.",
            ]);
          } else {
            player.removeCardFromHand(
              gameState,
              card.name,
              false /* addToDiscardPile */
            );
            gameState.addGameLogFromAdornment(AdornmentName.MASQUE, [
              player,
              " played ",
              card,
              " from their hand.",
            ]);
          }
          card.addToCityAndPlay(gameState, gameInput);
        } else {
          throw new Error(
            "Cannot find the selected card in the Meadow or your hand."
          );
        }
      } else if (
        gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC &&
        gameInput.adornmentContext === AdornmentName.MASQUE &&
        gameInput.prevInput &&
        gameInput.prevInput.inputType === GameInputType.SELECT_CARDS
      ) {
        const selectedCards = gameInput.prevInput.clientOptions.selectedCards;
        if (!selectedCards) {
          throw new Error("No card selected");
        }
        if (selectedCards.length !== 1) {
          throw new Error("Incorrect number of cards selected");
        }
        const card = Card.fromName(selectedCards[0]);
        if (card.baseVP > 3) {
          throw new Error("Cannot play a card worth more than 3 base VP");
        }
        if (gameInput.clientOptions.selectedOption === "Meadow") {
          gameState.removeCardFromMeadow(card.name);
          gameState.addGameLogFromAdornment(AdornmentName.MASQUE, [
            player,
            " played ",
            card,
            " from the Meadow.",
          ]);
        } else if (gameInput.clientOptions.selectedOption === "Hand") {
          player.removeCardFromHand(
            gameState,
            card.name,
            false /* addToDiscardPile */
          );
          gameState.addGameLogFromAdornment(AdornmentName.MASQUE, [
            player,
            " played ",
            card,
            " from their hand.",
          ]);
        } else {
          throw new Error("Please choose one of the options");
        }
        card.addToCityAndPlay(gameState, gameInput);
      }
    },
  }),
  [AdornmentName.MIRROR]: new Adornment({
    name: AdornmentName.MIRROR,
    description: toGameText([
      "You may copy any ability from an ",
      { type: "em", text: "Adornment" },
      " played by an opponent.",
      { type: "HR" },
      { type: "points", value: 1 },
      " for each unique colored CARD in your city.",
    ]),
    pointsInner: (player) => {
      const numProduction = player.getNumCardType(CardType.PRODUCTION);
      const numGovernance = player.getNumCardType(CardType.GOVERNANCE);
      const numDestination = player.getNumCardType(CardType.DESTINATION);
      const numTraveler = player.getNumCardType(CardType.TRAVELER);
      const numProsperity = player.getNumCardType(CardType.PROSPERITY);
      return (
        (numProduction > 0 ? 1 : 0) +
        (numGovernance > 0 ? 1 : 0) +
        (numDestination > 0 ? 1 : 0) +
        (numTraveler > 0 ? 1 : 0) +
        (numProsperity > 0 ? 1 : 0)
      );
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
        const players = gameState.players.filter(
          (p) => p.playerId !== player.playerId
        );
        const adornmentOptions: AdornmentName[] = [];
        players.forEach((player) => {
          const playedAdornments = player.getPlayedAdornments();
          adornmentOptions.push(...playedAdornments);
        });

        if (adornmentOptions.length > 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_PLAYED_ADORNMENT,
            label: [
              "Copy the ability of an ",
              { type: "em", text: "Adornment" },
            ],
            prevInputType: GameInputType.PLAY_ADORNMENT,
            adornmentContext: AdornmentName.MIRROR,
            adornmentOptions: adornmentOptions,
            clientOptions: {
              adornment: null,
            },
          });
        } else {
          gameState.addGameLogFromAdornment(AdornmentName.MIRROR, [
            "No played ",
            { type: "em", text: "Adornments" },
            " to copy.",
          ]);
        }
      } else if (
        gameInput.inputType === GameInputType.SELECT_PLAYED_ADORNMENT &&
        gameInput.adornmentContext === AdornmentName.MIRROR
      ) {
        const selectedAdornment = gameInput.clientOptions.adornment;
        if (selectedAdornment) {
          if (gameInput.adornmentOptions.indexOf(selectedAdornment) === -1) {
            throw new Error("Please select one of the Adornments");
          }
          const adornment = Adornment.fromName(selectedAdornment);
          gameState.addGameLogFromAdornment(AdornmentName.MIRROR, [
            player,
            " copied ",
            adornment,
            ".",
          ]);
          adornment.triggerAdornment(gameState);
        } else {
          gameState.addGameLogFromAdornment(AdornmentName.MIRROR, [
            player,
            " decline to copy any played ",
            { type: "em", text: "Adornments" },
            ".",
          ]);
        }
      }
    },
  }),
  [AdornmentName.SCALES]: new Adornment({
    name: AdornmentName.SCALES,
    description: toGameText([
      "You may discard up to 4 CARD to gain 1 ANY for each",
      { type: "HR" },
      { type: "points", value: 1 },
      " for every CARD in your hand, up to 5.",
    ]),
    pointsInner: (player) => {
      const numCards = player.numCardsInHand;
      return numCards > 5 ? 5 : numCards;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const helper = new GainMoreThan1AnyResource({
        adornmentContext: AdornmentName.SCALES,
      });
      if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
        // ask player to discard cards
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.PLAY_ADORNMENT,
          label: ["Select up to 4 CARD to discard to gain 1 ANY for each."],
          adornmentContext: AdornmentName.SCALES,
          cardOptions: player.getCardsInHand(),
          maxToSelect: 4,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_CARDS) {
        const cardsToDiscard = gameInput.clientOptions.selectedCards;

        if (cardsToDiscard.length > 0) {
          cardsToDiscard.forEach((cardName) => {
            player.removeCardFromHand(gameState, cardName);
          });

          gameState.addGameLogFromAdornment(AdornmentName.SCALES, [
            player,
            ` discarded ${cardsToDiscard.length} CARD.`,
          ]);

          // gain resources based on number of cards discarded
          gameState.pendingGameInputs.push(
            helper.getGameInput(cardsToDiscard.length, {
              prevInputType: gameInput.inputType,
            })
          );
        } else {
          gameState.addGameLogFromAdornment(AdornmentName.SCALES, [
            player,
            ` did not discard any CARD.`,
          ]);
        }
      } else if (helper.matchesGameInput(gameInput)) {
        helper.play(gameState, gameInput);
      } else {
        throw new Error(`Unexpected GameInputType ${gameInput.inputType}`);
      }
    },
  }),
  [AdornmentName.SEAGLASS_AMULET]: new Adornment({
    name: AdornmentName.SEAGLASS_AMULET,
    description: toGameText(["Gain 3 ANY. Draw 2 CARD. Gain 1 VP."]),
    baseVP: 3,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const helper = new GainMoreThan1AnyResource({
        adornmentContext: AdornmentName.SEAGLASS_AMULET,
        skipGameLog: true,
      });
      if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
        gameState.pendingGameInputs.push(
          helper.getGameInput(3, {
            prevInputType: gameInput.inputType,
          })
        );
      } else if (helper.matchesGameInput(gameInput)) {
        gameState.addGameLogFromAdornment(AdornmentName.SEAGLASS_AMULET, [
          player,
          ` gained `,
          ...resourceMapToGameText({
            ...gameInput.clientOptions.resources,
            CARD: 2,
            [ResourceType.VP]: 1,
          }),
          `.`,
        ]);
        helper.play(gameState, gameInput);
        player.drawCards(gameState, 2);
        player.gainResources(gameState, { [ResourceType.VP]: 1 });
      }
    },
  }),
  [AdornmentName.SPYGLASS]: new Adornment({
    name: AdornmentName.SPYGLASS,
    description: toGameText([
      "Gain 1 ANY. Draw 1 CARD. Gain 1 PEARL.",
      { type: "HR" },
      { type: "points", value: 3 },
      " for each ",
      { type: "em", text: "Wonder" },
      " you built.",
    ]),
    pointsInner: (player) => {
      const claimedEvents = player.claimedEvents;

      let numWonders = 0;
      Object.keys(claimedEvents).forEach((eventName) => {
        const event = Event.fromName(eventName as EventName);
        if (event.type === EventType.WONDER) {
          numWonders += 1;
        }
      });
      return numWonders * 3;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const helper = new GainAnyResource({
        adornmentContext: AdornmentName.SPYGLASS,
        skipGameLog: true,
      });
      if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
        gameState.pendingGameInputs.push(
          helper.getGameInput({
            prevInputType: gameInput.inputType,
          })
        );
      } else if (helper.matchesGameInput(gameInput)) {
        helper.play(gameState, gameInput);
        player.drawCards(gameState, 1);
        player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
        gameState.addGameLogFromAdornment(AdornmentName.SPYGLASS, [
          player,
          ` gained 1 ${gameInput.clientOptions.selectedOption}, 1 CARD and 1 PEARL.`,
        ]);
      }
    },
  }),
  [AdornmentName.SUNDIAL]: new Adornment({
    name: AdornmentName.SUNDIAL,
    description: toGameText([
      "You may activate Production for up to 3 PRODUCTION in your city.",
      { type: "HR" },
      { type: "points", value: 1 },
      " for every 2 PRODUCTION in your city.",
    ]),
    pointsInner: (player) => {
      return Math.floor(player.getNumCardType(CardType.PRODUCTION) / 2);
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
        const cardOptions = onlyRelevantProductionCards(
          gameState,
          player.getAllPlayedCardsByType(CardType.PRODUCTION)
        );
        if (cardOptions.length !== 0) {
          if (cardOptions.length <= 3) {
            gameState.addGameLogFromAdornment(AdornmentName.SUNDIAL, [
              player,
              " activated PRODUCTION in ",
              ...cardListToGameText(
                cardOptions.map(({ cardName }) => cardName)
              ),
              ".",
            ]);
            cardOptions.forEach((selectedCard) => {
              const targetCard = Card.fromName(selectedCard.cardName);
              targetCard.reactivateCard(
                gameState,
                gameInput,
                player,
                selectedCard
              );
            });
          } else {
            // Ask player to select up to 3
            gameState.pendingGameInputs.push({
              inputType: GameInputType.SELECT_PLAYED_CARDS,
              prevInputType: gameInput.inputType,
              label: "Select 3 PRODUCTION to activate",
              cardOptions,
              adornmentContext: AdornmentName.SUNDIAL,
              maxToSelect: 3,
              minToSelect: 3,
              clientOptions: {
                selectedCards: [],
              },
            });
          }
        }
      } else if (
        gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS &&
        gameInput.prevInputType === GameInputType.PLAY_ADORNMENT &&
        gameInput.adornmentContext === AdornmentName.SUNDIAL
      ) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (!selectedCards || selectedCards.length !== gameInput.minToSelect) {
          throw new Error("Please select 3 PRODUCTION cards");
        }
        selectedCards.forEach((selectedCard) => {
          if (
            findIndex(gameInput.cardOptions, (x) =>
              isEqual(selectedCard, x)
            ) === -1
          ) {
            throw new Error("Couldn't find selected card");
          }
        });
        gameState.addGameLogFromAdornment(AdornmentName.SUNDIAL, [
          player,
          " activated PRODUCTION in ",
          ...cardListToGameText(selectedCards.map(({ cardName }) => cardName)),
          ".",
        ]);
        selectedCards.forEach((selectedCard) => {
          const targetCard = Card.fromName(selectedCard.cardName);
          targetCard.reactivateCard(gameState, gameInput, player, selectedCard);
        });
      }
    },
  }),
  [AdornmentName.TIARA]: new Adornment({
    name: AdornmentName.TIARA,
    description: toGameText([
      "Gain 1 ANY for each PROSPERITY in your city.",
      { type: "HR" },
      { type: "points", value: 1 },
      " for each PROSPERITY in your city.",
    ]),
    pointsInner: (player) => player.getNumCardType(CardType.PROSPERITY),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const gainAnyHelper = new GainMoreThan1AnyResource({
        adornmentContext: AdornmentName.TIARA,
      });
      if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
        const player = gameState.getActivePlayer();
        const numProsperity = player.getNumCardType(CardType.PROSPERITY);
        if (numProsperity > 0) {
          gameState.pendingGameInputs.push(
            gainAnyHelper.getGameInput(numProsperity, {
              prevInputType: gameInput.inputType,
            })
          );
        }
      } else if (gainAnyHelper.matchesGameInput(gameInput)) {
        gainAnyHelper.play(gameState, gameInput);
      }
    },
  }),
};

export const allAdornments = (): CardStack<AdornmentName> => {
  return new CardStack({
    name: "Adornments",
    cards: Object.values(AdornmentName),
  });
};
