import {  motion  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { formatOrderType, getDefaultOrderType, formatOutlet } from "../../lib/utils";
import type { OrderType, CatalogProduct } from "../../types/store";
import { StatusPill } from "../common/StatusPill";
import { overlaySpring } from "../../lib/constants";

export function ConfirmationCard({ business, 
      type,
      afterCutoff,
      items,

    }: { business: "fresh" | "style" | "tech", type: OrderType, afterCutoff: boolean

          items: Array<CatalogProduct & { quantity: number }>
        }) {
    const totalUnits = items.reduce((total, item) => total + item.quantity, 0);
    const details = [
            { label: "Order number", value: "ORD-1082", data: true },
            { label: "Status", value: <StatusPill kind="confirmed" /> },
            {
              label: "Submitted",
              value: "Wednesday, 30 September · 13:46",
            },
            {
              label: "Order type",
              value: formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")),
            },
            {
              label: "Target planning run",
              value: afterCutoff ? "Friday, 2 October" : "Thursday, 1 October",
            },
            { label: "Outlet", value: formatOutlet(business) },
            {
              label: "Products",
              value: `${items.length} products · ${totalUnits} units`,
            },
          ];
    return (
    <motion.div
      className="confirmation-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={overlaySpring}
    >
      {details.map((detail) => (
        <div className="confirmation-detail" key={detail.label}>
          <span>{detail.label}</span>
          <strong className={detail.data ? "data-id" : ""}>
            {detail.value}
          </strong>
        </div>
      ))}
    </motion.div>
    )
}
