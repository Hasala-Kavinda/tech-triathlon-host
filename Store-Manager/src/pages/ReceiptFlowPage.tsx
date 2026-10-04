import { ArrowLeft, PackageCheck, CheckCircle2, AlertTriangle, Search, PackageOpen, ArrowRight, Check, ChevronUp, ChevronDown } from "lucide-react";
import {  AnimatePresence, motion  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {  Button  } from '../components/common/Button';
import {  DirectQuantityControl  } from '../components/common/QuantityControl';
import {  StatusPill  } from '../components/common/StatusPill';
import { selectedProducts, getDefaultOrderType, getDraft, formatOrderType, pluralizeUnit } from "../lib/utils";
import {  ReceiptFlowState, ReceiptIssueType, OrderType, CatalogProduct  } from '../types/store';
import { calmSpring, overlaySpring } from "../lib/constants";

const dummyDrafts: any = {
  fresh: { dry: { rice: 20, "milk-powder": 30, flour: 10, "cooking-oil": 20 } },
  style: { dry: {} },
  tech: { dry: {} }
};

export function ReceiptFlowPage({ 
      business,
      state,
      onStateChange,
      onBack,
      onHome,
      onViewOrder,
      onBusinessChange,
      orderId = "Pending",
    }: {
          orderId?: string
          business: "fresh" | "style" | "tech"
          state: ReceiptFlowState
          onStateChange: (state: ReceiptFlowState) => void
          onBack: () => void
          onHome: () => void
          onViewOrder: (withIssue: boolean) => void
            onOpenOrder: (id: string, view: string, state: string) => void
            onBusinessChange?: (b: "fresh" | "style" | "tech") => void
        }) {
    const receiptProducts = selectedProducts(business, getDefaultOrderType(business || "fresh"), getDraft(dummyDrafts[business], getDefaultOrderType(business || "fresh")));
    const [received, setReceived] = useState<Record<string, number>>({
            rice: 20,
            "milk-powder": 28,
            flour: 10,
            "cooking-oil": 20,
          });
    const [issueTypes, setIssueTypes] = useState<Record<string, ReceiptIssueType>>({
              rice: "good",
              "milk-powder": "missing",
              flour: "good",
              "cooking-oil": "damaged",
            });
    const [damaged, setDamaged] = useState<Record<string, number>>({
            "cooking-oil": 1,
          });
    const [issueSearch, setIssueSearch] = useState("");
    const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
    const [remark, setRemark] = useState(
            "One bottle was damaged during unloading.",
          );
    const [photoAdded, setPhotoAdded] = useState(false);
    const success = state === "confirmed" || state === "confirmed-issue";
    return (
    <div className="receipt-flow-page">
      <div className="order-detail-utility-row">
        <button className="order-back-link" type="button" onClick={onBack}>
          <ArrowLeft />
          Back to order
        </button>
      </div>

      {!success && (
        <div className="receipt-page-header">
          <div>
            <span className="page-kicker">{orderId} · {formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh"))}</span>
            <div className="page-title">
              {state === "verify"
                ? "Verify delivery"
                : state === "full"
                  ? "Confirm full receipt"
                  : state === "issue-review"
                    ? "Review delivery issues"
                    : "Verify delivery issues"}
            </div>
            <p>Driver completed delivery at 06:52.</p>
          </div>
          <StatusPill kind="awaiting" />
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {state === "verify" && (
          <motion.div
            className="receipt-initial-layout"
            key="verify"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={calmSpring}
          >
            <section className="verification-choice-card">
              <span className="verification-choice-icon">
                <PackageCheck />
              </span>
              <div className="verification-choice-title">
                Did everything arrive as expected?
              </div>
              <p>
                Choose the full-receipt path when all products and quantities
                are correct.
              </p>
              <div className="verification-choice-actions">
                <Button
                  icon={<CheckCircle2 />}
                  onClick={() => onStateChange("full")}
                >
                  Yes, everything is correct
                </Button>
                <Button
                  tone="secondary"
                  icon={<AlertTriangle />}
                  onClick={() => onStateChange("issue-edit")}
                >
                  Something is missing or damaged
                </Button>
              </div>
            </section>
            <ReceiptReadOnlySummary business={business} />
          </motion.div>
        )}

        {state === "full" && (
          <motion.div
            className="receipt-review-layout"
            key="full"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={calmSpring}
          >
            <section className="receipt-review-panel">
              <div className="receipt-panel-heading">
                <div>
                  <span>Full receipt</span>
                  <small>All ordered quantities will be confirmed.</small>
                </div>
              </div>
              <ReceiptGoodRows business={business} />
            </section>
            <aside className="receipt-commit-panel">
              <CheckCircle2 />
              <strong>Everything matches the order</strong>
              <p>No remark or photo is required.</p>
              <Button onClick={() => onStateChange("confirmed")}>
                Confirm full receipt
              </Button>
              <Button tone="secondary" onClick={() => onStateChange("verify")}>
                Back
              </Button>
            </aside>
          </motion.div>
        )}

        {state === "issue-edit" && (
          <motion.div
            className="receipt-issue-editor"
            key="issue-edit"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={calmSpring}
          >
                        <div style={{ padding: "16px 24px 0", borderBottom: "1px solid var(--border)" }}>
               <label className="field">
                 <span className="input-wrap input-wrap--icon">
                   <Search />
                   <input
                     placeholder="Search products"
                     value={issueSearch}
                     onChange={(e) => setIssueSearch(e.target.value)}
                   />
                 </span>
               </label>
            </div>
            <div className="receipt-issue-list">
              {receiptProducts.filter(p => p.name.toLowerCase().includes(issueSearch.toLowerCase())).map((product) => (
                <ReceiptIssueRow
                  key={product.id}
                  business={business}
                  product={product}
                  received={received[product.id] ?? product.quantity}
                  issueType={issueTypes[product.id] ?? "good"}
                  damaged={damaged[product.id] ?? 0}
                  isExpanded={expandedIssueId === product.id}
                  onToggle={() => setExpandedIssueId((current: string | null) => current === product.id ? null : product.id)}
                  onReceivedChange={(quantity) =>
                    setReceived((current) => ({
                      ...current,
                      [product.id]: quantity,
                    }))
                  }
                  onIssueChange={(value) =>
                    setIssueTypes((current) => ({
                      ...current,
                      [product.id]: value,
                    }))
                  }
                  onDamagedChange={(quantity) =>
                    setDamaged((current) => ({
                      ...current,
                      [product.id]: quantity,
                    }))
                  }
                />
              ))}
            </div>

            <div className="receipt-evidence-card">
              <label className="field">
                <span className="field-label">Add remark · Optional</span>
                <textarea
                  value={remark}
                  placeholder="Describe anything the structured fields do not cover"
                  onChange={(event) => setRemark(event.target.value)}
                />
              </label>
              <div className="photo-field">
                <span className="field-label">Photo · Optional</span>
                <Button
                  tone="secondary"
                  onClick={() => setPhotoAdded((current) => !current)}
                >
                  {photoAdded ? "Remove photo" : "Add photo"}
                </Button>
                <AnimatePresence>
                  {photoAdded && (
                    <motion.div
                      className="photo-preview"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      <PackageOpen />
                      <span>
                        <strong>delivery-issue.jpg</strong>
                        <small>Photo attached</small>
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="receipt-editor-actions">
                <Button onClick={() => onStateChange("issue-review")}>
                  Review issues
                  <ArrowRight />
                </Button>
                <Button
                  tone="secondary"
                  onClick={() => onStateChange("verify")}
                >
                  Back
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {state === "issue-review" && (
          <motion.div
            className="issue-review-layout"
            key="issue-review"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={calmSpring}
          >
            <section className="issue-review-card">
              <div className="receipt-panel-heading">
                <div>
                  <span>Reported issues</span>
                  <small>Review before confirming the store receipt.</small>
                </div>
              </div>
              <div className="issue-review-items">
                <div>
                  <strong>Milk powder</strong>
                  <span>Ordered: 30 cartons</span>
                  <span>Received: {received["milk-powder"]} cartons</span>
                  <b>{30 - received["milk-powder"]} cartons missing</b>
                </div>
                <div>
                  <strong>Cooking oil</strong>
                  <span>Ordered: 20 bottles</span>
                  <span>Received: {received["cooking-oil"]} bottles</span>
                  <b>{damaged["cooking-oil"]} bottle damaged</b>
                </div>
              </div>
              {remark && (
                <div className="issue-review-remark">
                  <span>Remark</span>
                  <p>{remark}</p>
                </div>
              )}
            </section>
            <aside className="receipt-commit-panel receipt-commit-panel--issue">
              <AlertTriangle />
              <strong>Confirm receipt with issue</strong>
              <p>The issue record will be sent to the dispatcher for review.</p>
              <Button onClick={() => onStateChange("confirmed-issue")}>
                Confirm receipt with issue
              </Button>
              <Button
                tone="secondary"
                onClick={() => onStateChange("issue-edit")}
              >
                Back to edit
              </Button>
            </aside>
          </motion.div>
        )}

        {state === "confirmed" && (
          <ReceiptConfirmationState
            key="confirmed"
            withIssue={false}
            onViewOrder={() => onViewOrder(false)}
            onHome={onHome}
          />
        )}

        {state === "confirmed-issue" && (
          <ReceiptConfirmationState
            key="confirmed-issue"
            withIssue
            onViewOrder={() => onViewOrder(true)}
            onHome={onHome}
          />
        )}
      </AnimatePresence>
    </div>
    )
}

export function ReceiptReadOnlySummary({ business = "fresh" }: { business?: "fresh" | "style" | "tech" }) {
    const receiptProducts = selectedProducts(business, getDefaultOrderType(business || "fresh"), getDraft(dummyDrafts[business], getDefaultOrderType(business || "fresh")));
    return (
    <div className="receipt-order-summary">
      <div className="receipt-panel-heading">
        <div>
          <span>Ordered products</span>
          <small>What the driver was expected to deliver.</small>
        </div>
        <span>4 products · 80 units</span>
      </div>
      <div className="receipt-summary-rows">
        {receiptProducts.map((product) => (
          <div className="receipt-summary-row" key={product.id}>
            <span className="catalog-product-icon">
              <PackageOpen />
            </span>
            <strong>{product.name}</strong>
            <span>
              {product.quantity} {pluralizeUnit(product.unit, product.quantity)}
            </span>
          </div>
        ))}
      </div>
    </div>
    )
}

export function ReceiptGoodRows({ business = "fresh" }: { business?: "fresh" | "style" | "tech" }) {
    const receiptProducts = selectedProducts(business, getDefaultOrderType(business || "fresh"), getDraft(dummyDrafts[business], getDefaultOrderType(business || "fresh")));
    return (
    <div className="receipt-good-list">
      {receiptProducts.map((product) => (
        <motion.div
          className="receipt-good-row"
          key={product.id}
          layout
          transition={calmSpring}
        >
          <span className="catalog-product-icon">
            <PackageOpen />
          </span>
          <div>
            <strong>{product.name}</strong>
            <small>
              {product.quantity} / {product.quantity}{" "}
              {pluralizeUnit(product.unit, product.quantity)}
            </small>
          </div>
          <span className="verification-status verification-status--good">
            <Check />
            Good
          </span>
        </motion.div>
      ))}
    </div>
    )
}

export function IssueChips({
      value,
      onChange,
      business = "fresh",
      orderType = "dry",
    }: {
          value: ReceiptIssueType
          onChange: (value: ReceiptIssueType) => void
          business?: "fresh" | "style" | "tech"
          orderType?: OrderType
        }) {
    let options: Array<{ value: ReceiptIssueType; label: string }> = [
            { value: "good", label: "Good" },
            { value: "missing", label: "Missing" },
            { value: "damaged", label: "Damaged" },
          ];
    if (business === "style") {
    options.push({ value: "wrong-variant", label: "Wrong item / variant" })
    options.push({ value: "condition", label: "Condition issue" })
    } else if (business === "tech") {
    options.push({ value: "wrong-item", label: "Wrong item" })
    options.push({ value: "seal", label: "Seal / package issue" })
    } else if (business === "fresh" && orderType === "chilled") {
    options.push({ value: "temperature", label: "Temperature issue" })
    }

    options.push({ value: "other", label: "Other" })
    return (
    <div className="issue-chips" role="radiogroup" aria-label="Issue type">
      {options.map((option) => (
        <motion.button
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? "issue-chip--selected" : ""}
          key={option.value}
          onClick={() => onChange(option.value)}
          whileTap={{ scale: 0.97 }}
          transition={calmSpring}
        >
          {option.label}
        </motion.button>
      ))}
    </div>
    )
}

export function ReceiptIssueRow({
      product,
      received,
      issueType,
      damaged,
      onReceivedChange,
      onIssueChange,
      onDamagedChange,
      business = "fresh",
      orderType = "dry",
      isExpanded = false,
      onToggle = () => {},
    }: {
          isExpanded?: boolean
          onToggle?: () => void
          product: CatalogProduct & { quantity: number }
          received: number
          issueType: ReceiptIssueType
          damaged: number
          onReceivedChange: (quantity: number) => void
          onIssueChange: (value: ReceiptIssueType) => void
          onDamagedChange: (quantity: number) => void
          business?: "fresh" | "style" | "tech"
          orderType?: OrderType
        }) {
    const missing = Math.max(0, product.quantity - received);
    let summaryText = "Good";
    let statusClass = "status-good";
    if (issueType === "missing") {
    summaryText = `Missing ${missing}`
    statusClass = "status-missing"
    } else if (issueType === "damaged") {
    summaryText = `Damaged ${damaged}`
    statusClass = "status-damaged"
    } else if (issueType === "other") {
    summaryText = "Other issue"
    statusClass = "status-other"
    } else if (issueType !== "good") {
    summaryText = issueType.charAt(0).toUpperCase() + issueType.slice(1).replace("-", " ")
    statusClass = "status-other"
    }

    return (
    <motion.div
      className={`receipt-issue-row receipt-issue-row--${issueType} ${isExpanded ? "expanded" : ""}`}
      layout
      transition={calmSpring}
    >
      <div 
        className="receipt-issue-header" 
        onClick={onToggle}
      >
        <div className="receipt-issue-product">
          <span className="catalog-product-icon">
            <PackageOpen />
          </span>
          <div className="product-summary">
            <strong>{product.name}</strong>
            {!isExpanded && (
              <small>
                {product.quantity} ordered · {received} received
                <br />
                <strong className={statusClass} style={{ color: "inherit", fontWeight: 500 }}>{summaryText}</strong>
              </small>
            )}
            {isExpanded && (
              <small>
                Ordered: {product.quantity} {pluralizeUnit(product.unit, product.quantity)}
              </small>
            )}
          </div>
        </div>
        <div className="accordion-icon">
          {isExpanded ? <ChevronUp /> : <ChevronDown />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            className="receipt-issue-expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
            transition={calmSpring}
          >
            <div className="receipt-issue-expanded-content">
              <div className="receipt-quantity-field">
                <span className="field-label">Received</span>
                <DirectQuantityControl
                  quantity={received}
                  max={product.quantity}
                  onChange={onReceivedChange}
                />
              </div>

              <div className="receipt-issue-type">
                <span className="field-label">Issue</span>
                <IssueChips value={issueType} onChange={onIssueChange} business={business} orderType={orderType} />
              </div>

              <AnimatePresence initial={false}>
                {(issueType !== "good") && (
                  <motion.div
                    className="receipt-calculation"
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    transition={calmSpring}
                  >
                    {issueType === "missing" && (
                      <>
                        <span>Calculated missing</span>
                        <strong>
                          {missing} {pluralizeUnit(product.unit, missing)}
                        </strong>
                      </>
                    )}
                    {issueType === "damaged" && (
                      <>
                        <span>Damaged quantity</span>
                        <DirectQuantityControl
                          quantity={damaged}
                          max={received}
                          onChange={onDamagedChange}
                        />
                      </>
                    )}
                    {issueType === "other" && (
                      <>
                        <span>Other issue</span>
                        <strong>Add details in the optional remark below.</strong>
                      </>
                    )}
                    {(issueType !== "missing" && issueType !== "damaged" && issueType !== "other") && (
                      <>
                        <span>{issueType.charAt(0).toUpperCase() + issueType.slice(1).replace("-", " ")}</span>
                        <strong>Add details in the optional remark below.</strong>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    )
}

export function ReceiptConfirmationState({
      orderId,
      withIssue,
      onViewOrder,
      onHome,
    }: {
          orderId?: string
          withIssue: boolean
          onViewOrder: () => void
          onHome: () => void
        }) {
    return (
    <motion.div
      className="receipt-confirmation-state"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={overlaySpring}
    >
      <span
        className={`receipt-success-icon ${
          withIssue ? "receipt-success-icon--issue" : ""
        }`}
      >
        {withIssue ? <AlertTriangle /> : <Check />}
      </span>
      <div className="receipt-confirmation-title">
        {withIssue ? "Receipt recorded" : "Receipt confirmed"}
      </div>
      <p>
        {withIssue
          ? "Your delivery receipt and reported issues have been saved."
          : orderId + " has been confirmed as fully received."}
      </p>

      <div className="receipt-confirmation-card">
        <div className="receipt-confirmation-order">
          <span className="data-id">{orderId}</span>
          <StatusPill kind={withIssue ? "issue" : "received"} />
        </div>
        <div className="receipt-confirmation-facts">
          {withIssue ? (
            <>
              <span>
                <strong>2 cartons</strong>
                <small>missing</small>
              </span>
              <span>
                <strong>1 bottle</strong>
                <small>damaged</small>
              </span>
              <span>
                <strong>06:59</strong>
                <small>recorded</small>
              </span>
            </>
          ) : (
            <>
              <span>
                <strong>4 products</strong>
                <small>received</small>
              </span>
              <span>
                <strong>80 units</strong>
                <small>confirmed</small>
              </span>
              <span>
                <strong>06:57</strong>
                <small>confirmed</small>
              </span>
            </>
          )}
        </div>
        <div className="receipt-confirmation-message">
          {withIssue
            ? "The issue has been sent to the dispatcher for review."
            : "No issues reported."}
        </div>
      </div>

      <div className="receipt-confirmation-actions">
        <Button onClick={onViewOrder}>
          View order
          <ArrowRight />
        </Button>
        <Button tone="secondary" onClick={onHome}>
          Back to Home
        </Button>
      </div>
    </motion.div>
    )
}
