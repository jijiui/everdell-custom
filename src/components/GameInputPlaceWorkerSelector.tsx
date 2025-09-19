import * as React from "react";
import { useField } from "formik";

import styles from "../styles/gameBoard.module.css";

import { LocationName } from "../model/types";
import { Player } from "../model/player";

import { LocationInner as Location } from "./Location";
import { ItemWrapper } from "./common";

const GameInputPlaceWorkerSelector: React.FC<{
  name: string;
  locations: LocationName[];
  viewingPlayer: Player;
}> = ({ name, locations = [], viewingPlayer }) => {
  const [_field, meta, helpers] = useField(name);
  return (
    <div role="group">
      <div className={styles.items}>
        {locations.map((location, idx) => {
          const isSelected = meta.value === location;
          return (
            <div
              key={idx}
              data-cy={`place-worker-item:${location}`}
              className={styles.clickable}
              onClick={() => {
                helpers.setValue(location);
              }}
            >
              <ItemWrapper isHighlighted={isSelected}>
                <Location name={location} />
              </ItemWrapper>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameInputPlaceWorkerSelector;
