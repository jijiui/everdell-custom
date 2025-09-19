import * as React from "react";
import { Player } from "../model/player";
import { GameState } from "../model/gameState";
import styles from "../styles/ViewerUI.module.css";

import { ItemWrapper, GameBlock } from "./common";
import { PlayerCity } from "./gameBoard";
import Card from "./Card";
import Adornment from "./Adornment";

const ViewerUI: React.FC<{
  player: Player;
  gameState: GameState;
}> = ({ player, gameState }) => {
  const reservedCard = player.getReservedCardOrNull();
  return (
    <>
      <GameBlock title={"Your hand"}>
        <div id={"js-player-hand"} className={styles.cards}>
          {player.getCardsInHand().map((cardName, idx) => (
            <ItemWrapper key={`card=${idx}`}>
              <Card name={cardName} />
            </ItemWrapper>
          ))}
          {player.getAdornmentsInHand().map((name, idx) => (
            <Adornment key={`adornment-${idx}`} name={name} />
          ))}
        </div>
      </GameBlock>
      {reservedCard && (
        <GameBlock title={"Reserved Card"}>
          <div className={styles.cards}>
            <ItemWrapper>
              <Card name={reservedCard} />
            </ItemWrapper>
          </div>
        </GameBlock>
      )}
      <GameBlock title={"Your City"}>
        <PlayerCity
          player={player}
          viewerId={player.playerId}
          gameState={gameState}
        />
      </GameBlock>
    </>
  );
};

export default ViewerUI;
