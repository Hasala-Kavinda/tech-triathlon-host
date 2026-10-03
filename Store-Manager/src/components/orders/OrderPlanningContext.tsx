import { AlertTriangle, CalendarDays } from "lucide-react";
import {  motion  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { calmSpring } from "../../lib/constants";

export function OrderPlanningContext({ afterCutoff }: { afterCutoff: boolean }) {
    return (
    <motion.div
      className={`order-planning-context ${
        afterCutoff ? "order-planning-context--closed" : ""
      }`}
      layout
      transition={calmSpring}
    >
      <span className="planning-icon">
        {afterCutoff ? <AlertTriangle /> : <CalendarDays />}
      </span>
      <div>
        <span>{afterCutoff ? "Target planning run" : "Target delivery"}</span>
        <strong>
          {afterCutoff ? "Friday, 2 October" : "Tomorrow · Thursday, 1 October"}
        </strong>
        <small>
          {afterCutoff
            ? "Next-day ordering closed · Orders now enter the following planning run."
            : "Next-day cutoff · 2h 14m remaining"}
        </small>
      </div>
    </motion.div>
    )
}
