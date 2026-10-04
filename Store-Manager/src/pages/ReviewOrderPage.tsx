import { Clock3, LoaderCircle, PackageOpen } from "lucide-react";
import {  AnimatePresence  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { submitStoreOrder } from "../api/store";
import {  Button  } from '../components/common/Button';
import { SubmissionError } from "../components/orders/SubmissionError";
import { selectedProducts, getDraft, formatOrderType, getDefaultOrderType, formatOutlet, pluralizeUnit } from "../lib/utils";
import type { OrderType, OrderDrafts, SubmissionState, CatalogProduct } from "../types/store";
import { useCutoff } from "../hooks/useCutoff";

export function ReviewOrderPage({ business, 
      type,
      quantities,
      forceError,
      onBack,
      onConfirmed,
    }: { business: "fresh" | "style" | "tech"
          type: OrderType
          quantities: OrderDrafts
          forceError: boolean
          onBack: () => void
          onConfirmed: () => void
        }) {
    const { isClosed: afterCutoff, targetDeliveryDate } = useCutoff();
    const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
    const items = selectedProducts(business, type, getDraft(quantities, type));
    const totalUnits = items.reduce((total, item) => total + item.quantity, 0);

    async function submitOrder() {
        setSubmissionState("submitting")
        if (forceError) { setSubmissionState("error"); return }

        try {
          await submitStoreOrder({ business, type, requestedDate: targetDeliveryDate || undefined, items: items.map((item) => ({ id: item.id, quantity: item.quantity })) })
          onConfirmed()
        } catch (error) {
          console.error("Order submission failed", error)
          setSubmissionState("error")
        }
    }

    return (
    <div className="review-order-page">
      <div className="review-page-header">
        <div>
          <span className="page-kicker">Store order</span>
          <div className="page-title">Review order</div>
          <p>Check your order before submitting.</p>
        </div>
      </div>

      <ReviewContext business={business} type={type} />

      <div className="review-layout">
        <section className="review-products-panel">
          <div className="review-panel-heading">
            <div>
              <span>Selected products</span>
              <small>Confirm each quantity before submitting.</small>
            </div>
            <Button tone="secondary" className="text-button" onClick={onBack}>
              Edit products
            </Button>
          </div>
          <ReviewProductList items={items} />
        </section>

        <aside className="review-commit-panel">
          <div className="review-commit-heading">Ready to submit?</div>
          <p>
            WayLink will receive this{" "}
            {formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")).toLowerCase()} order for
            delivery planning.
          </p>

          <div
            className={`review-cutoff-note ${
              afterCutoff ? "review-cutoff-note--closed" : ""
            }`}
          >
            <Clock3 />
            <div>
              <strong>
                {afterCutoff
                  ? "Next-day ordering closed"
                  : "Submit before 4:00 PM"}
              </strong>
              <span>
                {afterCutoff
                  ? "Orders submitted now will enter Friday’s planning run."
                  : "Enter tomorrow’s planning queue."}
              </span>
            </div>
          </div>

          <div className="review-commit-total">
            <span>{items.length} products</span>
            <strong>{totalUnits} total units</strong>
          </div>

          <div className="review-actions">
            <Button
              onClick={submitOrder}
              disabled={submissionState === "submitting"}
            >
              {submissionState === "submitting" ? (
                <>
                  <LoaderCircle className="loading-icon" />
                  Submitting order…
                </>
              ) : (
                "Submit order"
              )}
            </Button>
            <Button
              tone="secondary"
              onClick={onBack}
              disabled={submissionState === "submitting"}
            >
              Back to edit
            </Button>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {submissionState === "error" && (
          <SubmissionError onRetry={submitOrder} onBack={onBack} />
        )}
      </AnimatePresence>

      <div className="mobile-review-actions">
        <Button
          tone="secondary"
          size="mobile"
          onClick={onBack}
          disabled={submissionState === "submitting"}
        >
          Edit
        </Button>
        <Button
          size="mobile"
          onClick={submitOrder}
          disabled={submissionState === "submitting"}
        >
          {submissionState === "submitting" ? (
            <>
              <LoaderCircle className="loading-icon" />
              Submitting…
            </>
          ) : (
            "Submit order"
          )}
        </Button>
      </div>
    </div>
    )
}

export function ReviewContext({ business, 
      type,
        }: { business: "fresh" | "style" | "tech", type: OrderType
        }) {
    const { isClosed: afterCutoff, timeRemaining, targetDeliveryStr } = useCutoff();
    return (
    <div className="review-context">
      <div>
        <span>Store</span>
        <strong>{formatOutlet(business)}</strong>
      </div>
      <div>
        <strong>{formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh"))}</strong>

      </div>
      <div>
        <span>
          {afterCutoff ? "Following planning run" : "Target delivery"}
        </span>
        <strong>
          {targetDeliveryStr}
        </strong>
      </div>
      <div>
        <span>Cutoff</span>
        <strong>
          {afterCutoff ? "Next-day ordering closed" : `${timeRemaining} remaining`}
        </strong>
      </div>
    </div>
    )
}

export function ReviewProductList({
      items,
    }: {
          items: Array<CatalogProduct & { quantity: number }>
        }) {
    const totalUnits = items.reduce((total, item) => total + item.quantity, 0);
    return (
    <div className="review-products">
      <div className="review-table-heading">
        <span>Product</span>
        <span>Quantity</span>
      </div>
      {items.map((item) => (
        <div className="review-product-row" key={item.id}>
          <span className="catalog-product-icon">
            <PackageOpen />
          </span>
          <div>
            <strong>{item.name}</strong>
            <small>Unit: {item.unit}</small>
          </div>
          <strong className="review-quantity">
            {item.quantity} {pluralizeUnit(item.unit, item.quantity)}
          </strong>
        </div>
      ))}
      <div className="review-totals">
        <span>
          <strong>{items.length}</strong> products
        </span>
        <span>
          <strong>{totalUnits}</strong> total units
        </span>
      </div>
    </div>
    )
}
