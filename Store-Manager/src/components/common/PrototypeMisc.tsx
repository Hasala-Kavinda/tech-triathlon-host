import { ChevronUp, ChevronDown, AlertTriangle, Clock3, ReceiptText, Truck, PackageOpen, Check, Search, X, ArrowRight, Plus, CheckCircle2, PackageCheck, CircleAlert, Home, ShoppingBag, Menu } from "lucide-react";
import {  AnimatePresence, motion  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { formatOrderType, getDefaultOrderType, formatOutlet } from "../../lib/utils";
import { type StatusKind } from "../../types/store";
import { OutletIdentity, BrandMark } from "../layout/TopBar";
import {  IconButton, Button  } from './Button';
import { QuantityControl } from "./QuantityControl";
import {  StatusPill  } from './StatusPill';
import { timelineSteps, statusDetails, calmSpring, overlaySpring, navigation } from "../../lib/constants";

export function Section({
      eyebrow,
      title,
      description,
      children,
    }: {
          eyebrow: string
          title: string
          description?: string
          children: ReactNode
        }) {
    const [expanded, setExpanded] = useState(true);
    return (
    <section className="showcase-section">
      <div className="section-heading">
        <div className="section-heading-copy">
          <span className="eyebrow">{eyebrow}</span>
          <div className="section-title">{title}</div>
          {description && <p>{description}</p>}
        </div>
        <IconButton
          label={expanded ? `Collapse ${title}` : `Expand ${title}`}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </IconButton>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className="section-body"
            initial={{ height: 0, opacity: 0, y: -6 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -6 }}
            transition={calmSpring}
          >
            <div className="section-body-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
    )
}

export function ExampleCard({
      title,
      caption,
      children,
      wide = false,
    }: {
          title: string
          caption?: string
          children: ReactNode
          wide?: boolean
        }) {
    return (
    <div className={`example-card ${wide ? "example-card--wide" : ""}`}>
      <div className="example-card-header">
        <span>{title}</span>
        {caption && <small>{caption}</small>}
      </div>
      <div className="example-card-content">{children}</div>
    </div>
    )
}

export function DeliveryCard({ business = "fresh" }: { business?: "fresh" | "style" | "tech" }) {
    return (
    <div className="delivery-card">
      <div className="delivery-card-top">
        <div>
          <span className="data-id">ORD-1045</span>
          <div className="card-title">{formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh"))}</div>
        </div>
        <StatusPill kind="transit" />
      </div>
      <div className="delivery-details">
        <div>
          <span className="field-label">Expected arrival</span>
          <strong className="eta-inline">06:40–07:00</strong>
        </div>
        <div>
          <span className="field-label">Target date</span>
          <strong>Wed, 30 Sep</strong>
        </div>
      </div>
    </div>
    )
}

export function CutoffBanner({ closed = false }: { closed?: boolean }) {
    return (
    <motion.div
      className={`cutoff-banner ${closed ? "cutoff-banner--closed" : ""}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={calmSpring}
    >
      <span className="banner-icon">
        {closed ? <AlertTriangle /> : <Clock3 />}
      </span>
      <div>
        <strong>
          {closed ? "Next-day ordering closed" : "2h 14m until next-day cutoff"}
        </strong>
        <p>
          {closed
            ? "Orders submitted now will enter the following planning run."
            : "Orders submitted before 4:00 PM can enter tomorrow’s planning run."}
        </p>
      </div>
    </motion.div>
    )
}

export function AttentionCard({ highlighted = false, onOpen }: { highlighted?: boolean, onOpen?: () => void }) {
    return (
    <motion.div
      className={`attention-card ${
        highlighted ? "attention-card--highlighted" : ""
      }`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, scale: highlighted ? 1.006 : 1 }}
      transition={calmSpring}
    >
      <span className="attention-icon">
        <ReceiptText />
      </span>
      <div className="attention-copy">
        <strong>Delivery awaiting confirmation</strong>
        <p>
          <span className="data-id">ORD-1045</span> · Driver completed delivery
          at 06:52.
        </p>
        <small>Confirm the received quantities when ready.</small>
      </div>
      <Button tone="secondary" onClick={onOpen}>Review delivery</Button>
    </motion.div>
    )
}

export function EtaBlock() {
    return (
    <div className="eta-block">
      <span className="eta-icon">
        <Truck />
      </span>
      <div>
        <span className="field-label">Expected arrival</span>
        <strong className="eta-time">06:40–07:00</strong>
        <span className="eta-date">Wednesday, 30 September</span>
      </div>
    </div>
    )
}

export function ProductRow() {
    const [quantity, setQuantity] = useState(20);
    return (
    <div className="product-row">
      <span className="product-icon">
        <PackageOpen />
      </span>
      <div className="product-copy">
        <strong>Rice</strong>
        <small>Unit: bag</small>
      </div>
      <QuantityControl value={quantity} onChange={setQuantity} />
    </div>
    )
}

export function VerificationRow({
      state,
      received,
    }: {
          state: "good" | "missing" | "damaged"
          received: number
        }) {
    const statusLabel = state === "good" ? "Good" : state === "missing" ? "2 missing" : "1 damaged";
    return (
    <div className="verification-row">
      <span className="product-icon product-icon--small">
        <PackageOpen />
      </span>
      <div className="verification-name">
        <strong>Milk</strong>
        <small>Ordered: 30 cartons</small>
      </div>
      <div className="verification-received">
        <span>Received</span>
        <strong>{received} cartons</strong>
      </div>
      <span className={`verification-status verification-status--${state}`}>
        {state === "good" ? <Check /> : <AlertTriangle />}
        {statusLabel}
      </span>
    </div>
    )
}

export function Lifecycle({
      deferred = false,
      interactive = false,
    }: {
          deferred?: boolean
          interactive?: boolean
        }) {
    const [currentStep, setCurrentStep] = useState(2);
    return (
    <div className="lifecycle-demo">
      <div className="lifecycle">
        {timelineSteps.map((step, index) => {
          const mode =
            deferred && index === 2
              ? "exception"
              : index < currentStep
                ? "complete"
                : index === currentStep
                  ? "current"
                  : "future"
          return (
            <motion.div
              className={`lifecycle-step lifecycle-step--${mode}`}
              key={step}
              layout
              transition={calmSpring}
            >
              <motion.span
                className="step-marker"
                layout
                transition={calmSpring}
              >
                {mode === "complete" ? <Check /> : index + 1}
              </motion.span>
              <span className="step-label">
                {deferred && index === 2 ? "Deferred" : step}
              </span>
            </motion.div>
          )
        })}
      </div>
      {interactive && (
        <div className="lifecycle-controls">
          <span>Prototype state: {timelineSteps[currentStep]}</span>
          <Button
            tone="secondary"
            onClick={() =>
              setCurrentStep((step) => (step + 1) % timelineSteps.length)
            }
          >
            Advance status
          </Button>
        </div>
      )}
    </div>
    )
}

export function SearchField() {
    return (
    <label className="field">
      <span className="field-label">Search</span>
      <span className="input-wrap input-wrap--icon">
        <Search />
        <input placeholder="Search orders" />
      </span>
    </label>
    )
}

export function TextField({
      label,
      placeholder,
      state,
    }: {
          label: string
          placeholder: string
          state?: "error" | "disabled"
        }) {
    return (
    <label className={`field ${state ? `field--${state}` : ""}`}>
      <span className="field-label">{label}</span>
      <input disabled={state === "disabled"} placeholder={placeholder} />
      {state === "error" && (
        <small className="field-message">Enter a valid reference.</small>
      )}
    </label>
    )
}

export function FormExamples() {
    return (
    <div className="form-grid">
      <SearchField />
      <TextField label="Delivery reference" placeholder="Enter reference" />
      <label className="field">
        <span className="field-label">Order type</span>
        <span className="select-wrap">
          <select defaultValue="dry">
            <option value="dry">Dry groceries</option>
            <option value="chilled">Chilled / Frozen</option>
          </select>
          <ChevronDown />
        </span>
      </label>
      <TextField
        label="Purchase reference"
        placeholder="Required"
        state="error"
      />
      <TextField
        label="Outlet"
        placeholder={formatOutlet()}
        state="disabled"
      />
      <label className="field field--wide">
        <span className="field-label">Delivery note</span>
        <textarea placeholder="Add an optional note for this order" />
      </label>
      <label className="checkbox-field">
        <input type="checkbox" defaultChecked />
        <span className="checkbox-control">
          <Check />
        </span>
        <span>Send me a delivery status update</span>
      </label>
    </div>
    )
}

export function Dialog({ onClose }: { onClose: () => void }) {
    return (
    <motion.div
      className="dialog-backdrop"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <motion.div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={overlaySpring}
      >
        <div className="dialog-header">
          <div>
            <span className="dialog-title" id="dialog-title">
              Submit order?
            </span>
            <p>
              Review the order details before it enters tomorrow’s planning run.
            </p>
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <div className="dialog-summary">
          <span>
            <small>Order</small>
            <strong className="data-id">ORD-1045</strong>
          </span>
          <span>
            <small>Products</small>
            <strong>4 products · 80 units</strong>
          </span>
        </div>
        <div className="dialog-footer">
          <Button tone="secondary" onClick={onClose}>
            Back to edit
          </Button>
          <Button onClick={onClose}>Submit order</Button>
        </div>
      </motion.div>
    </motion.div>
    )
}

export function BottomSheet({ onClose }: { onClose: () => void }) {
    return (
    <motion.div
      className="sheet-backdrop"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <motion.div
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={overlaySpring}
      >
        <span className="sheet-handle" />
        <div className="sheet-header">
          <div>
            <span className="dialog-title" id="sheet-title">
              Select issue reason
            </span>
            <p>Choose the reason that best describes the received goods.</p>
          </div>
          <IconButton label="Close bottom sheet" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <div className="reason-list">
          <button type="button">
            <PackageOpen />
            <span>
              <strong>Items missing</strong>
              <small>Received quantity is lower than ordered.</small>
            </span>
            <ArrowRight />
          </button>
          <button type="button">
            <AlertTriangle />
            <span>
              <strong>Items damaged</strong>
              <small>Goods were damaged before receipt.</small>
            </span>
            <ArrowRight />
          </button>
        </div>
        <Button size="mobile" onClick={onClose}>
          Continue
        </Button>
      </motion.div>
    </motion.div>
    )
}

export function MobileShellPreview() {
    return (
    <div className="phone-frame">
      <div className="phone-status">
        <span>9:41</span>
        <span>● ● ●</span>
      </div>
      <div className="phone-header">
        <OutletIdentity business="fresh" />
        <span className="avatar">DF</span>
      </div>
      <div className="phone-content">
        <span className="eyebrow">Mobile shell</span>
        <div className="phone-title">Clear actions at the counter</div>
        <p>
          Important outlet information stays readable and focused on one task at
          a time.
        </p>
        <CutoffBanner />
        <DeliveryCard business="fresh" />
      </div>
      <div className="phone-sticky-action">
        <Button size="mobile" icon={<Plus />}>
          New order
        </Button>
      </div>
      <div className="phone-bottom-nav">
        {navigation.map(({ label, icon: Icon }, index) => (
          <span className={index === 0 ? "selected" : ""} key={label}>
            <Icon />
            {label}
          </span>
        ))}
      </div>
    </div>
    )
}

export function FoundationsPage() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [attentionHighlighted, setAttentionHighlighted] = useState(false);
    return (
    <div className="">
      <div className="page-header">
        <div>
          <span className="page-kicker">Store Manager · Phase 1</span>
          <div className="page-title">Interface foundations</div>
          <p>
            Shared shell, responsive patterns and operational components for
            {formatOutlet()}.
          </p>
        </div>
        <div className="page-actions">
          <span className="foundation-badge">
            <CheckCircle2 />
            Daylight system
          </span>
          <Button icon={<Plus />}>New order</Button>
        </div>
      </div>

      <div className="principle-strip">
        <span>
          <CheckCircle2 />
          Outlet-specific
        </span>
        <span>
          <PackageCheck />
          Review before commitment
        </span>
        <span>
          <CircleAlert />
          Important states stay visible
        </span>
      </div>

      <Section
        eyebrow="01 · Foundations"
        title="Shell and responsive structure"
        description="A restrained desktop workspace paired with a thumb-friendly mobile layout."
      >
        <div className="shell-showcase">
          <div className="shell-note">
            <div className="mini-shell">
              <div className="mini-sidebar">
                <BrandMark compact />
                <span className="mini-nav-selected">
                  <Home /> Home
                </span>
                <span>
                  <ShoppingBag /> Orders
                </span>
                <span>
                  <Truck /> Deliveries
                </span>
              </div>
              <div className="mini-workspace">
                <div className="mini-topbar">
                  <OutletIdentity business="fresh" />
                  <span className="avatar">DF</span>
                </div>
                <div className="mini-content">
                  <span className="skeleton skeleton--title" />
                  <span className="skeleton skeleton--text" />
                  <div className="mini-card-row">
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </div>
            <div className="shell-caption">
              <span className="eyebrow">Desktop · 1280–1440</span>
              <strong>Compact navigation, fixed outlet context</strong>
              <p>
                Store managers see only Home, Orders and Deliveries. The
                account’s outlet is visible, but is not a global selector.
              </p>
            </div>
          </div>
          <div className="mobile-preview-wrap">
            <MobileShellPreview />
            <div className="shell-caption">
              <span className="eyebrow">Mobile · 390</span>
              <strong>One-column, action-first layout</strong>
              <p>
                Persistent bottom navigation and an optional 56px sticky action.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section
        eyebrow="02 · Actions"
        title="Buttons and interaction states"
        description="Primary actions are cobalt; issue actions are reserved for genuine exceptions."
      >
        <div className="nav-state-preview">
          <span className="nav-state-label">
            Navigation · idle / hover / selected
          </span>
          <div className="nav-state-items">
            <span className="nav-state-item">
              <ShoppingBag />
              Orders
              <small>Idle</small>
            </span>
            <span className="nav-state-item nav-state-item--hover">
              <Truck />
              Deliveries
              <small>Hover</small>
            </span>
            <span className="nav-state-item nav-state-item--selected">
              <Home />
              Home
              <small>Selected</small>
            </span>
          </div>
        </div>
        <div className="example-grid example-grid--three">
          <ExampleCard
            title="Primary"
            caption="Default · hover · pressed · disabled"
          >
            <div className="component-row">
              <Button>Continue</Button>
              <Button className="button-demo-hover">Continue</Button>
              <Button className="button-demo-pressed">Continue</Button>
              <Button disabled>Continue</Button>
            </div>
          </ExampleCard>
          <ExampleCard title="Secondary">
            <div className="component-row">
              <Button tone="secondary">Back to edit</Button>
              <Button tone="secondary" className="button-demo-hover">
                Back to edit
              </Button>
              <Button tone="secondary" disabled>
                Back to edit
              </Button>
            </div>
          </ExampleCard>
          <ExampleCard title="Issue action">
            <div className="component-row">
              <Button tone="issue">Report an issue</Button>
              <Button tone="issue" className="button-demo-hover">
                Report an issue
              </Button>
            </div>
          </ExampleCard>
        </div>
      </Section>

      <Section
        eyebrow="03 · Shared status"
        title="Statuses, notices and expected arrival"
        description="Every state combines a label, icon and semantic colour."
      >
        <div className="example-grid">
          <ExampleCard
            title="Status pills"
            caption="Consistent across WayLink"
            wide
          >
            <div className="pill-collection">
              {(Object.keys(statusDetails) as StatusKind[]).map((kind) => (
                <StatusPill kind={kind} key={kind} />
              ))}
            </div>
          </ExampleCard>
          <ExampleCard
            title="Expected arrival"
            caption="High-priority information"
          >
            <EtaBlock />
          </ExampleCard>
          <ExampleCard title="Before cutoff">
            <CutoffBanner />
          </ExampleCard>
          <ExampleCard
            title="After cutoff"
            caption="Informational, not critical"
          >
            <CutoffBanner closed />
          </ExampleCard>
          <ExampleCard title="Attention card" caption="Idle · highlighted" wide>
            <div className="state-preview-toolbar">
              <span>
                {attentionHighlighted
                  ? "Highlighted state draws focus without becoming critical."
                  : "Idle state remains visible and calm."}
              </span>
              <Button
                tone="secondary"
                onClick={() => setAttentionHighlighted((value) => !value)}
              >
                {attentionHighlighted ? "Show idle" : "Highlight card"}
              </Button>
            </div>
            <AttentionCard highlighted={attentionHighlighted} />
          </ExampleCard>
        </div>
      </Section>

      <Section
        eyebrow="04 · Operational records"
        title="Cards, rows and lifecycle"
        description="Reusable record patterns keep order and delivery information consistent."
      >
        <div className="example-grid">
          <ExampleCard title="Order / delivery card">
            <DeliveryCard business="fresh" />
          </ExampleCard>
          <ExampleCard title="Product row" caption="Quantity is interactive">
            <ProductRow />
          </ExampleCard>
          <ExampleCard title="Delivery verification" wide>
            <div className="verification-list">
              <VerificationRow state="good" received={30} />
              <VerificationRow state="missing" received={28} />
              <VerificationRow state="damaged" received={29} />
            </div>
          </ExampleCard>
          <ExampleCard
            title="Lifecycle · current step progression"
            caption="Interactive prototype state"
            wide
          >
            <Lifecycle interactive />
          </ExampleCard>
          <ExampleCard title="Lifecycle · deferred exception" wide>
            <Lifecycle deferred />
          </ExampleCard>
        </div>
      </Section>

      <Section
        eyebrow="05 · Forms"
        title="Inputs and data entry"
        description="Visible focus, clear errors and readable disabled states support counter workflows."
      >
        <ExampleCard title="Form controls" wide>
          <FormExamples />
        </ExampleCard>
      </Section>

      <Section
        eyebrow="06 · Overlays"
        title="Review and selection patterns"
        description="Desktop uses focused dialogs; mobile uses thumb-friendly bottom sheets."
      >
        <div className="overlay-launchers">
          <div>
            <span className="overlay-icon">
              <ReceiptText />
            </span>
            <div>
              <strong>Desktop review dialog</strong>
              <p>Use for review-before-commitment confirmations.</p>
              <span className="motion-state-tag">
                Closed · opens with scale + fade
              </span>
            </div>
            <Button tone="secondary" onClick={() => setDialogOpen(true)}>
              Preview dialog
            </Button>
          </div>
          <div>
            <span className="overlay-icon">
              <Menu />
            </span>
            <div>
              <strong>Mobile bottom sheet</strong>
              <p>Use for compact reason, selection and review tasks.</p>
              <span className="motion-state-tag">
                Closed · opens with spring rise
              </span>
            </div>
            <Button tone="secondary" onClick={() => setSheetOpen(true)}>
              Preview sheet
            </Button>
          </div>
        </div>
      </Section>

      <AnimatePresence>
        {dialogOpen && <Dialog onClose={() => setDialogOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {sheetOpen && <BottomSheet onClose={() => setSheetOpen(false)} />}
      </AnimatePresence>
    </div>
    )
}
