import {  motion  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { type StatusKind } from "../../types/store";
import { statusDetails, calmSpring } from "../../lib/constants";

export function StatusPill({ kind }: { kind: StatusKind }) {
    const status = statusDetails[kind];
    return (
    <motion.span
      className={`status-pill status-pill--${kind}`}
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={calmSpring}
    >
      {status.icon}
      {status.label}
    </motion.span>
    )
}
