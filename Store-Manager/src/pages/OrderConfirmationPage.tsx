import { Check, Clock3, ArrowRight } from "lucide-react";
import {  motion  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {  Button  } from '../components/common/Button';
import { ConfirmationCard } from "../components/orders/ConfirmationCard";
import { selectedProducts, getDraft } from "../lib/utils";
import type { OrderType, OrderDrafts } from "../types/store";
import { calmSpring, overlaySpring } from "../lib/constants";

export function OrderConfirmationPage({ business, 
      type,
      quantities,
      afterCutoff,
      onHome,
      onViewOrder,
    }: { business: "fresh" | "style" | "tech"
          type: OrderType
          quantities: OrderDrafts
          afterCutoff: boolean
          onHome: () => void
          onViewOrder: () => void
        }) {
    const items = selectedProducts(business, type, getDraft(quantities, type));
    return (
    <div className="confirmation-page">
      <motion.div
        className="confirmation-intro"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={calmSpring}
      >
        <motion.span
          className="confirmation-icon"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={overlaySpring}
        >
          <Check />
        </motion.span>
        <div className="confirmation-title">Order received</div>
        <p>WayLink has received your order.</p>
      </motion.div>

      <div className="confirmation-layout">
        <ConfirmationCard business={business} type={type} afterCutoff={afterCutoff} items={items} />
        <div className="confirmation-side">
          <div className="next-steps-card">
            <span className="next-steps-icon">
              <Clock3 />
            </span>
            <div>
              <strong>What happens next?</strong>
              <p>
                Your order is now waiting for delivery planning. Once it is
                scheduled, the expected arrival time will appear here.
              </p>
            </div>
          </div>
          <div className="confirmation-actions">
            <Button onClick={onViewOrder}>
              View order
              <ArrowRight />
            </Button>
            <Button tone="secondary" onClick={onHome}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
    )
}
