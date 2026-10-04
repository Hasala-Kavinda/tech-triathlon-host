import { PackageOpen } from "lucide-react";
import {  motion, AnimatePresence  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { CatalogProduct } from "../../types/store";
import { DirectQuantityControl } from "../common/QuantityControl";
import { calmSpring } from "../../lib/constants";

export function ProductSelectionRow({
      product,
      quantity,
      onChange,
    }: {
          product: CatalogProduct
          quantity: number
          onChange: (quantity: number) => void
        }) {
    const selected = quantity > 0;
    return (
    <motion.div
      className={`catalog-product-row ${
        selected ? "catalog-product-row--selected" : ""
      }`}
      layout
      transition={calmSpring}
    >
      <span className="catalog-product-icon">
        <PackageOpen />
      </span>
      <div className="catalog-product-copy">
        <strong>{product.name}</strong>
        <span>Unit: {product.unit}</span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          className={`selection-state ${
            selected ? "selection-state--selected" : ""
          }`}
          key={selected ? "selected" : "idle"}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.16 }}
        >
          {selected ? "Selected" : "Not added"}
        </motion.span>
      </AnimatePresence>
      <DirectQuantityControl quantity={quantity} onChange={onChange} />
    </motion.div>
    )
}
