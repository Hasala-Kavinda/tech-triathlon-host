import { Search, ChevronUp, ArrowRight, X, PackageOpen } from "lucide-react";
import {  motion, AnimatePresence  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getCatalogue } from "../api/store";
import {  Button, IconButton  } from '../components/common/Button';
import { OrderPlanningContext } from "../components/orders/OrderPlanningContext";
import { OrderTypeSelector } from "../components/orders/OrderTypeSelector";
import { ProductSelectionRow } from "../components/orders/ProductSelectionRow";
import { getCatalog, selectedProducts, getDraft, formatOrderType, getDefaultOrderType, pluralizeUnit } from "../lib/utils";
import { OrderType, OrderDrafts, CatalogProduct } from '../types/store';
import { calmSpring, overlaySpring } from "../lib/constants";

export function NewOrderPage({ business, 
      afterCutoff = false,
      type,
      onTypeChange,
      quantities,
      onQuantitiesChange,
      initialSearch = "",
      initialSummaryOpen = false,
      onReview,
    }: { business: "fresh" | "style" | "tech", afterCutoff?: boolean
          type: OrderType
          onTypeChange: (type: OrderType) => void
          quantities: OrderDrafts
          onQuantitiesChange: React.Dispatch<React.SetStateAction<OrderDrafts>>
          initialSearch?: string
          initialSummaryOpen?: boolean
          onReview: () => void
        }) {
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [summaryOpen, setSummaryOpen] = useState(initialSummaryOpen);
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    
    useEffect(() => {
    let active = true
    void getCatalogue(business, type)
      .then((rows) => {
        if (!active) return
        setProducts(rows.map((row) => ({ id: row._id, name: row.name, unit: row.unit })))
      })
      .catch((error) => {
        console.error("Catalogue request failed", error)
        if (active) setProducts([])
      })
    return () => { active = false }
    }, [business, type])

    const filteredProducts = products.filter((product) =>
            product.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
          );
    const currentItems = products
      .map((product) => ({ ...product, quantity: (quantities && quantities[type] && quantities[type][product.id]) ?? 0 }))
      .filter((product) => product.quantity > 0);
    const totalUnits = currentItems.reduce(
            (total, product) => total + product.quantity,
            0,
          );

    function updateQuantity(productId: string, quantity: number) {
        onQuantitiesChange((prev) => ({
          ...prev,
          [type]: {
            ...getDraft(prev, type),
            [productId]: Math.max(0, quantity),
          },
        }))
    }

    function changeOrderType(nextType: OrderType) {
        onTypeChange(nextType)
        setSearchQuery("")
    }

    function clearCurrentOrder() {
        onQuantitiesChange((prev) => ({ ...prev, [type]: {} }))
    }

    return (
    <div className="new-order-page">
      <div className="new-order-header">
        <div>
          <span className="page-kicker">Store order</span>
          <div className="page-title">New order</div>
          <p>
            Select the products your store needs and enter the required
            quantities.
          </p>
        </div>
        <OrderPlanningContext afterCutoff={afterCutoff} />
      </div>

      <div className="new-order-layout">
        <motion.section
          className="product-workspace"
          layout
          transition={calmSpring}
        >
          {business === "fresh" ? (<OrderTypeSelector
            type={type}
            quantities={quantities}
            onChange={changeOrderType}
          />) : (<div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{business === "style" ? "Style stock" : "Tech stock"}</div>)}

          <label className="field product-search">
            <span className="field-label">Find a product</span>
            <span className="input-wrap input-wrap--icon">
              <Search />
              <input
                value={searchQuery}
                placeholder="Search products..."
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </span>
          </label>

          <div className="product-list-heading">
            <span>
              {formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh"))}
            </span>
            <small>{filteredProducts.length} products</small>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              className="catalog-product-list"
              key={`${type}-${searchQuery}`}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <ProductSelectionRow
                    product={product}
                    quantity={getDraft(quantities, type)[product.id] ?? 0}
                    onChange={(quantity) =>
                      updateQuantity(product.id, quantity)
                    }
                    key={product.id}
                  />
                ))
              ) : (
                <div className="product-search-empty">
                  <Search />
                  <strong>No matching products</strong>
                  <p>Try another product name.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.section>

        <DesktopOrderSummary business={business}
          type={type}
          items={currentItems}
          totalUnits={totalUnits}
          onClear={clearCurrentOrder}
          afterCutoff={afterCutoff}
          onReview={onReview}
        />
      </div>

      <motion.div
        className="mobile-order-action"
        layout
        transition={calmSpring}
      >
        <button
          className="mobile-summary-trigger"
          type="button"
          disabled={currentItems.length === 0}
          onClick={() => setSummaryOpen(true)}
        >
          <span>
            <strong>{currentItems.length} products</strong>
            <small>{totalUnits} total units</small>
          </span>
          <ChevronUp />
        </button>
        <Button
          size="mobile"
          disabled={currentItems.length === 0}
          onClick={onReview}
        >
          Review order
          <ArrowRight />
        </Button>
      </motion.div>

      <AnimatePresence initial={false}>
        {summaryOpen && (
          <MobileOrderSummarySheet business={business}
            type={type}
            items={currentItems}
            totalUnits={totalUnits}
            onClose={() => setSummaryOpen(false)}
            onReview={onReview}
          />
        )}
      </AnimatePresence>
    </div>
    )
}

export function MobileOrderSummarySheet({ business,
      type,
      items,
      totalUnits,
      onClose,
      onReview,
    }: {
          type: OrderType
          items: Array<CatalogProduct & { quantity: number }>
          totalUnits: number
          onClose: () => void
          onReview: () => void; business?: "fresh" | "style" | "tech"
        }) {
    return (
    <motion.div
      className="sheet-backdrop"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="bottom-sheet order-summary-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-summary-sheet-title"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={overlaySpring}
      >
        <span className="sheet-handle" />
        <div className="sheet-header">
          <div>
            <span className="dialog-title" id="order-summary-sheet-title">
              Order summary
            </span>
            <p>
              {formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh"))} ·{" "}
              {items.length} products · {totalUnits} units
            </p>
          </div>
          <IconButton label="Close order summary" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <SummaryItems items={items} />
        <div className="sheet-summary-actions">
          <Button size="mobile" onClick={onReview}>
            Review order
            <ArrowRight />
          </Button>
          <Button size="mobile" tone="secondary" onClick={onClose}>
            Continue editing
          </Button>
        </div>
      </motion.div>
    </motion.div>
    )
}

export function DesktopOrderSummary({ business,
      type,
      items,
      totalUnits,
      onClear,
      afterCutoff,
      onReview,
    }: {
          type: OrderType
          items: Array<CatalogProduct & { quantity: number }>
          totalUnits: number
          onClear: () => void
          afterCutoff: boolean
          onReview: () => void; business?: "fresh" | "style" | "tech"
        }) {
    const populated = items.length > 0;
    return (
    <motion.aside
      className="order-summary-panel"
      layout
      transition={calmSpring}
    >
      <div className="order-summary-heading">Order summary</div>
      <div className="summary-context">
        <span>
          <small>Order type</small>
          <strong>
            {formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh"))}
          </strong>
        </span>
        <span>
          <small>{afterCutoff ? "Planning run" : "Target delivery"}</small>
          <strong>
            {afterCutoff ? "Friday, 2 October" : "Thursday, 1 October"}
          </strong>
        </span>
      </div>

      <AnimatePresence mode="wait">
        {populated ? (
          <motion.div
            key="populated"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={calmSpring}
          >
            <div className="summary-totals">
              <span>
                <strong>{items.length}</strong>
                <small>products selected</small>
              </span>
              <span>
                <strong>{totalUnits}</strong>
                <small>total units</small>
              </span>
            </div>
            <SummaryItems items={items} />
          </motion.div>
        ) : (
          <motion.div
            className="empty-summary"
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={calmSpring}
          >
            <PackageOpen />
            <strong>No products selected yet</strong>
            <p>Add a quantity to include a product in this order.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="summary-actions">
        <Button disabled={!populated} onClick={onReview}>
          Review order
          <ArrowRight />
        </Button>
        <Button tone="secondary" disabled={!populated} onClick={onClear}>
          Clear order
        </Button>
      </div>
    </motion.aside>
    )
}

export function SummaryItems({
      items,
    }: {
          items: Array<CatalogProduct & { quantity: number }>
        }) {
    return (
    <motion.div className="summary-items" layout>
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            className="summary-item"
            key={item.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={calmSpring}
          >
            <span>{item.name}</span>
            <strong>
              {item.quantity} {pluralizeUnit(item.unit, item.quantity)}
            </strong>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
    )
}
