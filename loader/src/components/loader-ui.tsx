import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  CloudOff,
  Flag,
  Hammer,
  Info,
  LoaderCircle,
  LogOut,
  MapPin,
  Minus,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Route,
  Scale,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
  Warehouse,
  Waypoints,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import type { LoadTiming } from "../data/mock-data"

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

type TextVariant = "display" | "h1" | "h2" | "h3" | "body" | "body-strong" | "label" | "caption" | "data"

type TextTag = "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "label"

export function Text({
  as = "p",
  children,
  className,
  variant = "body",
}: {
  as?: TextTag
  children: ReactNode
  className?: string
  variant?: TextVariant
}) {
  return createElement(
    as,
    { className: cx("text", `text--${variant}`, className) },
    children,
  )
}

export function WayLinkMark() {
  return (
    <div className="waylink-mark" aria-label="WayLink">
      <div className="waylink-mark__symbol" aria-hidden="true">
        <Waypoints />
      </div>
      <Text as="span" variant="h3" className="waylink-mark__word">
        WayLink
      </Text>
    </div>
  )
}

type ButtonVariant = "primary" | "secondary" | "success" | "critical"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon
  iconPosition?: "start" | "end"
  size?: "standard" | "large"
  variant?: ButtonVariant
}

export function Button({
  children,
  className,
  icon: Icon,
  iconPosition = "start",
  size = "standard",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        "button",
        `button--${variant}`,
        `button--${size}`,
        className,
      )}
      type={type}
      {...props}
    >
      {Icon && iconPosition === "start" ? <Icon aria-hidden="true" /> : null}
      <span>{children}</span>
      {Icon && iconPosition === "end" ? <Icon aria-hidden="true" /> : null}
    </button>
  )
}

type StatusVariant = "online" | "loaded" | "missing" | "damaged" | "offline" | "in-progress" | "synced" | "changed" | "normal" | "urgent"

const statusConfig: Record<StatusVariant, {
  icon: LucideIcon
  label: string
  tone: string
}> = {
  online: { icon: Circle, label: "Online", tone: "success" },
  loaded: { icon: CheckCircle2, label: "Loaded", tone: "success" },
  missing: { icon: XCircle, label: "Missing", tone: "critical" },
  damaged: { icon: Hammer, label: "Damaged", tone: "warning" },
  offline: { icon: CloudOff, label: "Offline", tone: "warning" },
  "in-progress": {
    icon: LoaderCircle,
    label: "In progress",
    tone: "action",
  },
  synced: { icon: ShieldCheck, label: "Synced", tone: "success" },
  changed: { icon: AlertTriangle, label: "Changed", tone: "warning" },
  normal: { icon: Check, label: "Normal", tone: "neutral" },
  urgent: { icon: Clock3, label: "Urgent", tone: "warning" },
}

export function StatusPill({
  label,
  variant,
}: {
  label?: string
  variant: StatusVariant
}) {
  const config = statusConfig[variant]
  const Icon = config.icon

  return (
    <span className={cx("status-pill", `status-pill--${config.tone}`)}>
      <Icon aria-hidden="true" />
      <span>{label ?? config.label}</span>
    </span>
  )
}

export type ConnectivityState = "online" | "offline" | "syncing" | "synced"

const connectivityConfig: Record<ConnectivityState, {
  description: string
  icon: LucideIcon
  label: string
  tone: string
}> = {
  online: {
    description: "Connected to WayLink",
    icon: Circle,
    label: "Online",
    tone: "success",
  },
  offline: {
    description: "Changes saved on device",
    icon: AlertTriangle,
    label: "Offline",
    tone: "warning",
  },
  syncing: {
    description: "Syncing changes…",
    icon: RefreshCw,
    label: "Syncing",
    tone: "action",
  },
  synced: {
    description: "All changes synced",
    icon: CheckCircle2,
    label: "Synced",
    tone: "success",
  },
}

export function ConnectivityIndicator({
  compact = false,
  detail,
  state,
}: {
  compact?: boolean
  detail?: string
  state: ConnectivityState
}) {
  const config = connectivityConfig[state]
  const Icon = config.icon

  return (
    <div
      className={cx(
        "connectivity",
        `connectivity--${config.tone}`,
        compact && "connectivity--compact",
      )}
      role="status"
    >
      <div className="connectivity__icon">
        <Icon
          aria-hidden="true"
          className={state === "syncing" ? "icon-spin" : undefined}
        />
      </div>
      <div className="connectivity__copy">
        <Text as="span" variant="label">
          {config.label}
        </Text>
        {compact && detail ? (
          <Text as="span" variant="caption">
            · {detail}
          </Text>
        ) : null}
        {!compact ? (
          <Text as="span" variant="caption">
            {config.description}
          </Text>
        ) : null}
      </div>
    </div>
  )
}

export function LoaderIdentity() {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return (
    <div className="loader-identity" ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="loader-identity__trigger"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="loader-identity__avatar" aria-hidden="true">
          KK
        </span>
        <span className="loader-identity__summary">
          <Text as="span" variant="label">
            Kasun Perera
          </Text>
          <Text as="span" variant="caption">
            Loader
          </Text>
        </span>
        <ChevronDown aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="identity-menu" role="menu">
          <div className="identity-menu__header">
            <span className="identity-menu__avatar" aria-hidden="true">
              KK
            </span>
            <div>
              <Text variant="body-strong">Kasun Perera</Text>
              <Text variant="caption">Loader · Bay 03</Text>
            </div>
          </div>
          <div className="identity-menu__device">
            <UserRound aria-hidden="true" />
            <div>
              <Text variant="label">Shared warehouse tablet</Text>
              <Text variant="caption">Keep your session secure</Text>
            </div>
          </div>
          <button
            className="identity-menu__action"
            role="menuitem"
            type="button"
          >
            <LogOut aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}

type CardVariant = "standard" | "information" | "exception" | "work"

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "standard" | "compact"
  variant?: CardVariant
}

export function Card({
  children,
  className,
  padding = "standard",
  variant = "standard",
  ...props
}: CardProps) {
  return (
    <div
      className={cx(
        "card",
        `card--${variant}`,
        `card--padding-${padding}`,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export type WorkCardState = "available" | "claiming" | "claimed" | "unavailable" | "completed" | "completed-other"

export interface WorkCardProps {
  departure: string
  disabled?: boolean
  disabledReason?: string
  items: number
  onClaim?: () => void
  onOpen?: () => void
  priority: "normal" | "urgent"
  route: string
  state?: WorkCardState
  stops: number
  unavailableReason?: string
  vehicle: string
  weight: string
  timing?: LoadTiming
}

export function CompletionVarianceBadge({ finalVariance }: { finalVariance: number }) {
  const isEarly = finalVariance >= 0
  const absVariance = Math.abs(finalVariance)
  const m = Math.floor(absVariance / 60000)
  const s = Math.floor((absVariance % 60000) / 1000)
  const formatted = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  const sign = isEarly ? "+" : "-"
  
  const tone = isEarly ? "success" : "critical"

  return (
    <span className={cx("status-pill", `status-pill--${tone}`)}>
      {isEarly ? (
        <span aria-hidden="true" className="lucide">✓</span>
      ) : (
        <AlertTriangle aria-hidden="true" />
      )}
      <span>{sign}{formatted}</span>
    </span>
  )
}

export function LoadDepartureTimer({ timing }: { timing: LoadTiming }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (timing.finalVariance !== undefined) return

    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [timing.finalVariance])

  if (timing.finalVariance !== undefined) {
    return (
      <div className="load-departure-timer load-departure-timer--completed">
        <Text variant="caption">COMPLETED</Text>
        <CompletionVarianceBadge finalVariance={timing.finalVariance} />
      </div>
    )
  }

  const diff = timing.departureAt - now
  const isPast = diff < 0
  const absDiff = Math.abs(diff)
  const m = Math.floor(absDiff / 60000)
  const s = Math.floor((absDiff % 60000) / 1000)
  const formatted = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`

  return (
    <div className="load-departure-timer">
      <Text variant="caption">TIME LEFT</Text>
      <Text variant="data" className={isPast ? "text-critical" : ""}>
        {isPast ? `-${formatted}` : formatted}
      </Text>
    </div>
  )
}

export function WorkCard({
  departure,
  disabled = false,
  disabledReason,
  items,
  onClaim,
  onOpen,
  priority,
  route,
  state = "available",
  stops,
  unavailableReason = "This load has already been claimed by another loader.",
  vehicle,
  weight,
  timing,
}: WorkCardProps) {
  const isClaimed = state === "claimed"
  const isUnavailable = state === "unavailable"
  const isClaiming = state === "claiming"

  return (
    <Card variant="work" className={cx("work-card", `work-card--${state}`)}>
      <div className="work-card__identity">
        <div className="work-card__vehicle">
          <div className="work-card__vehicle-icon">
            <Truck aria-hidden="true" />
          </div>
          <div>
            <Text variant="caption">Outbound load case</Text>
            <Text variant="data" className="work-card__vehicle-number">
              {vehicle}
            </Text>
          </div>
        </div>
        <div className="work-card__priority">
          <Text variant="caption">Priority</Text>
          <StatusPill variant={priority} />
        </div>
      </div>
      <div className="work-card__route">
        <MapPin aria-hidden="true" />
        <div>
          <Text variant="caption">Route</Text>
          <Text as="h3" variant="h3">
            {route}
          </Text>
        </div>
      </div>
      <div className="work-card__metrics">
        <div>
          <Route aria-hidden="true" />
          <Text variant="caption">Stops</Text>
          <Text variant="data">{stops}</Text>
        </div>
        <div>
          <PackageCheck aria-hidden="true" />
          <Text variant="caption">Items</Text>
          <Text variant="data">{items}</Text>
        </div>
        <div>
          <Scale aria-hidden="true" />
          <Text variant="caption">Weight</Text>
          <Text variant="data">{weight}</Text>
        </div>
      </div>
      <div className="work-card__departure">
        <div>
          <Clock3 aria-hidden="true" />
          <div>
            <Text variant="caption">Departure</Text>
            <Text variant="data">{departure}</Text>
          </div>
        </div>
        {timing ? (
          <div className="work-card__timer">
            <LoadDepartureTimer timing={timing} />
          </div>
        ) : null}
      </div>
      <div className="work-card__action">
        {isClaimed ? (
          <>
            <StatusPill variant="loaded" label="Claimed by you" />
            <Button
              variant="success"
              size="large"
              icon={ArrowRight}
              iconPosition="end"
              onClick={onOpen}
            >
              Open load
            </Button>
          </>
        ) : isUnavailable ? (
          <>
            <StatusPill variant="changed" label="Already assigned" />
            <Text variant="caption">{unavailableReason}</Text>
            <Button disabled size="large">
              Already assigned
            </Button>
          </>
        ) : state === "completed" ? (
          <>
            <StatusPill variant="loaded" label="Claimed by you" />
            <div className="work-card__completed-note">
              <CheckCircle2 className="icon-success" aria-hidden="true" />
              <Text variant="body-strong" className="text-success">Completed</Text>
            </div>
            <Button disabled size="large" variant="secondary">
              Completed
            </Button>
          </>
        ) : state === "completed-other" ? (
          <>
            <div className="work-card__completed-note">
              <CheckCircle2 className="icon-success" aria-hidden="true" />
              <Text variant="body-strong" className="text-success">Completed by another loader</Text>
            </div>
            <Text variant="caption">This load was completed by another loader.</Text>
            <Button disabled size="large" variant="secondary">
              Completed
            </Button>
          </>
        ) : (
          <>
            {disabledReason ? (
              <Text variant="caption">{disabledReason}</Text>
            ) : null}
            <Button
              disabled={disabled || isClaiming}
              variant="primary"
              size="large"
              icon={isClaiming ? RefreshCw : Package}
              onClick={onClaim}
            >
              {isClaiming ? "Claiming load…" : "Claim load"}
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}

export type LoadItemStatus = "pending" | "loaded" | "flagged"

export type ExceptionType = "missing" | "damaged"

export type LoadItemException = {
  affectedQuantity: number
  note?: string
  pendingSync: boolean
  reason: string
  type: ExceptionType
  unit: string
}

export type LoadItemData = {
  exception?: LoadItemException
  id: string
  name: string
  quantity: string
  status: LoadItemStatus
}

function formatQuantity(amount: number, unit: string) {
  return `${amount} ${amount === 1 ? unit.replace(/s$/, "") : unit}`
}

export function LoadItem({
  item,
  onFlag,
  onMarkLoaded,
}: {
  item: LoadItemData
  onFlag: () => void
  onMarkLoaded: () => void
}) {
  return (
    <div className={`load-item load-item--${item.status}`}>
      <div className="load-item__product">
        <div className="load-item__icon" aria-hidden="true">
          <Package />
        </div>
        <div>
          <Text variant="body-strong">{item.name}</Text>
          <Text variant="data">{item.quantity}</Text>
        </div>
      </div>
      <div className="load-item__state">
        {item.status === "loaded" ? (
          <StatusPill variant="loaded" />
        ) : item.status === "flagged" ? (
          <div className="load-item__exception-state">
            <StatusPill
              variant="changed"
              label={
                item.exception?.pendingSync
                  ? "Flagged · Pending sync"
                  : "Flagged"
              }
            />
            <Text variant="caption">
              {item.exception
                ? `${formatQuantity(
                    item.exception.affectedQuantity,
                    item.exception.unit,
                  )} · ${item.exception.type.toUpperCase()}`
                : "Exception recorded"}
            </Text>
          </div>
        ) : (
          <StatusPill variant="normal" label="Pending" />
        )}
      </div>
      <div className="load-item__actions">
        {item.status === "pending" ? (
          <Button variant="primary" icon={Check} onClick={onMarkLoaded}>
            Mark loaded
          </Button>
        ) : null}
        <Button
          variant="secondary"
          icon={Flag}
          onClick={onFlag}
          aria-label={`${
            item.status === "flagged" ? "Review flag for" : "Flag"
          } ${item.name}`}
        >
          {item.status === "flagged" ? "Review flag" : "Flag"}
        </Button>
      </div>
    </div>
  )
}

export function StopCard({
  deliveryWindow,
  isActive,
  isComplete,
  items,
  onFlagItem,
  onMarkLoaded,
  orderId,
  outlet,
  stopNumber,
}: {
  deliveryWindow: string
  isActive: boolean
  isComplete: boolean
  items: LoadItemData[]
  onFlagItem: (itemId: string) => void
  onMarkLoaded: (itemId: string) => void
  orderId: string
  outlet: string
  stopNumber: number
}) {
  const accountedItems = items.filter(
    (item) => item.status !== "pending",
  ).length
  const loadedItems = items.filter((item) => item.status === "loaded").length
  const flaggedItems = items.filter((item) => item.status === "flagged").length

  return (
    <section
      className={`stop-card ${isActive ? "stop-card--active" : ""} ${
        isComplete ? "stop-card--complete" : ""
      }`}
      id={`stop-${stopNumber}`}
      aria-labelledby={`stop-${stopNumber}-title`}
    >
      <div className="stop-card__header">
        <div className="stop-card__number" aria-hidden="true">
          <Text as="span" variant="caption">
            Stop
          </Text>
          <Text as="span" variant="data">
            {String(stopNumber).padStart(2, "0")}
          </Text>
        </div>
        <div className="stop-card__outlet">
          <div className="stop-card__title-row">
            <Text as="h2" variant="h2" className="stop-card__title">
              <span id={`stop-${stopNumber}-title`}>{outlet}</span>
            </Text>
            {isComplete ? (
              <StatusPill variant="loaded" label="Stop accounted" />
            ) : isActive ? (
              <StatusPill variant="in-progress" label="Next to load" />
            ) : null}
          </div>
          <div className="stop-card__meta">
            <span>
              <Clock3 aria-hidden="true" />
              <Text as="span" variant="label">
                Delivery · {deliveryWindow}
              </Text>
            </span>
            <span>
              <PackageCheck aria-hidden="true" />
              <Text as="span" variant="label">
                {accountedItems}/{items.length} accounted
              </Text>
            </span>
            <Text as="span" variant="caption" className="stop-card__breakdown">
              {loadedItems} loaded · {flaggedItems} flagged
            </Text>
          </div>
        </div>
      </div>
      <div className="stop-card__order">
        <div className="stop-card__order-heading">
          <Store aria-hidden="true" />
          <div>
            <Text variant="caption">Order</Text>
            <Text variant="data">#{orderId}</Text>
          </div>
        </div>
        <Text variant="caption">
          {items.length} {items.length === 1 ? "item" : "items"}
        </Text>
      </div>
      <div className="stop-card__items">
        {items.map((item) => (
          <LoadItem
            item={item}
            key={item.id}
            onFlag={() => onFlagItem(item.id)}
            onMarkLoaded={() => onMarkLoaded(item.id)}
          />
        ))}
      </div>
    </section>
  )
}

const missingReasons = ["Stock unavailable", "Short quantity", "Cannot locate"]

const damagedReasons = [
  "Damaged during handling",
  "Damaged before loading",
  "Packaging damaged",
]

function parseExpectedQuantity(quantity: string) {
  const match = quantity.match(/^(\d+(?:\.\d+)?)\s*(.*)$/)
  return {
    amount: match ? Number(match[1]) : 1,
    unit: match?.[2] || "item",
  }
}

export function ExceptionSheet({
  isOffline,
  item,
  onClose,
  onSave,
}: {
  isOffline: boolean
  item: LoadItemData
  onClose: () => void
  onSave: (exception: LoadItemException) => void
}) {
  const expected = parseExpectedQuantity(item.quantity)
  const [type, setType] = useState<ExceptionType | null>(
    item.exception?.type ?? null,
  )
  const [affectedQuantity, setAffectedQuantity] = useState(
    item.exception?.affectedQuantity ?? 1,
  )
  const [reason, setReason] = useState(item.exception?.reason ?? "")
  const [note, setNote] = useState(item.exception?.note ?? "")
  const [quantityError, setQuantityError] = useState<string | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  // Pin onClose in a ref so the overflow-lock effect never re-fires just
  // because the parent re-created the callback reference.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    sheetRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      // Always restore, even if the component is forcibly unmounted.
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKeyDown)
    }
  // Empty deps — runs once on mount, cleans up on unmount. Safe because
  // onClose is accessed through the stable ref above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reasons = type === "missing" ? missingReasons : damagedReasons
  const remaining = Math.max(expected.amount - affectedQuantity, 0)
  const quantityIsValid =
    affectedQuantity > 0 && affectedQuantity <= expected.amount
  const canSave = Boolean(type && reason && quantityIsValid)

  function selectType(nextType: ExceptionType) {
    setType(nextType)
    setReason("")
    setQuantityError(null)
  }

  function changeQuantity(delta: number) {
    const nextValue = affectedQuantity + delta
    if (nextValue < 1) {
      setQuantityError(
        `Quantity must be at least 1 ${expected.unit.replace(/s$/, "")}.`,
      )
      return
    }
    if (nextValue > expected.amount) {
      setQuantityError(
        `Quantity cannot exceed ${expected.amount} ${expected.unit}.`,
      )
      return
    }
    setAffectedQuantity(nextValue)
    setQuantityError(null)
  }

  function handleSave() {
    if (!type || !canSave) return
    onSave({
      affectedQuantity,
      note: note.trim() || undefined,
      pendingSync: isOffline,
      reason,
      type,
      unit: expected.unit,
    })
  }

  return (
    <div
      className="sheet-backdrop"
      onClick={(event) => {
        // Only close when the click originated AND ended on the backdrop itself
        // (not on a child element releasing a drag over the backdrop).
        if (event.target === event.currentTarget) onCloseRef.current()
      }}
    >
      <div
        aria-labelledby="exception-sheet-title"
        aria-modal="true"
        className="exception-sheet"
        ref={sheetRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="exception-sheet__handle" aria-hidden="true" />
        <div className="exception-sheet__header">
          <div>
            <Text variant="label">Flag item</Text>
            <Text as="h2" variant="h2" className="exception-sheet__title">
              <span id="exception-sheet-title">{item.name}</span>
            </Text>
            <Text variant="data">{item.quantity} expected</Text>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>

        <div className="exception-sheet__body">
          <section className="exception-form-section">
            <div className="exception-form-section__heading">
              <Text as="h3" variant="h3">
                What happened?
              </Text>
              <Text variant="caption">Choose one exception type.</Text>
            </div>
            <div className="exception-type-grid">
              <button
                aria-pressed={type === "missing"}
                className="exception-type-option"
                onClick={() => selectType("missing")}
                type="button"
              >
                <AlertTriangle aria-hidden="true" />
                <span>
                  <strong>Missing</strong>
                  <small>Expected goods are unavailable</small>
                </span>
              </button>
              <button
                aria-pressed={type === "damaged"}
                className="exception-type-option"
                onClick={() => selectType("damaged")}
                type="button"
              >
                <Hammer aria-hidden="true" />
                <span>
                  <strong>Damaged</strong>
                  <small>Goods cannot be loaded as expected</small>
                </span>
              </button>
            </div>
          </section>

          {type ? (
            <>
              <section className="exception-form-section">
                <div className="exception-form-section__heading">
                  <Text as="h3" variant="h3">
                    Quantity affected
                  </Text>
                  <Text variant="caption">
                    Expected · {expected.amount} {expected.unit}
                  </Text>
                </div>
                <div className="quantity-workspace">
                  <div className="quantity-stepper">
                    <button
                      aria-label={`Decrease ${type} quantity`}
                      onClick={() => changeQuantity(-1)}
                      type="button"
                    >
                      <Minus aria-hidden="true" />
                    </button>
                    <div aria-live="polite">
                      <Text variant="data">{affectedQuantity}</Text>
                      <Text variant="caption">{expected.unit}</Text>
                    </div>
                    <button
                      aria-label={`Increase ${type} quantity`}
                      onClick={() => changeQuantity(1)}
                      type="button"
                    >
                      <Plus aria-hidden="true" />
                    </button>
                  </div>
                  <div className="remaining-quantity">
                    <Text variant="caption">
                      {type === "missing"
                        ? "Remaining to load"
                        : "Remaining usable quantity"}
                    </Text>
                    <Text variant="data">
                      {formatQuantity(remaining, expected.unit)}
                    </Text>
                  </div>
                </div>
                {quantityError ? (
                  <Text variant="caption" className="field-error">
                    {quantityError}
                  </Text>
                ) : null}
              </section>

              <section className="exception-form-section exception-form-grid">
                <label className="field-group">
                  <Text as="span" variant="label">
                    Reason
                  </Text>
                  <select
                    onChange={(event) => setReason(event.target.value)}
                    value={reason}
                  >
                    <option value="">Select reason</option>
                    {reasons.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {!reason ? (
                    <Text variant="caption">A reason is required.</Text>
                  ) : null}
                </label>
                <label className="field-group">
                  <Text as="span" variant="label">
                    Additional note (optional)
                  </Text>
                  <textarea
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={
                      type === "missing"
                        ? "e.g. 2 trays unavailable at loading."
                        : "e.g. Packaging damaged before loading."
                    }
                    rows={3}
                    value={note}
                  />
                </label>
              </section>

              <section className="exception-summary">
                <div className="exception-summary__heading">
                  <div>
                    <Text variant="label">Exception summary</Text>
                    <Text variant="body-strong">
                      {item.name} · {item.quantity}
                    </Text>
                  </div>
                  <StatusPill
                    variant="changed"
                    label={type === "missing" ? "Missing" : "Damaged"}
                  />
                </div>
                <div className="exception-summary__details">
                  <div>
                    <Text variant="caption">Quantity affected</Text>
                    <Text variant="data">
                      {formatQuantity(affectedQuantity, expected.unit)}
                    </Text>
                  </div>
                  <div>
                    <Text variant="caption">Reason</Text>
                    <Text variant="body-strong">
                      {reason || "Select a reason"}
                    </Text>
                  </div>
                  <div>
                    <Text variant="caption">Note</Text>
                    <Text variant="body">
                      {note.trim() || "No additional note"}
                    </Text>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>

        <div className="exception-sheet__footer">
          <div>
            {isOffline ? (
              <>
                <StatusPill
                  variant="offline"
                  label="Offline · Saved on this device"
                />
                <Text variant="caption">
                  The exception will be queued for synchronization.
                </Text>
              </>
            ) : (
              <Text variant="caption">
                Exception details become part of the shared delivery record.
              </Text>
            )}
          </div>
          <div className="exception-sheet__actions">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!canSave} size="large" onClick={handleSave}>
              Save exception
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Progress({
  damaged = 0,
  flagged = 0,
  loaded,
  missing = 0,
  total,
}: {
  damaged?: number
  flagged?: number
  loaded: number
  missing?: number
  total: number
}) {
  const pending = Math.max(total - loaded - flagged - missing - damaged, 0)
  const accounted = loaded + flagged + missing + damaged
  const segments = [
    { className: "progress__segment--loaded", label: "Loaded", value: loaded },
    {
      className: "progress__segment--damaged",
      label: "Flagged",
      value: flagged,
    },
    {
      className: "progress__segment--missing",
      label: "Missing",
      value: missing,
    },
    {
      className: "progress__segment--damaged",
      label: "Damaged",
      value: damaged,
    },
    {
      className: "progress__segment--pending",
      label: "Pending",
      value: pending,
    },
  ].filter((segment) => segment.value > 0 || segment.label === "Pending")

  return (
    <div className="progress-system">
      <div className="progress-system__header">
        <div>
          <Text variant="caption">Overall progress</Text>
          <Text variant="body-strong">
            {accounted} / {total} items accounted for
          </Text>
        </div>
        <Text variant="data">{Math.round((accounted / total) * 100)}%</Text>
      </div>
      <div
        aria-label={`${accounted} of ${total} items accounted for`}
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={accounted}
      >
        {segments.map((segment) =>
          segment.value > 0 ? (
            <span
              aria-hidden="true"
              className={cx("progress__segment", segment.className)}
              key={segment.label}
              style={{ flexGrow: segment.value }}
            />
          ) : null,
        )}
      </div>
      <div className="progress-legend">
        {segments.map((segment) => (
          <div className="progress-legend__item" key={segment.label}>
            <span
              className={cx("progress-legend__dot", segment.className)}
              aria-hidden="true"
            />
            <Text as="span" variant="caption">
              {segment.label}
            </Text>
            <Text as="span" variant="data">
              {segment.value}
            </Text>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PageHeader({
  aside,
  eyebrow,
  subtitle,
  title,
}: {
  aside?: ReactNode
  eyebrow?: string
  subtitle: string
  title: ReactNode
}) {
  return (
    <div className="page-header">
      <div className="page-header__copy">
        {eyebrow ? (
          <Text variant="label" className="page-header__eyebrow">
            {eyebrow}
          </Text>
        ) : null}
        <Text as="h1" variant="h1">
          {title}
        </Text>
        <Text variant="body" className="page-header__subtitle">
          {subtitle}
        </Text>
      </div>
      {aside ? <div className="page-header__aside">{aside}</div> : null}
    </div>
  )
}

export function SectionHeader({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div className="section-header">
      <Text as="h2" variant="h2">
        {title}
      </Text>
      <Text variant="body">{description}</Text>
    </div>
  )
}

export function BottomActionBar({
  context,
  primaryAction,
  secondaryAction,
}: {
  context?: ReactNode
  primaryAction: ReactNode
  secondaryAction?: ReactNode
}) {
  return (
    <div className="bottom-action-bar">
      <div className="bottom-action-bar__inner">
        {context ? (
          <div className="bottom-action-bar__context">{context}</div>
        ) : null}
        <div className="bottom-action-bar__actions">
          {secondaryAction}
          {primaryAction}
        </div>
      </div>
    </div>
  )
}

export function LoaderShell({
  bottomActions,
  children,
  connectivity,
  connectivityDetail,
}: {
  bottomActions?: ReactNode
  children: ReactNode
  connectivity: ConnectivityState
  connectivityDetail?: string
}) {
  return (
    <div className="loader-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__brand">
            <WayLinkMark />
          </div>
          <div className="app-header__location">
            <Warehouse aria-hidden="true" />
            <Text as="span" variant="label">
              Warehouse · Bay 03
            </Text>
          </div>
          <div className="app-header__tools">
            <ConnectivityIndicator
              compact
              detail={connectivityDetail}
              state={connectivity}
            />
            <LoaderIdentity />
          </div>
        </div>
      </header>
      <main className="loader-shell__main">{children}</main>
      {bottomActions}
    </div>
  )
}
