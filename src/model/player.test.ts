import expect from "expect.js";
import { Card } from "./card";
import { GameState } from "./gameState";
import { testInitialGameState, multiStepGameInputTest } from "./testHelpers";
import {
  ResourceType,
  CardName,
  EventName,
  GameInputType,
  GameInputPlayCard,
  LocationName,
} from "./types";

const playCardInput = (
  card: CardName,
  clientOptionOverrides: any = {}
): GameInputPlayCard => {
  return {
    inputType: GameInputType.PLAY_CARD as const,
    clientOptions: {
      card,
      source: "HAND",
      ...clientOptionOverrides,
    },
  };
};

describe("Player", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = testInitialGameState();
  });

  describe("getNumOccupiedSpacesInCity", () => {
    it("playing regular cards occupy spaces", () => {
      const p = gameState.getActivePlayer();
      expect(p.getNumOccupiedSpacesInCity()).to.be(0);
      p.addToCity(gameState, CardName.FARM);
      expect(p.getNumOccupiedSpacesInCity()).to.be(1);
      p.addToCity(gameState, CardName.MINE);
      expect(p.getNumOccupiedSpacesInCity()).to.be(2);
    });

    it("for scoring", () => {
      const p = gameState.getActivePlayer();
      expect(p.getNumOccupiedSpacesInCity()).to.be(0);
      p.addToCity(gameState, CardName.HUSBAND);
      expect(p.getNumOccupiedSpacesInCity()).to.be(1);
      p.addToCity(gameState, CardName.WIFE);
      expect(p.getNumOccupiedSpacesInCity()).to.be(1);
      expect(p.getNumOccupiedSpacesInCity(true /* forScoring */)).to.be(2);

      for (let i = 0; i < 14; i++) {
        p.addToCity(gameState, CardName.HUSBAND);
        p.addToCity(gameState, CardName.WIFE);
      }
      expect(p.getNumOccupiedSpacesInCity()).to.be(15);
      expect(p.getNumOccupiedSpacesInCity(true /* forScoring */)).to.be(15);
    });

    it("playing Husband & Wife cards share spaces", () => {
      const p = gameState.getActivePlayer();
      expect(p.getNumOccupiedSpacesInCity()).to.be(0);
      p.addToCity(gameState, CardName.HUSBAND);
      expect(p.getNumOccupiedSpacesInCity()).to.be(1);
      p.addToCity(gameState, CardName.WIFE);
      expect(p.getNumOccupiedSpacesInCity()).to.be(1);
      p.addToCity(gameState, CardName.WIFE);
      expect(p.getNumOccupiedSpacesInCity()).to.be(2);
      p.addToCity(gameState, CardName.HUSBAND);
      expect(p.getNumOccupiedSpacesInCity()).to.be(2);
      expect(p.getPlayedCards().length).to.be(4);
    });

    [CardName.WANDERER, CardName.PIRATE].forEach((cardName) => {
      it(`playing Card:${cardName} does not occupy spaces`, () => {
        const p = gameState.getActivePlayer();
        expect(p.getNumOccupiedSpacesInCity()).to.be(0);
        p.addToCity(gameState, cardName);
        expect(p.getNumOccupiedSpacesInCity()).to.be(0);
        p.addToCity(gameState, cardName);
        expect(p.getNumOccupiedSpacesInCity()).to.be(0);
        expect(p.getPlayedCards().length).to.be(2);
      });
    });
  });

  describe("canAddToCity", () => {
    it("should account for unique cards", () => {
      const p = gameState.getActivePlayer();
      expect(p.canAddToCity(CardName.KING, true /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.KING, false /* strict */)).to.be(true);

      p.addToCity(gameState, CardName.KING);
      expect(p.canAddToCity(CardName.KING, true /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.KING, false /* strict */)).to.be(false);
    });

    it("should be able to add cards to city if there is space", () => {
      const p = gameState.getActivePlayer();
      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(true);

      p.addToCity(gameState, CardName.FARM);
      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(true);
    });

    it("should not be able to add cards to city if full", () => {
      const p = gameState.getActivePlayer();
      // Max city size is 15
      for (let i = 0; i < 15; i++) {
        p.addToCity(gameState, CardName.FARM);
      }
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(false);
    });

    it("should be able to add WANDERER even if city is full", () => {
      const p = gameState.getActivePlayer();
      for (let i = 0; i < 15; i++) {
        p.addToCity(gameState, CardName.FARM);
      }
      expect(p.canAddToCity(CardName.WANDERER, false /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.WANDERER, true /* strict */)).to.be(true);
    });

    it("should be able to add PIRATE even if city is full", () => {
      const p = gameState.getActivePlayer();
      for (let i = 0; i < 15; i++) {
        p.addToCity(gameState, CardName.FARM);
      }
      expect(p.canAddToCity(CardName.PIRATE, false /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.PIRATE, true /* strict */)).to.be(true);
    });

    it("should be able to add Construction even if city is full (if there's unpaired MESSENGER)", () => {
      const p = gameState.getActivePlayer();
      for (let i = 0; i < 14; i++) {
        p.addToCity(gameState, CardName.WIFE);
      }

      const playedFarm = p.addToCity(gameState, CardName.FARM);
      p.addToCity(gameState, CardName.MESSENGER);
      p.removeCardFromCity(gameState, playedFarm);

      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(true);

      expect(p.canAddToCity(CardName.WIFE, false /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.WIFE, true /* strict */)).to.be(false);
    });

    it("should be able to add MESSENGER even if city is full (w/ contruction)", () => {
      const p = gameState.getActivePlayer();
      for (let i = 0; i < 15; i++) {
        p.addToCity(gameState, CardName.FARM);
      }
      expect(p.canAddToCity(CardName.MESSENGER, false /* strict */)).to.be(
        true
      );
      expect(p.canAddToCity(CardName.MESSENGER, true /* strict */)).to.be(true);
    });

    it("should NOT be able to add MESSENGER even if city is full (w/o contruction)", () => {
      const p = gameState.getActivePlayer();
      for (let i = 0; i < 15; i++) {
        p.addToCity(gameState, CardName.WIFE);
      }
      expect(p.canAddToCity(CardName.MESSENGER, false /* strict */)).to.be(
        false
      );
      expect(p.canAddToCity(CardName.MESSENGER, true /* strict */)).to.be(
        false
      );
    });

    it("should account for greenhouse/farm pairs", () => {
      const p = gameState.getActivePlayer();

      for (let i = 0; i < 15; i++) {
        p.addToCity(gameState, CardName.FARM);
      }

      expect(p.canAddToCity(CardName.GREENHOUSE, true /* strict */)).to.be(
        true
      );
      expect(p.canAddToCity(CardName.GREENHOUSE, false /* strict */)).to.be(
        true
      );

      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.HUSBAND, true /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.HUSBAND, false /* strict */)).to.be(false);

      // We can add a GREENHOUSE though
      expect(p.canAddToCity(CardName.GREENHOUSE, true /* strict */)).to.be(
        true
      );
      expect(p.canAddToCity(CardName.GREENHOUSE, false /* strict */)).to.be(
        true
      );
    });

    it("should account for husband/wife pairs", () => {
      const p = gameState.getActivePlayer();

      for (let i = 0; i < 13; i++) {
        p.addToCity(gameState, CardName.FARM);
      }
      p.addToCity(gameState, CardName.HUSBAND);
      p.addToCity(gameState, CardName.WIFE);

      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(true);

      // Add another husband
      p.addToCity(gameState, CardName.HUSBAND);

      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.HUSBAND, true /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.HUSBAND, false /* strict */)).to.be(false);

      // We can add a WIFE though
      expect(p.canAddToCity(CardName.WIFE, true /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.WIFE, false /* strict */)).to.be(true);
    });

    it("should account for CRANE", () => {
      const p = gameState.getActivePlayer();

      for (let i = 0; i < 14; i++) {
        p.addToCity(gameState, CardName.FARM);
      }
      p.addToCity(gameState, CardName.CRANE);

      // constructions are okay if not strict
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(false);

      // not critters
      expect(p.canAddToCity(CardName.WIFE, true /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.WIFE, false /* strict */)).to.be(false);
    });

    it("should account for INNKEEPER", () => {
      const p = gameState.getActivePlayer();

      for (let i = 0; i < 14; i++) {
        p.addToCity(gameState, CardName.FARM);
      }
      p.addToCity(gameState, CardName.INNKEEPER);

      // critters are okay if not strict
      expect(p.canAddToCity(CardName.WIFE, false /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.WIFE, true /* strict */)).to.be(false);

      // not constructions
      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(false);
    });

    it("should account for RUINS", () => {
      const p = gameState.getActivePlayer();
      for (let i = 0; i < 15; i++) {
        p.addToCity(gameState, CardName.FARM);
      }
      // city is full
      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(false);

      // ruins is okay always
      expect(p.canAddToCity(CardName.RUINS, true /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.RUINS, false /* strict */)).to.be(true);
    });
  });

  describe("canAffordCard", () => {
    it("have the right resources", () => {
      const player = gameState.getActivePlayer();
      expect(player.getNumResources()).to.be(0);
      expect(player.canAffordCard(CardName.FARM, "HAND")).to.be(false);
      player.gainResources(gameState, Card.fromName(CardName.FARM).baseCost);
      expect(player.canAffordCard(CardName.FARM, "HAND")).to.be(true);
    });

    it("unoccupied associated construction", () => {
      const player = gameState.getActivePlayer();
      expect(player.getNumResources()).to.be(0);
      expect(player.canAffordCard(CardName.HUSBAND, "HAND")).to.be(false);
      player.addToCity(gameState, CardName.FARM);
      expect(player.canAffordCard(CardName.HUSBAND, "HAND")).to.be(true);
      // Occupy the farm
      player.useConstructionToPlayCritter(CardName.FARM);
      expect(player.canAffordCard(CardName.HUSBAND, "HAND")).to.be(false);
    });

    it("CRANE discount for constructions", () => {
      const player = gameState.getActivePlayer();
      expect(player.getNumResources()).to.be(0);
      expect(player.canAffordCard(CardName.FARM, "HAND")).to.be(false);
      player.addToCity(gameState, CardName.CRANE);
      expect(player.canAffordCard(CardName.FARM, "HAND")).to.be(true);
      // Doesn't work for critters
      expect(player.canAffordCard(CardName.WIFE, "HAND")).to.be(false);
    });

    it("INNKEEPER discount for critters", () => {
      const player = gameState.getActivePlayer();
      expect(player.getNumResources()).to.be(0);
      expect(player.canAffordCard(CardName.WIFE, "HAND")).to.be(false);
      player.addToCity(gameState, CardName.INNKEEPER);
      expect(player.canAffordCard(CardName.WIFE, "HAND")).to.be(true);
      // Doesn't work for constructions
      expect(player.canAffordCard(CardName.FARM, "HAND")).to.be(false);
    });

    it("QUEEN discount", () => {
      const player = gameState.getActivePlayer();
      expect(player.getNumResources()).to.be(0);
      expect(player.canAffordCard(CardName.WIFE, "HAND")).to.be(false);
      player.addToCity(gameState, CardName.QUEEN);
      expect(player.canAffordCard(CardName.WIFE, "HAND")).to.be(true);
      // Doesn't work if VP is greater than 3
      expect(player.canAffordCard(CardName.KING, "HAND")).to.be(false);
    });

    it("JUDGE discount", () => {
      const player = gameState.getActivePlayer();
      expect(player.getNumResources()).to.be(0);
      expect(player.canAffordCard(CardName.CRANE, "HAND")).to.be(false);
      player.addToCity(gameState, CardName.JUDGE);
      expect(player.canAffordCard(CardName.CRANE, "HAND")).to.be(false);
      player.gainResources(gameState, {
        [ResourceType.BERRY]: 1,
      });
      expect(player.canAffordCard(CardName.CRANE, "HAND")).to.be(true);

      // need resin & pebble
      expect(player.canAffordCard(CardName.RESIN_REFINERY, "HAND")).to.be(
        false
      );
      player.gainResources(gameState, {
        [ResourceType.BERRY]: 1,
      });
      expect(player.canAffordCard(CardName.RESIN_REFINERY, "HAND")).to.be(
        false
      );
      player.gainResources(gameState, {
        [ResourceType.PEBBLE]: 1,
      });
      expect(player.canAffordCard(CardName.RESIN_REFINERY, "HAND")).to.be(true);
    });

    it("Use golden leaf on unoccupied special construction", () => {
      const player = gameState.getActivePlayer();
      expect(player.getNumResources()).to.be(0);
      expect(player.numGoldenLeaf).to.be(0);
      expect(player.canAffordCard(CardName.HUSBAND, "HAND")).to.be(false);

      player.initGoldenLeaf();
      player.addToCity(gameState, CardName.GREENHOUSE);
      expect(player.canAffordCard(CardName.HUSBAND, "HAND")).to.be(true);
      expect(player.canAffordCard(CardName.RANGER, "HAND")).to.be(false);
    });

    it("Use golden leaf on unoccupied regular construction", () => {
      const player = gameState.getActivePlayer();
      expect(player.getNumResources()).to.be(0);
      expect(player.numGoldenLeaf).to.be(0);
      expect(player.canAffordCard(CardName.LAMPLIGHTER, "HAND")).to.be(false);

      player.initGoldenLeaf();
      player.addToCity(gameState, CardName.FARM);
      expect(player.canAffordCard(CardName.LAMPLIGHTER, "HAND")).to.be(true);
      expect(player.canAffordCard(CardName.RANGER, "HAND")).to.be(false);
    });
  });

  describe("validatePaymentOptions", () => {
    it("sanity checks", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.validatePaymentOptions(playCardInput(CardName.FARM))
      ).to.match(/invalid/i);
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {},
          })
        )
      ).to.match(/invalid/i);
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {},
            },
          })
        )
      ).to.match(/insufficient/);
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {
                [ResourceType.TWIG]: 1,
                [ResourceType.RESIN]: 1,
              },
            },
          })
        )
      ).to.match(/Can't spend/);

      player.gainResources(gameState, {
        [ResourceType.TWIG]: 1,
        [ResourceType.RESIN]: 1,
      });
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {
                [ResourceType.TWIG]: 1,
                [ResourceType.RESIN]: 1,
              },
            },
          })
        )
      ).to.match(/insufficient/);

      player.gainResources(gameState, {
        [ResourceType.TWIG]: 1,
      });
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {
                [ResourceType.TWIG]: 2,
                [ResourceType.RESIN]: 1,
              },
            },
          })
        )
      ).to.be(null);
    });

    it("unoccupied associated construction", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: { resources: {} },
          })
        )
      ).to.match(/insufficient/i);

      // Doesn't work for constructions
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {},
              useAssociatedCard: true,
            },
          })
        )
      ).to.match(/cannot use associated card/i);

      // Error if don't have associated card
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.INNKEEPER, {
            paymentOptions: {
              resources: {},
              useAssociatedCard: true,
            },
          })
        )
      ).to.match(/cannot find associated card/i);

      player.addToCity(gameState, CardName.INN);
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.INNKEEPER, {
            paymentOptions: {
              resources: {},
              useAssociatedCard: true,
            },
          })
        )
      ).to.be(null);

      // Try with king + evertree
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.KING, {
            paymentOptions: {
              resources: {},
              useAssociatedCard: true,
            },
          })
        )
      ).to.match(/cannot find associated card/i);
      player.addToCity(gameState, CardName.EVERTREE);
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.KING, {
            paymentOptions: {
              resources: {},
              useAssociatedCard: true,
            },
          })
        )
      ).to.be(null);
    });

    it("unoccupied & golden leaf", () => {
      const player = gameState.getActivePlayer();
      player.addToCity(gameState, CardName.FARM);

      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: { resources: {} },
          })
        )
      ).to.match(/insufficient/i);

      // Doesn't work for constructions
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {},
              occupyCardWithGoldenLeaf: CardName.GREENHOUSE,
            },
          })
        )
      ).to.match(/cannot use associated card/i);

      // Need to have gold leafs
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.LAMPLIGHTER, {
            paymentOptions: {
              resources: {},
              occupyCardWithGoldenLeaf: CardName.FARM,
            },
          })
        )
      ).to.match(/no more golden leaf/i);

      // Error if don't have the specified card
      player.initGoldenLeaf();
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.INNKEEPER, {
            paymentOptions: {
              resources: {},
              occupyCardWithGoldenLeaf: CardName.LIBRARY,
            },
          })
        )
      ).to.match(/cannot find unoccupied library/i);

      player.addToCity(gameState, CardName.LIBRARY);
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.INNKEEPER, {
            paymentOptions: {
              resources: {},
              occupyCardWithGoldenLeaf: CardName.LIBRARY,
            },
          })
        )
      ).to.be(null);
    });

    it("cardToDungeon", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              cardToDungeon: CardName.WIFE,
              resources: {},
            },
          })
        )
      ).to.match(/unable to invoke dungeon/i);
      player.addToCity(gameState, CardName.WIFE);
      player.addToCity(gameState, CardName.DUNGEON);
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {},
              cardToDungeon: CardName.WIFE,
            },
          })
        )
      ).to.be(null);

      const playedDungeon = player.getFirstPlayedCard(CardName.DUNGEON);
      playedDungeon.pairedCards!.push(CardName.WIFE);

      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {},
              cardToDungeon: CardName.WIFE,
            },
          })
        )
      ).to.match(/unable to invoke dungeon/i);

      player.addToCity(gameState, CardName.RANGER);

      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.KING, {
            paymentOptions: {
              resources: {},
              cardToDungeon: CardName.WIFE,
            },
          })
        )
      ).to.match(/insufficient/);
    });

    describe("cardToUse", () => {
      it("invalid", () => {
        const player = gameState.getActivePlayer();
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.FARM,
                resources: {},
              },
            })
          )
        ).to.match(/unable to find farm/i);
      });

      it("INNKEEPER", () => {
        const player = gameState.getActivePlayer();
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.INNKEEPER,
                resources: {},
              },
            })
          )
        ).to.match(/innkeeper/i);

        player.addToCity(gameState, CardName.INNKEEPER);
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.INNKEEPER,
                resources: {},
              },
            })
          )
        ).to.match(/innkeeper/i);
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.HUSBAND, {
              paymentOptions: {
                cardToUse: CardName.INNKEEPER,
                resources: {},
              },
            })
          )
        ).to.be(null);

        player.gainResources(gameState, {
          [ResourceType.BERRY]: 1,
        });

        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.HUSBAND, {
              paymentOptions: {
                cardToUse: CardName.INNKEEPER,
                resources: {
                  [ResourceType.BERRY]: 1,
                },
              },
            })
          )
        ).to.match(/overpay/i);
      });

      it("INVENTOR", () => {
        const player = gameState.getActivePlayer();
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.INVENTOR,
                resources: {},
              },
            })
          )
        ).to.match(/inventor/i);

        player.addToCity(gameState, CardName.INVENTOR);
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.INVENTOR,
                resources: {},
              },
            })
          )
        ).to.be(null);
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.HUSBAND, {
              paymentOptions: {
                cardToUse: CardName.INVENTOR,
                resources: {},
              },
            })
          )
        ).to.be(null);

        player.gainResources(gameState, {
          [ResourceType.BERRY]: 1,
        });

        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.HUSBAND, {
              paymentOptions: {
                cardToUse: CardName.INVENTOR,
                resources: {
                  [ResourceType.BERRY]: 1,
                },
              },
            })
          )
        ).to.match(/overpay/i);
      });

      it("QUEEN", () => {
        const player = gameState.getActivePlayer();
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.QUEEN,
                resources: {},
              },
            })
          )
        ).to.match(/unable to find queen/i);

        player.addToCity(gameState, CardName.QUEEN);
        player.addToCity(gameState, CardName.CASTLE);
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.QUEEN,
                resources: {},
              },
            })
          )
        ).to.be(null);

        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.KING, {
              paymentOptions: {
                cardToUse: CardName.QUEEN,
                resources: {},
              },
            })
          )
        ).to.match(/cannot use queen to play king/i);

        expect(() => {
          player.validatePaymentOptions(
            playCardInput(CardName.KING, {
              paymentOptions: {
                cardToUse: CardName.CASTLE,
                resources: {},
              },
            })
          );
        }).to.throwException(/unexpected/i);
      });

      it("CRANE", () => {
        const player = gameState.getActivePlayer();
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.CRANE,
                resources: {},
              },
            })
          )
        ).to.match(/unable to find crane/i);

        player.addToCity(gameState, CardName.CRANE);
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.CRANE,
                resources: {},
              },
            })
          )
        ).to.be(null);

        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.WIFE, {
              paymentOptions: {
                cardToUse: CardName.CRANE,
                resources: {},
              },
            })
          )
        ).to.match(/unable to use crane to play wife/i);
      });

      it("INN", () => {
        const player = gameState.getActivePlayer();
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.INN,
                resources: {},
              },
            })
          )
        ).to.match(/unable to find inn/i);

        player.addToCity(gameState, CardName.INN);
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.INN,
                resources: {},
              },
            })
          )
        ).to.match(/cannot use inn to play a non-meadow card/i);

        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              source: "MEADOW",
              paymentOptions: {
                cardToUse: CardName.INN,
                resources: {},
              },
            })
          )
        ).to.be(null);
      });
    });
  });

  describe("isPaidResourcesValid", () => {
    it("invalid resources", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid({}, { [ResourceType.BERRY]: 1 })
      ).to.be(false);
      expect(player.isPaidResourcesValid({}, { [ResourceType.TWIG]: 1 })).to.be(
        false
      );
      expect(
        player.isPaidResourcesValid({}, { [ResourceType.PEBBLE]: 1 })
      ).to.be(false);
      expect(
        player.isPaidResourcesValid({}, { [ResourceType.RESIN]: 1 })
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 1 },
          { [ResourceType.BERRY]: 2 }
        )
      ).to.be(false);
    });

    it("wrong resources", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 2, [ResourceType.TWIG]: 1 },
          { [ResourceType.BERRY]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.RESIN]: 2, [ResourceType.TWIG]: 1 },
          { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.PEBBLE]: 2, [ResourceType.BERRY]: 1 },
          { [ResourceType.BERRY]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 2, [ResourceType.PEBBLE]: 1 },
          { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
    });

    it("overpay resources", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 3, [ResourceType.RESIN]: 1 },
          { [ResourceType.BERRY]: 2, [ResourceType.RESIN]: 1 },
          null,
          false /* errorIfOverpay */
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 3, [ResourceType.RESIN]: 1 },
          { [ResourceType.BERRY]: 2, [ResourceType.RESIN]: 1 },
          null
        )
      ).to.be(false);
    });

    it("BERRY discount", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 0 },
          { [ResourceType.BERRY]: 2 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 0 },
          { [ResourceType.BERRY]: 2 },
          ResourceType.BERRY
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 1 },
          { [ResourceType.BERRY]: 4 },
          ResourceType.BERRY
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 0 },
          { [ResourceType.BERRY]: 4 },
          ResourceType.BERRY
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 1 },
          { [ResourceType.BERRY]: 2 },
          ResourceType.BERRY
        )
      ).to.be(false);
    });

    it("ANY 3 discount", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid(
          {},
          { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          {},
          { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 },
          "ANY 3"
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.TWIG]: 1 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY 3"
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.TWIG]: 0 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY 3"
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.PEBBLE]: 5 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY 3"
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.TWIG]: 2 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY 3"
        )
      ).to.be(false);
    });
  });

  describe("getAvailableDestinationCards", () => {
    it("0 available destination cards if you have played 0 cards", () => {
      const player = gameState.getActivePlayer();
      const availableClosedDestinationCards = player.getAvailableClosedDestinationCards();

      expect(availableClosedDestinationCards.length).to.be(0);
    });
    it("getAvailableClosedDestinationCards only returns non-Open Destination Cards", () => {
      const player = gameState.getActivePlayer();
      let availableClosedDestinationCards = player.getAvailableClosedDestinationCards();

      expect(availableClosedDestinationCards.length).to.be(0);

      player.addToCity(gameState, CardName.INN);
      player.addToCity(gameState, CardName.LOOKOUT);
      player.addToCity(gameState, CardName.QUEEN);

      availableClosedDestinationCards = player.getAvailableClosedDestinationCards();

      expect(availableClosedDestinationCards.length).to.be(2);
    });
    it("getAvailableOpenDestinationCards only returns Open Destination Cards", () => {
      const player = gameState.getActivePlayer();
      let availableOpenDestinationCards = player.getAvailableOpenDestinationCards();

      expect(availableOpenDestinationCards.length).to.be(0);

      player.addToCity(gameState, CardName.INN);
      player.addToCity(gameState, CardName.POST_OFFICE);
      player.addToCity(gameState, CardName.LOOKOUT);

      availableOpenDestinationCards = player.getAvailableOpenDestinationCards();
      expect(player.getNumCardsInCity()).to.be(3);

      expect(availableOpenDestinationCards.length).to.be(2);
    });
  });

  describe("payForCard", () => {
    describe("useAssociatedCard", () => {
      it("should occupy associated card after using it", () => {
        // Use INN to play INNKEEPER
        const card = Card.fromName(CardName.INNKEEPER);
        const gameInput = playCardInput(card.name, {
          paymentOptions: {
            resources: {},
            useAssociatedCard: true,
          },
        });

        let player = gameState.getActivePlayer();
        player.addToCity(gameState, CardName.INN);
        expect(player.hasUnoccupiedConstruction(CardName.INN)).to.be(true);
        player.addCardToHand(gameState, card.name);

        expect(player.hasCardInCity(CardName.INN)).to.be(true);
        expect(card.canPlay(gameState, gameInput)).to.be(true);
        expect(player.numCardsInHand).to.not.be(0);

        gameState = gameState.next(gameInput);
        player = gameState.getPlayer(player.playerId);

        expect(player.numCardsInHand).to.be(0);
        expect(player.hasUnoccupiedConstruction(CardName.INN)).to.be(false);
        expect(player.hasCardInCity(CardName.INN)).to.be(true);
        expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(true);

        // Back to the prev player
        gameState.nextPlayer();

        // Now INN is occupied, try to occupy it again
        player.addCardToHand(gameState, card.name);
        expect(player.numCardsInHand).to.not.be(0);
        expect(card.canPlay(gameState, gameInput)).to.be(false);

        // Innkeeper is unique.
        expect(() => {
          gameState = gameState.next(gameInput);
        }).to.throwException(/cannot add innkeeper/i);

        // Destroy it
        player.removeCardFromCity(
          gameState,
          player.getFirstPlayedCard(CardName.INNKEEPER)
        );

        // Try again.
        expect(() => {
          gameState = gameState.next(gameInput);
        }).to.throwException(/cannot find associated card/i);
      });

      it("should occupy only ONE associated card after using it", () => {
        // Use FARM to play HUSBAND
        const card = Card.fromName(CardName.HUSBAND);
        const gameInput = playCardInput(card.name, {
          paymentOptions: {
            resources: {},
            useAssociatedCard: true,
          },
        });

        let player = gameState.getActivePlayer();
        player.addCardToHand(gameState, card.name);
        player.addCardToHand(gameState, card.name);
        player.addCardToHand(gameState, card.name);

        // Add 2 farms
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.FARM);

        expect(player.hasUnoccupiedConstruction(CardName.FARM)).to.be(true);

        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(card.canPlay(gameState, gameInput)).to.be(true);

        gameState = gameState.next(gameInput);
        player = gameState.getPlayer(player.playerId);
        expect(player.hasUnoccupiedConstruction(CardName.FARM)).to.be(true);
        expect(player.hasCardInCity(CardName.HUSBAND)).to.be(true);
        expect(player.getPlayedCardForCardName(CardName.HUSBAND).length).to.be(
          1
        );

        // Back to the prev player
        gameState.nextPlayer();

        gameState = gameState.next(gameInput);
        player = gameState.getPlayer(player.playerId);
        expect(player.hasUnoccupiedConstruction(CardName.FARM)).to.be(false);
        expect(player.getPlayedCardForCardName(CardName.HUSBAND).length).to.be(
          2
        );

        // Back to the prev player
        gameState.nextPlayer();

        expect(() => {
          gameState = gameState.next(gameInput);
        }).to.throwException(/cannot find associated card/i);
      });

      it("should occupy only specific card over the EVERTREE is one exists", () => {
        // Use FARM OR EVERTREE to play HUSBAND
        const card = Card.fromName(CardName.HUSBAND);
        const gameInput = playCardInput(card.name, {
          paymentOptions: {
            resources: {},
            useAssociatedCard: true,
          },
        });

        let player = gameState.getActivePlayer();
        player.addCardToHand(gameState, card.name);
        player.addCardToHand(gameState, card.name);
        player.addCardToHand(gameState, card.name);

        // Add 2 farms
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.EVERTREE);

        expect(player.hasUnoccupiedConstruction(CardName.FARM)).to.be(true);
        expect(player.hasUnoccupiedConstruction(CardName.EVERTREE)).to.be(true);

        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(card.canPlay(gameState, gameInput)).to.be(true);

        gameState = gameState.next(gameInput);
        player = gameState.getPlayer(player.playerId);
        expect(player.hasUnoccupiedConstruction(CardName.FARM)).to.be(false);
        expect(player.hasUnoccupiedConstruction(CardName.EVERTREE)).to.be(true);
        expect(player.hasCardInCity(CardName.HUSBAND)).to.be(true);
        expect(player.getPlayedCardForCardName(CardName.HUSBAND).length).to.be(
          1
        );

        // Back to the prev player
        gameState.nextPlayer();

        // use evertree this time.
        gameState = gameState.next(gameInput);
        player = gameState.getPlayer(player.playerId);
        expect(player.hasUnoccupiedConstruction(CardName.FARM)).to.be(false);
        expect(player.hasUnoccupiedConstruction(CardName.EVERTREE)).to.be(
          false
        );
        expect(player.getPlayedCardForCardName(CardName.HUSBAND).length).to.be(
          2
        );

        // Back to the prev player
        gameState.nextPlayer();

        expect(() => {
          gameState = gameState.next(gameInput);
        }).to.throwException(/cannot find associated card/i);
      });
    });

    describe("occupyCardWithGoldenLeaf", () => {
      it("should occupy card after using it and reduce golden leaf by 1", () => {
        let player = gameState.getActivePlayer();

        // Use GREENHOUSE to play HUSBAND
        const card = Card.fromName(CardName.HUSBAND);
        player.initGoldenLeaf();
        player.addToCity(gameState, CardName.GREENHOUSE);
        expect(player.hasUnoccupiedConstruction(CardName.GREENHOUSE)).to.be(
          true
        );
        expect(player.numGoldenLeaf).to.be(3);

        player.addCardToHand(gameState, card.name);
        expect(player.hasCardInCity(CardName.GREENHOUSE)).to.be(true);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name, {
            paymentOptions: {
              resources: {},
              occupyCardWithGoldenLeaf: CardName.GREENHOUSE,
            },
          }),
        ]);

        expect(player.numCardsInHand).to.be(0);
        expect(player.hasUnoccupiedConstruction(CardName.GREENHOUSE)).to.be(
          false
        );
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.hasCardInCity(CardName.GREENHOUSE)).to.be(true);
        expect(player.numGoldenLeaf).to.be(2);

        // Back to the prev player
        gameState.nextPlayer();

        // Now GREENHOUSE is occupied, try to occupy it again
        player.addCardToHand(gameState, card.name);

        expect(() => {
          [player, gameState] = multiStepGameInputTest(gameState, [
            playCardInput(card.name, {
              paymentOptions: {
                resources: {},
                occupyCardWithGoldenLeaf: CardName.GREENHOUSE,
              },
            }),
          ]);
        }).to.throwException(/Cannot find unoccupied Greenhouse/i);
      });

      it("should work with multiple same cards", () => {
        let player = gameState.getActivePlayer();
        player.addToCity(gameState, CardName.AIR_BALLOON);
        player.addToCity(gameState, CardName.AIR_BALLOON);
        player.addCardToHand(gameState, CardName.WANDERER);
        player.addCardToHand(gameState, CardName.WANDERER);
        player.initGoldenLeaf();
        player.useGoldenLeaf();
        expect(player.numGoldenLeaf).to.be(2);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(CardName.WANDERER, {
            paymentOptions: {
              resources: {},
              occupyCardWithGoldenLeaf: CardName.AIR_BALLOON,
            },
          }),
        ]);
        expect(player.numGoldenLeaf).to.be(1);
        expect(player.getPlayedCards().length).to.be(3);

        gameState.nextPlayer();
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(CardName.WANDERER, {
            paymentOptions: {
              resources: {},
              occupyCardWithGoldenLeaf: CardName.AIR_BALLOON,
            },
          }),
        ]);

        expect(player.numGoldenLeaf).to.be(0);
        expect(player.getPlayedCards().length).to.be(4);
      });
    });

    describe("cardToUse", () => {
      it("should remove CRANE from city after using it", () => {
        // Use crane to play farm
        const card = Card.fromName(CardName.FARM);
        const gameInput = playCardInput(card.name, {
          paymentOptions: {
            resources: {},
            cardToUse: CardName.CRANE,
          },
        });
        let player = gameState.getActivePlayer();

        player.addToCity(gameState, CardName.CRANE);
        player.addCardToHand(gameState, card.name);
        expect(player.hasCardInCity(CardName.CRANE)).to.be(true);
        expect(card.canPlay(gameState, gameInput)).to.be(true);
        expect(player.numCardsInHand).to.not.be(0);
        const nextGameState = gameState.next(gameInput);
        player = nextGameState.getPlayer(player.playerId);

        expect(player.numCardsInHand).to.be(0);
        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(player.hasCardInCity(CardName.CRANE)).to.be(false);
      });

      it("should remove INNKEEPER from city after using it", () => {
        // Use innkeeper to play wife
        const card = Card.fromName(CardName.WIFE);
        const gameInput = playCardInput(card.name, {
          paymentOptions: {
            resources: {},
            cardToUse: CardName.INNKEEPER,
          },
        });
        let player = gameState.getActivePlayer();

        player.addToCity(gameState, CardName.INNKEEPER);
        player.addCardToHand(gameState, card.name);
        expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(true);
        expect(card.canPlay(gameState, gameInput)).to.be(true);
        expect(player.numCardsInHand).to.not.be(0);
        const nextGameState = gameState.next(gameInput);
        player = nextGameState.getPlayer(player.playerId);

        expect(player.numCardsInHand).to.be(0);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(true);
        expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(false);
      });

      it("should place worker on QUEEN after using it", () => {
        // Use QUEEN to play wife
        const card = Card.fromName(CardName.WIFE);
        const gameInput = playCardInput(card.name, {
          paymentOptions: {
            resources: {},
            cardToUse: CardName.QUEEN,
          },
        });
        let player = gameState.getActivePlayer();

        player.addToCity(gameState, CardName.QUEEN);
        player.addCardToHand(gameState, card.name);

        expect(card.canPlay(gameState, gameInput)).to.be(true);
        expect(player.numCardsInHand).to.not.be(0);
        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getFirstPlayedCard(CardName.QUEEN)).to.eql({
          cardName: CardName.QUEEN,
          cardOwnerId: player.playerId,
          workers: [],
        });
        const nextGameState = gameState.next(gameInput);
        player = nextGameState.getPlayer(player.playerId);

        expect(player.numCardsInHand).to.be(0);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(true);
        expect(player.getFirstPlayedCard(CardName.QUEEN)).to.eql({
          cardName: CardName.QUEEN,
          cardOwnerId: player.playerId,
          workers: [player.playerId],
        });
        expect(player.numAvailableWorkers).to.be(1);

        nextGameState.nextPlayer();
        player.addCardToHand(gameState, card.name);
        expect(() => {
          nextGameState.next(gameInput);
        }).to.throwException(/cannot place worker on card/i);
      });
    });

    describe("cardToDungeon", () => {
      it("should add the cardToDungeon to the dungeon", () => {
        // Dungeon wife to play farm
        const card = Card.fromName(CardName.FARM);
        const gameInput = playCardInput(card.name, {
          paymentOptions: {
            resources: {},
            cardToDungeon: CardName.WIFE,
          },
        });

        let player = gameState.getActivePlayer();
        player.addCardToHand(gameState, card.name);

        player.addToCity(gameState, CardName.DUNGEON);
        player.addToCity(gameState, CardName.WIFE);

        expect(player.getFirstPlayedCard(CardName.DUNGEON)).to.eql({
          cardName: CardName.DUNGEON,
          cardOwnerId: player.playerId,
          pairedCards: [],
          usedForCritter: false,
        });

        expect(player.hasCardInCity(CardName.FARM)).to.be(false);
        expect(card.canPlay(gameState, gameInput)).to.be(true);

        const nextGameState = gameState.next(gameInput);
        player = nextGameState.getPlayer(player.playerId);
        expect(player.numCardsInHand).to.be(0);
        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(false);
        expect(player.hasCardInCity(CardName.DUNGEON)).to.be(true);
        expect(player.getFirstPlayedCard(CardName.DUNGEON)).to.eql({
          cardName: CardName.DUNGEON,
          cardOwnerId: player.playerId,
          pairedCards: [CardName.WIFE],
          usedForCritter: false,
        });
      });
    });
  });

  describe("recallWorkers", () => {
    it("error is still have workers", () => {
      const player = gameState.getActivePlayer();
      expect(player.numAvailableWorkers).to.be(2);
      expect(() => {
        player.recallWorkers(gameState);
      }).to.throwException(/still have available workers/i);
    });

    it("remove workers from other player's cards", () => {
      const player1 = gameState.getActivePlayer();
      const player2 = gameState.players[1];

      expect(player1.numAvailableWorkers).to.be(2);

      // Player 1 has a worker on player 2's INN
      player2.addToCity(gameState, CardName.INN);
      player1.placeWorkerOnCard(
        gameState,
        player2.getFirstPlayedCard(CardName.INN)
      );

      // No more space
      expect(
        player1.canPlaceWorkerOnCard(player2.getFirstPlayedCard(CardName.INN))
      ).to.be(false);

      gameState.locationsMap[LocationName.BASIC_ONE_STONE]!.push(
        player1.playerId
      );
      player1.placeWorkerOnLocation(LocationName.BASIC_ONE_STONE);
      expect(player1.numAvailableWorkers).to.be(0);

      player1.recallWorkers(gameState);
      expect(player1.numAvailableWorkers).to.be(2);
      expect(gameState.locationsMap[LocationName.BASIC_ONE_STONE]).to.eql([]);
    });

    it("keeps workers on MONASTERY & CEMETARY", () => {
      const player = gameState.getActivePlayer();

      expect(player.numAvailableWorkers).to.be(2);
      player.nextSeason();
      expect(player.numAvailableWorkers).to.be(3);

      // Player has 1 worker on lookout, 1 worker on monastery
      player.addToCity(gameState, CardName.LOOKOUT);
      player.placeWorkerOnCard(
        gameState,
        player.getFirstPlayedCard(CardName.LOOKOUT)
      );

      player.addToCity(gameState, CardName.MONASTERY);
      player.placeWorkerOnCard(
        gameState,
        player.getFirstPlayedCard(CardName.MONASTERY)
      );

      player.addToCity(gameState, CardName.CEMETARY);
      player.placeWorkerOnCard(
        gameState,
        player.getFirstPlayedCard(CardName.CEMETARY)
      );

      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);

      player.forEachPlayedCard(({ cardName, workers = [] }) => {
        if (
          cardName === CardName.LOOKOUT ||
          cardName === CardName.CEMETARY ||
          cardName === CardName.MONASTERY
        ) {
          expect(workers).to.eql([player.playerId]);
        } else {
          expect(workers).to.eql([]);
        }
      });

      player.recallWorkers(gameState);
      expect(player.numAvailableWorkers).to.be(1);

      player.forEachPlayedCard(({ cardName, workers = [] }) => {
        if (cardName === CardName.CEMETARY || cardName === CardName.MONASTERY) {
          expect(workers).to.eql([player.playerId]);
        } else {
          expect(workers).to.eql([]);
        }
      });
    });
  });

  describe("placing workers on storehouse", () => {
    it("Storehouse is not a destination card, but can have a worker placed on it", () => {
      const player = gameState.getActivePlayer();
      player.addToCity(gameState, CardName.STOREHOUSE);
      player.addToCity(gameState, CardName.INN);

      const closedDestinations = player.getAvailableClosedDestinationCards();
      expect(closedDestinations).to.eql([
        player.getFirstPlayedCard(CardName.STOREHOUSE),
      ]);

      const allDestinations = player.getAllAvailableDestinationCards();
      expect(allDestinations.length).to.eql(2);
    });
  });

  describe("getPoints", () => {
    it("calculate points for player with no events", () => {
      const player = gameState.getActivePlayer();
      player.addToCityMulti(gameState, [CardName.FARM, CardName.INN]);

      const points = player.getPoints(gameState);
      expect(points).to.be(3);
    });

    it("includes journey locations", () => {
      const player = gameState.getActivePlayer();
      player.addToCityMulti(gameState, [CardName.FARM, CardName.INN]);
      player.gainResources(gameState, {
        [ResourceType.VP]: 5,
      });
      player.placeWorkerOnLocation(LocationName.JOURNEY_FIVE);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(5);
      expect(player.getPoints(gameState)).to.be(8 + 5);
    });

    it("includes point tokens", () => {
      const player = gameState.getActivePlayer();
      player.addToCityMulti(gameState, [CardName.FARM, CardName.INN]);
      player.gainResources(gameState, {
        [ResourceType.VP]: 5,
      });
      expect(player.getPoints(gameState)).to.be(8);
    });

    it("includes point tokens on cards", () => {
      const player = gameState.getActivePlayer();
      player.addToCityMulti(gameState, [CardName.CLOCK_TOWER]);
      expect(player.getPoints(gameState)).to.be(3);
    });
  });

  describe("getNumResourcesByType", () => {
    it("Should calculate number of resources by type that a player has availale to use", () => {
      const player = gameState.getActivePlayer();

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

      player.gainResources(gameState, {
        [ResourceType.PEBBLE]: 2,
        [ResourceType.BERRY]: 5,
      });

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(5);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

      player.gainResources(gameState, {
        [ResourceType.RESIN]: 4,
        [ResourceType.TWIG]: 3,
        [ResourceType.VP]: 9,
        [ResourceType.BERRY]: 7,
      });

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(3);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(4);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(12);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(9);
    });
    it("Should be able to include or exclude stored resources", () => {
      const player = gameState.getActivePlayer();

      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

      player.addToCity(gameState, CardName.CLOCK_TOWER);

      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP, true)).to.be(3);

      player.claimedEvents[EventName.SPECIAL_AN_EVENING_OF_FIREWORKS] = {
        storedResources: { [ResourceType.TWIG]: 2 },
      };

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.TWIG, true)).to.be(2);

      player.gainResources(gameState, { [ResourceType.TWIG]: 5 });
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(5);
      expect(player.getNumResourcesByType(ResourceType.TWIG, true)).to.be(7);
    });
  });
});
