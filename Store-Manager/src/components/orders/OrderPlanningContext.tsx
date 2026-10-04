import { AlertTriangle, CalendarDays } from "lucide-react";
import {  motion  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { calmSpring } from "../../lib/constants";
import { dayNote } from "../../lib/deliveryDates";

export function OrderPlanningContext({ 
    afterCutoff,
    timeRemaining,
    futureOperatingDays,
    requestedDate,
    onRequestedDateChange,
    devMode = false,
    today = ""
  }: { 
    afterCutoff: boolean;
    timeRemaining: string;
    futureOperatingDays?: { date: string, isOperating: boolean }[];
    requestedDate?: string;
    onRequestedDateChange?: (date: string) => void;
    /** Server development mode: any upcoming day (including today) can be ordered. */
    devMode?: boolean;
    today?: string;
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
                <option key={d.date} value={d.date}>{d.date}{dayNote(d, today, devMode) ? ` · ${dayNote(d, today, devMode)}` : ""}</option>
              ))}
            </select>
          ) : (
            requestedDate || "Loading dates..."
          )}
        </strong>
        <small>
          {devMode ? "Development mode: any day can be ordered. " : ""}{afterCutoff
            ? "Next-day ordering closed · Orders now enter the following planning run."
            : timeRemaining ? `Next-day cutoff · ${timeRemaining} remaining` : "Next-day cutoff approaching"}
        </small>
      </div>
    </motion.div>
    )
}
