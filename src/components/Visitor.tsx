import * as React from "react";
import styles from "../styles/visitor.module.css";

import { Visitor as VisitorModel } from "../model/visitor";
import { VisitorName } from "../model/types";
import { Description, ItemWrapper } from "./common";

export const VisitorInner: React.FC<{
  name: VisitorName;
}> = ({ name }) => {
  const visitor = VisitorModel.fromName(name);
  return (
    <>
      <div className={styles.visitor}>
        <div className={styles.visitor_top}></div>
        <div className={styles.visitor_center}>
          <Description textParts={visitor.description} />
        </div>
        <div className={styles.visitor_bot}>
          <div className={styles.base_vp}>
            <Description
              textParts={[{ type: "points", value: visitor.baseVP }]}
            />
          </div>
          <div className={styles.visitor_name}>{name}</div>
        </div>
      </div>
    </>
  );
};

const Visitor = ({ name }: { name: VisitorName }) => {
  return (
    <ItemWrapper>
      <VisitorInner name={name} />
    </ItemWrapper>
  );
};

export default Visitor;
