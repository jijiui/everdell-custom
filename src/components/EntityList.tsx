import * as React from "react";

import uniqWith from "lodash/uniqWith";
import isEqual from "lodash/isEqual";

import { GameText, TextPartEntity } from "../model/types";
import { ItemWrapper } from "./common";
import Card from "./Card";
import Adornment from "./Adornment";
import Location from "./Location";
import Event from "./Event";
import RiverDestination from "./RiverDestination";
import Visitor from "./Visitor";

import { assertUnreachable } from "../utils";

const EntityList = ({ textParts }: { textParts: GameText }) => {
  return textParts ? (
    <>
      {uniqWith(
        textParts.filter((part) => part.type === "entity") as TextPartEntity[],
        isEqual
      ).map((part: TextPartEntity, idx: number) => {
        if (part.entityType === "event") {
          return <Event name={part.event} key={idx} />;
        }
        if (part.entityType === "location") {
          return <Location key={idx} name={part.location} />;
        }
        if (part.entityType === "card") {
          return (
            <ItemWrapper key={idx}>
              <Card name={part.card} />
            </ItemWrapper>
          );
        }
        if (part.entityType === "adornment") {
          return <Adornment key={idx} name={part.adornment} />;
        }
        if (part.entityType === "riverDestination") {
          return <RiverDestination key={idx} name={part.riverDestination} />;
        }
        if (part.entityType === "riverDestinationSpot") {
          return null;
        }
        if (part.entityType === "trainCarTile") {
          return null;
        }
        if (part.entityType === "visitor") {
          return <Visitor key={idx} name={part.visitor} />;
        }
        assertUnreachable(part, `Unexpected part: ${JSON.stringify(part)}`);
        return null;
      })}
    </>
  ) : null;
};

export default EntityList;
