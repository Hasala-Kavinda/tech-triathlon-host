import { PackageOpen, Snowflake } from "lucide-react";
import {  motion  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { selectedProducts, getDraft } from "../../lib/utils";
import type { OrderType, OrderDrafts } from "../../types/store";
import { calmSpring } from "../../lib/constants";

export function OrderTypeSelector({
      type,
      quantities,
      onChange,
      business = "fresh",
    }: {
          type: OrderType
          quantities: OrderDrafts
          onChange: (type: OrderType) => void
          business?: "fresh" | "style" | "tech"
        }) {
    const options: Array<{ type: OrderType; label: string; icon: ReactNode }> = [
            { type: "dry", label: "Dry", icon: <PackageOpen /> },
            { type: "chilled", label: "Chilled", icon: <Snowflake /> },
          ];
    return (
    <div className="order-type-field">
      <span className="field-label">Order type</span>
      <div className="order-type-selector" role="tablist">
        {options.map((option) => {
          const count = selectedProducts(
            business,
            option.type,
            getDraft(quantities, option.type),
          ).length
          const selected = type === option.type
          return (
            <motion.button
              className={"order-type-option " + (selected ? "order-type-option--selected" : "")}
              type="button"
              role="tab"
              aria-selected={selected}
              key={option.type}
              onClick={() => onChange(option.type)}
              whileTap={{ scale: 0.985 }}
              transition={calmSpring}
            >
              {selected && (
                <motion.span
                  className="order-type-selection"
                  layoutId="order-type-selection"
                  transition={calmSpring}
                />
              )}
              <span className="order-type-content">
                {option.icon}
                <span>{option.label}</span>
                {count > 0 && <small>{count} selected</small>}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
    )
}
