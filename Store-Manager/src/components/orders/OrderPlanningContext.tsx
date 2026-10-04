import { AlertTriangle, CalendarDays } from "lucide-react";
import {  motion  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { calmSpring } from "../../lib/constants";

export function OrderPlanningContext({ 
    afterCutoff,
    timeRemaining,
    futureOperatingDays,
    requestedDate,
    onRequestedDateChange
  }: { 
    afterCutoff: boolean;
    timeRemaining: string;
    futureOperatingDays?: { date: string, isOperating: boolean }[];
    requestedDate?: string;
    onRequestedDateChange?: (date: string) => void;
  }) {
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
          {futureOperatingDays && futureOperatingDays.length > 0 && onRequestedDateChange ? (
            <select 
              value={requestedDate} 
              onChange={(e) => onRequestedDateChange(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                fontWeight: "inherit",
                fontSize: "inherit",
                color: "inherit",
                fontFamily: "inherit",
                outline: "none",
                cursor: "pointer",
                padding: 0,
                margin: 0
              }}
            >
              {futureOperatingDays.map(d => (
                <option key={d.date} value={d.date}>{d.date}</option>
              ))}
            </select>
          ) : (
            requestedDate || "Loading dates..."
          )}
        </strong>
        <small>
          {afterCutoff
            ? "Next-day ordering closed · Orders now enter the following planning run."
            : timeRemaining ? `Next-day cutoff · ${timeRemaining} remaining` : "Next-day cutoff approaching"}
        </small>
      </div>
    </motion.div>
    )
}
