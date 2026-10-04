import { ArrowLeft, PackageCheck, CheckCircle2, AlertTriangle, Search, PackageOpen, ArrowRight, Check, ChevronUp, ChevronDown } from "lucide-react";
import {  AnimatePresence, motion  } from 'motion/react';
import { useState, useEffect } from "react";
import {  Button  } from '../components/common/Button';
import {  DirectQuantityControl  } from '../components/common/QuantityControl';
import {  StatusPill  } from '../components/common/StatusPill';
import { pluralizeUnit, formatOrderType, getDefaultOrderType } from "../lib/utils";
import type { ReceiptFlowState, ReceiptIssueType, OrderType, CatalogProduct } from '../types/store';
import { calmSpring, overlaySpring } from "../lib/constants";
import { getOrder, storeDeliveryApi } from "../api/store";
import { clockTime } from "../lib/time";

/** One delivered product, with what was expected and what the driver recorded. */
type ReceiptLine = CatalogProduct & { quantity: number; delivered: number };
type LoadedDelivery = {
  delivery: { _id: string; version: number; status: string; completedAt?: string }
  orderNumbers: string[]
  orderId: string | null
  lines: ReceiptLine[]
}

/**
 * Receipt confirmation for a real delivery. The products and quantities come from the delivery record (joined with
 * the order for names/units); "Confirm full receipt" and "Report an issue" both call
 * POST /store/deliveries/:id/receipt, so the receipt is actually saved.
 */
export function ReceiptFlowPage({
      business,
      state,
      onStateChange,
      onBack,
      onHome,
      onViewOrder,
      deliveryId,
    }: {
          deliveryId?: string
          orderId?: string
          business: "fresh" | "style" | "tech"
          state: ReceiptFlowState
          onStateChange: (state: ReceiptFlowState) => void
          onBack: () => void
          onHome: () => void
          onViewOrder: (withIssue: boolean, orderId: string | null) => void
            onOpenOrder?: (id: string, view: string, state: string) => void
            onBusinessChange?: (b: "fresh" | "style" | "tech") => void
        }) {
    const [loaded, setLoaded] = useState<LoadedDelivery | null>(null);
    const [loadError, setLoadError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [received, setReceived] = useState<Record<string, number>>({});
    const [issueTypes, setIssueTypes] = useState<Record<string, ReceiptIssueType>>({});
    const [damaged, setDamaged] = useState<Record<string, number>>({});
    const [issueSearch, setIssueSearch] = useState("");
    const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
    const [remark, setRemark] = useState("");
    const [photoAdded, setPhotoAdded] = useState(false);
    const [recordedAt, setRecordedAt] = useState<string | null>(null);

    useEffect(() => {
      if (!deliveryId) { setLoadError("No delivery selected."); return }
      let cancelled = false
      void (async () => {
        const { delivery } = await storeDeliveryApi.get(deliveryId)
        const orderIds = [...new Set(delivery.items.flatMap((item) => item.orderIds.map(String)))]
        const orders = await Promise.all(orderIds.map((id) => getOrder(id)))
        const meta = new Map(orders.flatMap((order) => order.items.map((item) => [item.sku, { name: item.name, unit: item.unit }] as const)))
        const lines: ReceiptLine[] = delivery.items.map((item) => ({
          id: item.sku, name: meta.get(item.sku)?.name ?? item.sku, unit: meta.get(item.sku)?.unit ?? "unit",
          quantity: item.expected, delivered: item.delivered ?? item.expected,
        }))
        if (cancelled) return
        setLoaded({ delivery: { _id: delivery._id, version: delivery.version, status: delivery.status, ...(delivery.completedAt ? { completedAt: delivery.completedAt } : {}) }, orderNumbers: orders.map((o) => o.orderNumber), orderId: orderIds[0] ?? null, lines })
        setReceived(Object.fromEntries(lines.map((line) => [line.id, line.delivered])))
        setIssueTypes(Object.fromEntries(lines.map((line) => [line.id, "good" as ReceiptIssueType])))
        setDamaged({})
      })().catch((err) => { if (!cancelled) setLoadError(err instanceof Error ? err.message : "Unable to load the delivery.") })
      return () => { cancelled = true }
    }, [deliveryId]);

    const lines = loaded?.lines ?? [];
    const alreadyReceipted = loaded ? !["delivered", "failed"].includes(loaded.delivery.status) : false;
    const success = state === "confirmed" || state === "confirmed-issue";
    const issueLines = lines.filter((line) => (issueTypes[line.id] ?? "good") !== "good");

    async function submit(result: "full" | "issue") {
      if (!loaded) return
      setSubmitting(true); setSubmitError("")
      try {
        const itemOutcomes = lines.map((line) => ({
          sku: line.id,
          received: result === "full" ? line.delivered : (received[line.id] ?? line.delivered),
          ...(result === "issue" && (issueTypes[line.id] ?? "good") !== "good" ? { issueType: issueTypes[line.id] as string } : {}),
        }))
        const damagedNotes = lines.filter((line) => (damaged[line.id] ?? 0) > 0).map((line) => `${line.name}: ${damaged[line.id]} damaged`)
        const text = [remark.trim(), ...damagedNotes].filter(Boolean).join(" · ")
        const saved = await storeDeliveryApi.submitReceipt(loaded.delivery, { result, itemOutcomes, ...(text ? { remark: text } : {}) })
        setRecordedAt((saved as { receipt?: { confirmedAt?: string } }).receipt?.confirmedAt ?? new Date().toISOString())
        onStateChange(result === "full" ? "confirmed" : "confirmed-issue")
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "The receipt could not be saved.")
      } finally {
        setSubmitting(false)
      }
    }

    const orderLabel = loaded?.orderNumbers.join(", ") ?? "";
    return (
    <div className="receipt-flow-page">
      <div className="order-detail-utility-row">
        <button className="order-back-link" type="button" onClick={onBack}>
          <ArrowLeft />
          Back to order
        </button>
      </div>

      {loadError && <p role="alert" style={{ padding: "0 24px", color: "var(--critical-500)" }}>{loadError}</p>}
      {!loaded && !loadError && <p style={{ padding: "0 24px", color: "var(--text-secondary)" }}>Loading delivery…</p>}
      {alreadyReceipted && !success && <p role="status" style={{ padding: "0 24px", color: "var(--text-secondary)" }}>A receipt has already been recorded for this delivery.</p>}
      {submitError && <p role="alert" style={{ padding: "0 24px", color: "var(--critical-500)" }}>{submitError}</p>}

      {loaded && !success && !alreadyReceipted && (
        <div className="receipt-page-header">
          <div>
            <span className="page-kicker">{orderLabel} · {formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh"))}</span>
            <div className="page-title">
              {state === "verify"
                ? "Verify delivery"
                : state === "full"
                  ? "Confirm full receipt"
                  : state === "issue-review"
                    ? "Review delivery issues"
                    : "Verify delivery issues"}
            </div>
            <p>{loaded.delivery.completedAt ? `Driver completed delivery at ${clockTime(loaded.delivery.completedAt)}.` : "Confirm what arrived at the store."}</p>
          </div>
          <StatusPill kind="awaiting" />
        </div>
      )}

      {loaded && !alreadyReceipted && (
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
            <ReceiptReadOnlySummary lines={lines} />
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
                  <small>All delivered quantities will be confirmed.</small>
                </div>
              </div>
              <ReceiptGoodRows lines={lines} />
            </section>
            <aside className="receipt-commit-panel">
              <CheckCircle2 />
              <strong>Everything matches the order</strong>
              <p>No remark or photo is required.</p>
              <Button disabled={submitting} onClick={() => void submit("full")}>
                {submitting ? "Saving…" : "Confirm full receipt"}
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
              {lines.filter(p => p.name.toLowerCase().includes(issueSearch.toLowerCase())).map((product) => (
                <ReceiptIssueRow
                  key={product.id}
                  business={business}
                  product={product}
                  received={received[product.id] ?? product.delivered}
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
                <Button disabled={!issueLines.length && !remark.trim()} onClick={() => onStateChange("issue-review")}>
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
                {issueLines.map((line) => {
                  const got = received[line.id] ?? line.delivered
                  const type = issueTypes[line.id] ?? "good"
                  return (
                    <div key={line.id}>
                      <strong>{line.name}</strong>
                      <span>Expected: {line.quantity} {pluralizeUnit(line.unit, line.quantity)}</span>
                      <span>Received: {got} {pluralizeUnit(line.unit, got)}</span>
                      <b>
                        {type === "missing" ? `${Math.max(0, line.quantity - got)} ${pluralizeUnit(line.unit, Math.max(0, line.quantity - got))} missing`
                          : type === "damaged" ? `${damaged[line.id] ?? 0} damaged`
                          : type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ")}
                      </b>
                    </div>
                  )
                })}
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
              <Button disabled={submitting} onClick={() => void submit("issue")}>
                {submitting ? "Saving…" : "Confirm receipt with issue"}
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
      </AnimatePresence>
      )}

      {success && (
        <ReceiptConfirmationState
          key={state}
          orderId={orderLabel}
          withIssue={state === "confirmed-issue"}
          issueSummary={issueLines.map((line) => `${line.name}: ${issueTypes[line.id]}`).join(" · ")}
          products={lines.length}
          units={lines.reduce((sum, line) => sum + line.delivered, 0)}
          recordedAt={recordedAt}
          onViewOrder={() => onViewOrder(state === "confirmed-issue", loaded?.orderId ?? null)}
          onHome={onHome}
        />
      )}
    </div>
    )
}

export function ReceiptReadOnlySummary({ lines }: { lines: ReceiptLine[] }) {
    return (
    <div className="receipt-order-summary">
      <div className="receipt-panel-heading">
        <div>
          <span>Delivered products</span>
          <small>What the driver was expected to deliver.</small>
        </div>
        <span>{lines.length} product{lines.length === 1 ? "" : "s"} · {lines.reduce((sum, line) => sum + line.quantity, 0)} units</span>
      </div>
      <div className="receipt-summary-rows">
        {lines.map((product) => (
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

export function ReceiptGoodRows({ lines }: { lines: ReceiptLine[] }) {
    return (
    <div className="receipt-good-list">
      {lines.map((product) => (
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
              {product.delivered} / {product.quantity}{" "}
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
      issueSummary,
      products,
      units,
      recordedAt,
      onViewOrder,
      onHome,
    }: {
          orderId?: string
          withIssue: boolean
          issueSummary: string
          products: number
          units: number
          recordedAt: string | null
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
          <span>
            <strong>{products} product{products === 1 ? "" : "s"}</strong>
            <small>{withIssue ? "delivered" : "received"}</small>
          </span>
          <span>
            <strong>{units} units</strong>
            <small>{withIssue ? "driver recorded" : "confirmed"}</small>
          </span>
          <span>
            <strong>{clockTime(recordedAt)}</strong>
            <small>{withIssue ? "recorded" : "confirmed"}</small>
          </span>
        </div>
        <div className="receipt-confirmation-message">
          {withIssue
            ? `The issue has been sent to the dispatcher for review.${issueSummary ? ` (${issueSummary})` : ""}`
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
