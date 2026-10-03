import { useEffect, useState, useRef, type ReactNode } from "react"
import { getCatalogue, submitStoreOrder, storeDeliveryApi, type StoreDelivery } from "./api/store"
import { AnimatePresence, motion, useMotionValue, animate, useTransform } from "motion/react"
import wayTrackLogo from "./assets/waytrack-logo.png"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Box,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  Home,
  Menu,
  Minus,
  PackageCheck,
  PackageOpen,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Snowflake,
  LoaderCircle,
  Truck,
  UserRound,
  X,
  KeyRound,
  LogOut,
} from "lucide-react"

const calmSpring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 36,
  mass: 0.8,
}
const overlaySpring = {
  type: "spring" as const,
  stiffness: 340,
  damping: 34,
  mass: 0.9,
}

type ButtonTone = "primary" | "secondary" | "issue"
type ButtonSize = "default" | "mobile"

function Button({
  children,
  tone = "primary",
  size = "default",
  disabled,
  icon,
  className = "",
  onClick,
}: {
  children: ReactNode
  tone?: ButtonTone
  size?: ButtonSize
  disabled?: boolean
  icon?: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <motion.button
      className={`button button--${tone} button--${size} ${className}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
      whileTap={disabled ? undefined : { scale: 0.975 }}
      transition={calmSpring}
    >
      {icon}
      <span>{children}</span>
    </motion.button>
  )
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <button
      className="icon-button"
      aria-label={label}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

type StatusKind = "confirmed" | "scheduled" | "transit" | "arrived" | "deferred" | "awaiting" | "received" | "issue"

const statusDetails: Record<StatusKind, {
  label: string
  icon: ReactNode
}> = {
  confirmed: { label: "Order confirmed", icon: <CheckCircle2 /> },
  scheduled: { label: "Scheduled", icon: <CalendarDays /> },
  transit: { label: "On the way", icon: <Truck /> },
  arrived: { label: "Arrived", icon: <CheckCircle2 /> },
  deferred: { label: "Deferred", icon: <Clock3 /> },
  awaiting: { label: "Awaiting confirmation", icon: <CircleAlert /> },
  received: { label: "Receipt confirmed", icon: <PackageCheck /> },
  issue: { label: "Receipt confirmed with issue", icon: <AlertTriangle /> },
}

function formatOutlet(business: "fresh" | "style" | "tech" = "fresh") {
  if (business === "style") return "Waypoint Style · Kandy City"
  if (business === "tech") return "Waypoint Tech · Kandy City"
  return "Waypoint Fresh · Kandy City"
}
function formatOrderType(business: "fresh" | "style" | "tech" = "fresh", type: OrderType = "dry") {
  if (business === "style") return "Style stock"
  if (business === "tech") return "Tech stock"
  if (type === "dry") return "Dry groceries"
  return "Chilled / Frozen"
}

function StatusPill({ kind }: { kind: StatusKind }) {
  const status = statusDetails[kind]
  return (
    <motion.span
      className={`status-pill status-pill--${kind}`}
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={calmSpring}
    >
      {status.icon}
      {status.label}
    </motion.span>
  )
}


function BrandMark({ compact = false, onClick }: { compact?: boolean, onClick?: () => void }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="brand-name">WayLink</span>
    </div>
  )
}

const navigation = [
  { label: "Home", icon: Home },
  { label: "Orders", icon: ShoppingBag },
  { label: "Deliveries", icon: Truck },
]

function Sidebar({
  current,
  onNavigate,
}: {
  current: string
  onNavigate: (label: string) => void
}) {
  return (
    <aside className="sidebar">
      <BrandMark onClick={() => onNavigate("Home")} />
      <nav className="side-nav" aria-label="Primary navigation">
        {navigation.map(({ label, icon: Icon }) => (
          <motion.button
            className={`nav-item ${
              current === label ? "nav-item--selected" : ""
            }`}
            key={label}
            onClick={() => onNavigate(label)}
            type="button"
            whileTap={{ scale: 0.98 }}
            transition={calmSpring}
          >
            {current === label && (
              <motion.span
                className="nav-selection"
                layoutId="desktop-nav-selection"
                transition={calmSpring}
              />
            )}
            <Icon className="nav-content" />
            <span className="nav-content">{label}</span>
          </motion.button>
        ))}
      </nav>
      <div className="sidebar-profile">
        <span className="avatar avatar--dark">DF</span>
        <span className="profile-copy">
          <strong>Dilini Fernando</strong>
          <small>Store Manager</small>
        </span>
      </div>
    </aside>
  )
}

function OutletIdentity({ business = "fresh" }: { business?: "fresh" | "style" | "tech" }) {
  return (
    <div className="outlet-identity">
      <span className="outlet-icon">
        <Box />
      </span>
      <span>
        <small className="outlet-label">Your outlet</small>
        <strong>{business === "style" ? "Waypoint Style" : business === "tech" ? "Waypoint Tech" : "Waypoint Fresh"}</strong>
        <small className="outlet-location">Kandy City</small>
      </span>
    </div>
  )
}

function GlobalCutoff({ closed = false, open, setOpen }: { closed?: boolean, open: boolean, setOpen: (v: boolean) => void }) {
  
  return (
    <div className="global-cutoff-container" style={{ position: "relative" }}>
      <button 
        className={`global-cutoff-pill ${closed ? "global-cutoff-pill--closed" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <Clock3 className="cutoff-icon" style={{ width: 14, height: 14 }} />
        <span className="cutoff-pill-text desktop-only">
          {closed ? "Next-day cutoff passed" : "Next-day cutoff · 2h 14m"}
        </span>
        <span className="cutoff-pill-text mobile-only">
          {closed ? "Cutoff passed" : "Cutoff · 2h 14m"}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div 
            className="global-cutoff-popover"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={calmSpring}
          >
            <strong>{closed ? "Next-day order cutoff passed" : "Next-day order cutoff"}</strong>
            <p>{closed ? "Orders submitted now enter the following planning run." : "Submit before 4:00 PM for tomorrow's planning run."}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FloatingNewOrder({ onClick }: { onClick: () => void }) {
  return (
    <div className="floating-new-order">
      <Button icon={<Plus />} onClick={onClick} tone="primary">
        New order
      </Button>
    </div>
  )
}

function TopBar({
  current,
  onNavigate,
  business,
  afterCutoff = false,
}: {
  current: string
  onNavigate: (label: string) => void
  business: "fresh" | "style" | "tech"
  afterCutoff?: boolean
}) {
  const [showNotifs, setShowNotifs] = useState(false)
  const [showCutoff, setShowCutoff] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const cutoffRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (showCutoff && cutoffRef.current && !cutoffRef.current.contains(target)) {
        setShowCutoff(false)
      }
      if (showNotifs && notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifs(false)
      }
      if (showProfile && profileRef.current && !profileRef.current.contains(target)) {
        setShowProfile(false)
      }
    }
    document.addEventListener("pointerdown", handleOutsidePointer)
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer)
    }
  }, [showCutoff, showNotifs, showProfile])

  useEffect(() => {
    setShowCutoff(false)
    setShowNotifs(false)
    setShowProfile(false)
  }, [current])

  return (
        <header className="topbar">
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div className="store-brand" style={{ cursor: 'pointer' }} onClick={() => onNavigate("Home")}>
          <img alt="" src={wayTrackLogo} className="store-brand__logo" />
          <span className="store-brand__wordmark">WayTrack</span>
          <span className="store-brand__context">
            {business === "fresh" ? "Fresh" : business === "style" ? "Style" : "Tech"} &middot; Kandy
          </span>
        </div>
        <div className="topbar-desktop-nav">
          <nav className="top-nav" aria-label="Primary navigation">
            {["Home", "Orders", "Deliveries"].map((label) => (
              <button
                className={"top-nav-item " + (current === label ? "active" : "")}
                key={label}
                onClick={() => onNavigate(label)}
                type="button"
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-cutoff-wrapper" ref={cutoffRef}>
          <GlobalCutoff closed={afterCutoff} open={showCutoff} setOpen={(val) => {
            setShowCutoff(val)
            if (val) {
              setShowNotifs(false)
              setShowProfile(false)
            }
          }} />
        </div>

        <div style={{ position: "relative" }} ref={notifRef}>
          <IconButton label="Notifications" onClick={() => {
            const val = !showNotifs
            setShowNotifs(val)
            if (val) {
              setShowCutoff(false)
              setShowProfile(false)
            }
          }}>
            <Bell />
          </IconButton>
          <AnimatePresence>
          {showNotifs && (
            <motion.div className="notif-dropdown" 
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              style={{ position: "absolute", top: 48, right: 0, width: 320, background: "white", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-dropdown)", zIndex: 100, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Notifications</div>
              <div onClick={() => { setShowNotifs(false); onNavigate("Deliveries"); }} style={{ padding: 12, background: "var(--navy-50)", borderRadius: 6, marginBottom: 8, cursor: "pointer", fontSize: 13, color: "var(--text-primary)" }}>
                <strong>ORD-1045</strong> awaits receipt confirmation
              </div>
              <div onClick={() => { setShowNotifs(false); onNavigate("Orders"); }} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 13, color: "var(--text-primary)" }}>
                <strong>ORD-1065</strong> delivery rescheduled
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
        <div style={{ position: "relative" }} ref={profileRef}>
          <button 
            className="desktop-only-flex" 
            style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--white)', padding: '0 4px', margin: 0 }} 
            type="button"
            onClick={() => {
              const val = !showProfile
              setShowProfile(val)
              if (val) {
                setShowCutoff(false)
                setShowNotifs(false)
              }
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--sunburst-500)', color: 'var(--navy-900)', fontWeight: 700, fontSize: '13px' }}>DF</span>
            <span style={{ fontWeight: 500, fontSize: '14px' }}>Dilini F.</span>
            <ChevronDown size={16} />
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div className="profile-dropdown" 
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                style={{ position: "absolute", top: 48, right: 0, width: 200, background: "white", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-dropdown)", zIndex: 100, padding: 8 }}>
                <div 
                  onClick={() => {
                    if (isLoggingOut) return;
                    setIsLoggingOut(true);
                    try { sessionStorage.removeItem("waylink.role.session"); } catch {}
                    const loginUrl = import.meta.env.VITE_LOGIN_URL || "https://kraken-hack-login.vercel.app/";
                    const urlObj = new URL(loginUrl, window.location.origin);
                    urlObj.searchParams.set("logged_out", "1");
                    window.location.replace(urlObj.toString());
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--navy-50)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut size={18} />
                  Sign out
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}


function BottomNavigation({
  current,
  onNavigate,
}: {
  current: string
  onNavigate: (label: string) => void
}) {
  const tabIndex = navigation.findIndex((n) => n.label === current)
  const lastValidIndex = useRef(0)
  if (tabIndex >= 0) {
    lastValidIndex.current = tabIndex
  }
  const currentIndex = tabIndex >= 0 ? tabIndex : lastValidIndex.current

  const [visualIndex, setVisualIndex] = useState(currentIndex)

  const navRef = useRef<HTMLElement>(null)
  const didDragRef = useRef(false)
  const dragStartRef = useRef<{ x: number; y: number; active: boolean; magneticIndex: number } | null>(null)
  
  const baseLeft = useMotionValue(0)
  const baseRight = useMotionValue(0)
  const dragOffsetLeft = useMotionValue(0)
  const dragOffsetRight = useMotionValue(0)
  
  const indicatorLeft = useTransform([baseLeft, dragOffsetLeft], ([b, d]) => (b as number) + (d as number))
  const indicatorRight = useTransform([baseRight, dragOffsetRight], ([b, d]) => (b as number) + (d as number))
  
  const indicatorCenter = useTransform([indicatorLeft, indicatorRight], ([l, r]) => ((l as number) + (r as number)) / 2)
  const indicatorWidth = useTransform([indicatorLeft, indicatorRight], ([l, r]) => (r as number) - (l as number))

  useEffect(() => {
    return indicatorCenter.on("change", (latest) => {
      // NOTE: Removed early return if dragging, so visualIndex can update during continuous swipe!
      if (navRef.current) {
        const slotWidth = navRef.current.getBoundingClientRect().width / 3
        if (slotWidth > 0) {
          const currentVisual = Math.floor(latest / slotWidth)
          if (currentVisual === currentIndex && currentVisual >= 0 && currentVisual <= 2) {
            setVisualIndex(prev => prev === currentVisual ? prev : currentVisual)
          }
        }
      }
    })
  }, [indicatorCenter, currentIndex])

  const leadingSpring = { type: "spring" as const, stiffness: 500, damping: 34, mass: 0.45 }
  const trailingSpring = { type: "spring" as const, stiffness: 420, damping: 30, mass: 0.65 }
  const magneticSpring = { type: "spring" as const, stiffness: 600, damping: 32, mass: 0.45 }
  
  const prevIndexRef = useRef(currentIndex)

  // Sync base indicator when current tab changes
  useEffect(() => {
    if (navRef.current) {
      const slotWidth = navRef.current.getBoundingClientRect().width / 3
      const inset = 8
      const targetLeft = currentIndex * slotWidth + inset
      const targetRight = (currentIndex + 1) * slotWidth - inset

      if (baseRight.get() === 0) {
        // Initial setup
        baseLeft.set(targetLeft)
        baseRight.set(targetRight)
        prevIndexRef.current = currentIndex
        return
      }

      const prevIndex = prevIndexRef.current
      prevIndexRef.current = currentIndex
      
      const isDragging = dragStartRef.current?.active

      if (currentIndex === prevIndex) {
        animate(baseLeft, targetLeft, trailingSpring)
        animate(baseRight, targetRight, trailingSpring)
      } else if (currentIndex > prevIndex) {
        // Forward stretch
        animate(baseRight, targetRight, isDragging ? magneticSpring : leadingSpring)
        animate(baseLeft, targetLeft, isDragging ? { ...magneticSpring, delay: 0.03 } : { ...trailingSpring, delay: 0.05 })
      } else {
        // Backward stretch
        animate(baseLeft, targetLeft, isDragging ? magneticSpring : leadingSpring)
        animate(baseRight, targetRight, isDragging ? { ...magneticSpring, delay: 0.03 } : { ...trailingSpring, delay: 0.05 })
      }
    }
  }, [currentIndex, baseLeft, baseRight])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!navRef.current) return
    didDragRef.current = false
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      active: false,
      magneticIndex: currentIndex
    }
    // zero offsets for clean state
    dragOffsetLeft.set(0)
    dragOffsetRight.set(0)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || !navRef.current) return
    const deltaX = e.clientX - dragStartRef.current.x
    const deltaY = e.clientY - dragStartRef.current.y
    
    if (!dragStartRef.current.active) {
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
        dragStartRef.current.active = true
        didDragRef.current = true
      }
    }
    
    if (dragStartRef.current.active) {
      e.preventDefault() // prevent scrolling while dragging horizontally
      const slotWidth = navRef.current.getBoundingClientRect().width / 3
      const threshold = slotWidth * 0.42 // ~42% of slot width to trigger snap
      
      // Check magnetic thresholds
      if (deltaX > threshold && dragStartRef.current.magneticIndex < 2) {
        dragStartRef.current.magneticIndex += 1
        dragStartRef.current.x = e.clientX
        onNavigate(navigation[dragStartRef.current.magneticIndex].label)
        dragOffsetLeft.set(0)
        dragOffsetRight.set(0)
        return
      } else if (deltaX < -threshold && dragStartRef.current.magneticIndex > 0) {
        dragStartRef.current.magneticIndex -= 1
        dragStartRef.current.x = e.clientX
        onNavigate(navigation[dragStartRef.current.magneticIndex].label)
        dragOffsetLeft.set(0)
        dragOffsetRight.set(0)
        return
      }
      
      // Calculate resistant stretch
      const maxDragOffset = 22 // maximum pixels the pill can stretch before snapping
      const sign = Math.sign(deltaX)
      const absDelta = Math.abs(deltaX)
      const resistantOffset = sign * maxDragOffset * (1 - Math.exp(-absDelta / 30))
      
      let lOff = 0
      let rOff = 0
      
      if (deltaX > 0) {
        rOff = resistantOffset
        lOff = resistantOffset * 0.35 // trailing edge resists heavily
      } else {
        lOff = resistantOffset
        rOff = resistantOffset * 0.35 // trailing edge resists heavily
      }
      
      dragOffsetLeft.set(lOff)
      dragOffsetRight.set(rOff)
    }
  }

  const handlePointerUp = () => {
    if (!dragStartRef.current || !navRef.current) return
    
    if (dragStartRef.current.active) {
      // Finger released.
      // Animate offsets cleanly back to 0. Base handles the actual resting position.
      const springBack = { type: "spring" as const, stiffness: 600, damping: 32, mass: 0.45 }
      animate(dragOffsetLeft, 0, springBack)
      animate(dragOffsetRight, 0, springBack)
    }
    
    dragStartRef.current = null
  }

  return (
    <nav 
      className="bottom-nav" 
      aria-label="Mobile navigation" 
      style={{ touchAction: "pan-y" }}
      ref={navRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <motion.div
        className="bottom-nav-active-indicator"
        style={{
          position: "absolute",
          top: 4,
          bottom: "calc(4px + env(safe-area-inset-bottom))",
          left: indicatorLeft,
          width: indicatorWidth,
          zIndex: 0,
          boxSizing: "border-box",
          pointerEvents: "none",
          background: "var(--cobalt-50)",
          borderRadius: "var(--radius-sm)"
        }}
      />
      {navigation.map(({ label, icon: Icon }, index) => (
        <button
          className={`bottom-nav-item ${
            visualIndex === index ? "bottom-nav-item--selected" : ""
          }`}
          key={label}
          onClick={(e) => {
            if (didDragRef.current) {
              e.preventDefault()
              e.stopPropagation()
              didDragRef.current = false
              return
            }
            onNavigate(label)
          }}
          type="button"
          style={{ flex: 1, zIndex: 1 }}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

function Section({
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
  const [expanded, setExpanded] = useState(true)

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

function ExampleCard({
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

function DeliveryCard({ business = "fresh" }: { business?: "fresh" | "style" | "tech" }) {
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

function CutoffBanner({ closed = false }: { closed?: boolean }) {
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

function AttentionCard({ highlighted = false, onOpen, count = 0 }: { highlighted?: boolean, onOpen?: () => void, count?: number }) {
  if (count === 0) return null;

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
        <strong>{count} {count === 1 ? 'Delivery' : 'Deliveries'} awaiting confirmation</strong>
        <p>Review and confirm received quantities when ready.</p>
      </div>
      <Button tone="secondary" onClick={onOpen}>Review</Button>
    </motion.div>
  )
}

function EtaBlock() {
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

function QuantityControl({
  value,
  onChange,
  disabled = false,
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <div
      className={`quantity-control ${
        disabled ? "quantity-control--disabled" : ""
      }`}
    >
      <IconButton
        label="Decrease quantity"
        onClick={() => !disabled && onChange(Math.max(0, value - 1))}
      >
        <Minus />
      </IconButton>
      <span className="quantity-value">{value}</span>
      <IconButton
        label="Increase quantity"
        onClick={() => !disabled && onChange(value + 1)}
      >
        <Plus />
      </IconButton>
    </div>
  )
}

function ProductRow() {
  const [quantity, setQuantity] = useState(20)
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

function VerificationRow({
  state,
  received,
}: {
  state: "good" | "missing" | "damaged"
  received: number
}) {
  const statusLabel =
    state === "good" ? "Good" : state === "missing" ? "2 missing" : "1 damaged"
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

const timelineSteps = [
  "Order confirmed",
  "Scheduled",
  "On the way",
  "Arrived",
  "Receipt confirmation",
]

function Lifecycle({
  deferred = false,
  interactive = false,
}: {
  deferred?: boolean
  interactive?: boolean
}) {
  const [currentStep, setCurrentStep] = useState(2)

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

function SearchField() {
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

function TextField({
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

function FormExamples() {
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

function Dialog({ onClose }: { onClose: () => void }) {
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

function BottomSheet({ onClose }: { onClose: () => void }) {
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

function MobileShellPreview() {
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

function FoundationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [attentionHighlighted, setAttentionHighlighted] = useState(false)

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

function HomeSectionHeader({
    title,
    action,
    onAction,
  }: {
    title: string
    action?: string
    onAction?: () => void
  }) {
  return (
    <div className="home-section-header">
      <div className="home-section-title">{title}</div>
      {action && (
        <Button tone="secondary" className="text-button" onClick={onAction}>
          {action}
          <ArrowRight />
        </Button>
      )}
    </div>
  )
}





function NextDeliveryHero({ onOpen, business = "fresh", delivery }: { onOpen?: () => void, business?: "fresh" | "style" | "tech", delivery?: any }) {
  if (!delivery) {
    return (
      <div className="next-delivery-card empty-state" style={{ padding: "var(--space-6)", textAlign: "center" }}>
        <CalendarDays />
        <p>No upcoming deliveries expected.</p>
      </div>
    )
  }

  return (
    <motion.div
      className="next-delivery-card"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={calmSpring}
    >
      <div className="next-delivery-main">
        <div className="next-delivery-heading">
          <span className="delivery-date">
            <CalendarDays />
            {delivery.date || "Expected soon"}
          </span>
          <StatusPill kind={delivery.status === "deferred" ? "deferred" : "scheduled"} />
        </div>
        <div className="delivery-name">{formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh"))}</div>
        <span className="order-reference">
          Order <strong className="data-id">{delivery.orderNumber || delivery.id || delivery._id || "N/A"}</strong>
        </span>
      </div>

      <div className="next-delivery-eta">
        <span className="field-label">Expected arrival</span>
        <strong>{delivery.eta || delivery.arrivedAt || "Pending"}</strong>
        <span>{delivery.reason || ""}</span>
      </div>

      <div className="next-delivery-meta">
        <div>
          <span>Trip</span>
          <strong className="data-id">{delivery.tripId || "Pending"}</strong>
        </div>
        <div>
          <span>Vehicle</span>
          <strong className="data-id">{delivery.vehicleId || "Pending"}</strong>
        </div>
      </div>

      <Button tone="secondary" className="view-details-button" onClick={onOpen}>
        View details
        <ArrowRight />
      </Button>
    </motion.div>
  )
}

type UpcomingDelivery = {
  id: string
  type: string
  date: string
  status: "confirmed" | "scheduled" | "deferred"
  eta: string
  reason?: string
}


function getUpcomingDeliveries(business: "fresh" | "style" | "tech") {
  return [
    {
      id: "ORD-1065",
      type: formatOrderType(business, business === "fresh" ? "chilled" : getDefaultOrderType(business)),
      date: "Friday, 2 October",
      status: "deferred" as const,
      reason: business === "fresh" ? "Refrigerated capacity" : "Vehicle capacity constraints",
      eta: "New window • 06:50-07:10",
    },
    {
      id: "ORD-1071",
      type: formatOrderType(business, getDefaultOrderType(business)),
      date: "Monday, 5 October",
      status: "confirmed" as const,
      eta: "Not scheduled yet",
    },
  ]
}

function UpcomingDeliveryRow({ business, delivery, onOpen }: { business: "fresh" | "style" | "tech", delivery: any, onOpen?: () => void }) {
  return (
    <motion.div
      className="upcoming-row"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      onClick={onOpen}
    >
      <div className="upcoming-row-main">
        <strong>{delivery.orderNumber || delivery.id || delivery._id || "N/A"}</strong>
        <span>{formatOrderType(business, getDefaultOrderType(business))} · {delivery.date || "Expected soon"}</span>
        {delivery.reason && <span className="deferred-reason">{delivery.reason}</span>}
      </div>
      <div className="upcoming-row-meta">
        <StatusPill kind={delivery.status === "deferred" ? "deferred" : "scheduled"} />
        <span className="upcoming-eta">{delivery.eta || delivery.arrivedAt || "Pending"}</span>
      </div>
      <ArrowRight className="row-chevron" />
    </motion.div>
  )
}

const recentActivity = [
  {
    id: "ORD-1037",
    label: "Receipt confirmed",
    time: "Today · 06:57",
    kind: "received" as StatusKind,
  },
  {
    id: "ORD-1034",
    label: "Receipt confirmed with issue",
    time: "Yesterday",
    kind: "issue" as StatusKind,
  },
  {
    id: "ORD-1029",
    label: "Delivered",
    time: "28 Sep",
    kind: "confirmed" as StatusKind,
  },
]

function RecentActivityList() {
  return (
    <div className="activity-list">
      {recentActivity.map((activity) => {
        const details = statusDetails[activity.kind]
        return (
          <motion.button
            className="activity-row"
            type="button"
            key={activity.id}
            whileTap={{ scale: 0.99 }}
            transition={calmSpring}
          >
            <span
              className={`activity-icon activity-icon--${activity.kind}`}
              aria-hidden="true"
            >
              {details.icon}
            </span>
            <span className="activity-copy">
              <strong className="data-id">{activity.id}</strong>
              <span>{activity.label}</span>
            </span>
            <time>{activity.time}</time>
          </motion.button>
        )
      })}
    </div>
  )
}

function UpcomingEmptyState() {
  return (
    <motion.div
      className="upcoming-empty"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={calmSpring}
    >
      <CalendarDays />
      <div>
        <strong>No upcoming deliveries scheduled</strong>
        <p>New delivery dates will appear here once an order is scheduled.</p>
      </div>
    </motion.div>
  )
}

function HomePage({
  showAttention = true,
  afterCutoff = false,
  showUpcoming = true,
  onNewOrder,
  onOpenDeferred,
  business,
  onOpenOrder,
  onBusinessChange,
  onNavigate,
}: {
  showAttention?: boolean
  afterCutoff?: boolean
  showUpcoming?: boolean
  onNewOrder: () => void
  onOpenDeferred: () => void
  business: "fresh" | "style" | "tech"
  onOpenOrder: (id: string, view: string, state: string) => void
  onBusinessChange?: (b: "fresh" | "style" | "tech") => void
  onNavigate: (label: string) => void
}) {
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    storeDeliveryApi.dashboard()
      .then((data) => {
        if (active) {
          setDashboard(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load dashboard")
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [business])

  return (
    <div className="home-page">
      <div className="home-page-header">
        <div>
          <span className="home-greeting">Good morning, Store Manager</span>
          <div className="page-title">Home</div>
          <p>Here's what's happening at your store today.</p>
        </div>
      </div>

      {loading && <div style={{ padding: "var(--space-8)", textAlign: "center" }}>Loading dashboard...</div>}
      
      {error && !loading && (
        <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--issue-text)" }}>
          {error}
          <br /><br />
          <Button onClick={() => window.location.reload()} tone="primary">Retry</Button>
        </div>
      )}

      {!loading && !error && dashboard && (
        <>
          <motion.section className="home-section" layout transition={calmSpring}>
            <HomeSectionHeader title="Next delivery" />
            <NextDeliveryHero 
              business={business} 
              delivery={dashboard.upcomingDeliveries?.[0]} 
              onOpen={() => dashboard.upcomingDeliveries?.[0] && onOpenOrder(dashboard.upcomingDeliveries[0].orderNumber || dashboard.upcomingDeliveries[0]._id, "order-detail", "scheduled")} 
            />
          </motion.section>

          <AnimatePresence initial={false}>
            {dashboard.attentionCount > 0 && (
              <motion.section
                className="home-section attention-section"
                layout
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={calmSpring}
              >
                <HomeSectionHeader title="Needs attention" />
                <AttentionCard 
                  count={dashboard.attentionCount} 
                  onOpen={() => onNavigate("Deliveries")} 
                />
              </motion.section>
            )}
          </AnimatePresence>

          <motion.div className="home-bottom-grid" layout transition={calmSpring}>
            <section className="home-panel upcoming-panel">
              <HomeSectionHeader title="Upcoming deliveries" action="View all" onAction={() => onNavigate("Orders")} />
              <AnimatePresence mode="wait" initial={false}>
                {dashboard.upcomingDeliveries?.length > 1 ? (
                  <motion.div
                    className="upcoming-list"
                    key="upcoming-list"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={calmSpring}
                  >
                    {dashboard.upcomingDeliveries.slice(1).map((delivery: any) => (
                      <UpcomingDeliveryRow 
                        business={business}
                        delivery={delivery}
                        key={delivery._id}
                        onOpen={() =>
                          onOpenOrder(delivery.orderNumber || delivery._id, "order-detail", delivery.status)
                        }
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    className="upcoming-list empty-state"
                    key="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={calmSpring}
                  >
                    <CalendarDays />
                    <p>No more deliveries expected today.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section className="home-panel action-panel">
              <HomeSectionHeader title="Quick actions" />
              <div className="action-grid">
                <button className="action-button" onClick={onNewOrder}>
                  <Plus />
                  New Order
                </button>
                <button className="action-button">
                  <span className="placeholder-icon" />
                  Stock Check
                </button>
                <button className="action-button">
                  <span className="placeholder-icon" />
                  Messages
                </button>
              </div>
            </section>
          </motion.div>
        </>
      )}
    </div>
  )
}

type OrderType = "dry" | "chilled" | "products"
type OrderDrafts = Record<OrderType, Record<string, number>>

type CatalogProduct = {
  id: string
  name: string
  unit: string
}

const productCatalog: Record<"fresh" | "style" | "tech", Partial<Record<OrderType, CatalogProduct[]>>> = {
  fresh: {
    dry: [
      { id: "rice", name: "Rice", unit: "bag" },
      { id: "milk-powder", name: "Milk powder", unit: "carton" },
      { id: "flour", name: "Flour", unit: "bag" },
      { id: "cooking-oil", name: "Cooking oil", unit: "bottle" },
      { id: "canned-goods", name: "Canned goods", unit: "carton" },
    ],
    chilled: [
      { id: "fresh-milk", name: "Fresh milk", unit: "carton" },
      { id: "chicken", name: "Chicken", unit: "kg" },
      { id: "frozen-vegetables", name: "Frozen vegetables", unit: "box" },
      { id: "yoghurt", name: "Yoghurt", unit: "crate" },
      { id: "frozen-meat", name: "Frozen meat", unit: "box" },
    ],
  },
  style: {
    products: [
      { id: "t-shirts", name: "T-shirts", unit: "piece" },
      { id: "shirts", name: "Shirts", unit: "piece" },
      { id: "trousers", name: "Trousers", unit: "piece" },
      { id: "dresses", name: "Dresses", unit: "piece" },
      { id: "jackets", name: "Jackets", unit: "piece" },
      { id: "shoes", name: "Shoes", unit: "pair" },
      { id: "sandals", name: "Sandals", unit: "pair" },
      { id: "bags", name: "Bags", unit: "piece" },
      { id: "belts", name: "Belts", unit: "piece" },
      { id: "caps", name: "Caps", unit: "piece" },
    ],
  },
  tech: {
    products: [
      { id: "laptops", name: "Laptops", unit: "unit" },
      { id: "smartphones", name: "Smartphones", unit: "unit" },
      { id: "monitors", name: "Monitors", unit: "unit" },
      { id: "tablets", name: "Tablets", unit: "unit" },
      { id: "keyboards", name: "Keyboards", unit: "unit" },
      { id: "mice", name: "Mice", unit: "unit" },
      { id: "chargers", name: "Chargers", unit: "unit" },
      { id: "headsets", name: "Headsets", unit: "unit" },
      { id: "cables", name: "Cables", unit: "unit" },
      { id: "battery-packs", name: "Battery packs", unit: "unit" },
    ],
  },
}

const mockDrafts: Record<"fresh" | "style" | "tech", Record<OrderType, Record<string, number>>> = {
  fresh: {
    dry: { rice: 20, "milk-powder": 30, flour: 10, "cooking-oil": 20 },
    chilled: { "fresh-milk": 12, chicken: 8 },
  },
  style: {
    products: { "t-shirts": 30, shirts: 20, trousers: 15, shoes: 12, dresses: 5, jackets: 4 },
  },
  tech: {
    products: { laptops: 6, smartphones: 12, monitors: 8, keyboards: 15, tablets: 10 },
  },
} as any


function getDefaultOrderType(business: "fresh" | "style" | "tech"): OrderType {
  if (business === "fresh") return "dry"
  return "products"
}

function getCatalog(business: "fresh" | "style" | "tech", type: OrderType): CatalogProduct[] {
  const catalog = productCatalog[business] as Record<string, CatalogProduct[]>
  return catalog[type] || []
}

function getDraft(drafts: OrderDrafts, type: OrderType): Record<string, number> {
  const safeDrafts = drafts as Record<string, Record<string, number>>
  return safeDrafts[type] || {}
}

function pluralizeUnit(unit: string, quantity: number) {
  if (quantity === 1 || unit === "kg") return unit
  return unit + "s"
}

function selectedProducts(business: "fresh" | "style" | "tech", type: OrderType, quantities: Record<string, number> | undefined): Array<CatalogProduct & { quantity: number }> {
  return getCatalog(business, type)
    .map((product) => ({ ...product, quantity: (quantities && quantities[product.id]) ?? 0 }))
    .filter((product) => product.quantity > 0)
}

function OrderTypeSelector({
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
  ]

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

function DirectQuantityControl({
  quantity,
  onChange,
  max,
}: {
  quantity: number
  onChange: (quantity: number) => void
  max?: number
}) {
  const [value, setValue] = useState(String(quantity))
  const [error, setError] = useState("")

  useEffect(() => setValue(String(quantity)), [quantity])

  function updateDirectValue(nextValue: string) {
    setValue(nextValue)
    if (nextValue === "") {
      setError("")
      return
    }
    if (!/^\d+$/.test(nextValue)) {
      setError("Enter a whole number of 0 or more.")
      return
    }
    if (max !== undefined && Number(nextValue) > max) {
      setError(`Quantity cannot exceed ${max}.`)
      return
    }
    setError("")
    onChange(Number(nextValue))
  }

  function normalizeValue() {
    if (value === "" || error) {
      setValue(String(quantity))
      setError("")
    }
  }

  return (
    <div className="direct-quantity-wrap">
      <div
        className={`quantity-control direct-quantity ${
          error ? "direct-quantity--error" : ""
        }`}
      >
        <IconButton
          label="Decrease quantity"
          onClick={() => onChange(Math.max(0, quantity - 1))}
        >
          <Minus />
        </IconButton>
        <input
          aria-label="Quantity"
          inputMode="numeric"
          value={value}
          onBlur={normalizeValue}
          onChange={(event) => updateDirectValue(event.target.value)}
        />
        <IconButton
          label="Increase quantity"
          onClick={() =>
            onChange(
              max === undefined ? quantity + 1 : Math.min(max, quantity + 1),
            )
          }
        >
          <Plus />
        </IconButton>
      </div>
      <AnimatePresence>
        {error && (
          <motion.small
            className="quantity-error"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
          >
            {error}
          </motion.small>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProductSelectionRow({
  product,
  quantity,
  onChange,
}: {
  product: CatalogProduct
  quantity: number
  onChange: (quantity: number) => void
}) {
  const selected = quantity > 0
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

function OrderPlanningContext({ afterCutoff }: { afterCutoff: boolean }) {
  return (
    <motion.div
      className={`order-planning-context ${
        afterCutoff ? "order-planning-context--closed" : ""
      }`}
      layout
      transition={calmSpring}
    >
      <span className="planning-icon">
        {afterCutoff ? <AlertTriangle /> : <CalendarDays />}
      </span>
      <div>
        <span>{afterCutoff ? "Target planning run" : "Target delivery"}</span>
        <strong>
          {afterCutoff ? "Friday, 2 October" : "Tomorrow · Thursday, 1 October"}
        </strong>
        <small>
          {afterCutoff
            ? "Next-day ordering closed · Orders now enter the following planning run."
            : "Next-day cutoff · 2h 14m remaining"}
        </small>
      </div>
    </motion.div>
  )
}

function SummaryItems({
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

function DesktopOrderSummary({ business,
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
  const populated = items.length > 0
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

function MobileOrderSummarySheet({ business,
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

function NewOrderPage({ business, 
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
  onQuantitiesChange: (drafts: OrderDrafts) => void
  initialSearch?: string
  initialSummaryOpen?: boolean
  onReview: () => void
}) {
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [summaryOpen, setSummaryOpen] = useState(initialSummaryOpen)
  const [, setCatalogueVersion] = useState(0)

  useEffect(() => {
    let active = true
    void getCatalogue(business, type)
      .then((rows) => {
        if (!active) return
        productCatalog[business][type] = rows.map((row) => ({ id: row._id, name: row.name, unit: row.unit }))
        setCatalogueVersion((version) => version + 1)
      })
      .catch((error) => {
        if (import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE !== "true") {
          productCatalog[business][type] = []
          setCatalogueVersion((version) => version + 1)
        }
        console.error("Catalogue request failed", error)
      })
    return () => { active = false }
  }, [business, type])

  const products = getCatalog(business, type)
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  )
  const currentItems = selectedProducts(business, type, getDraft(quantities, type))
  const totalUnits = currentItems.reduce(
    (total, product) => total + product.quantity,
    0,
  )

  function updateQuantity(productId: string, quantity: number) {
    onQuantitiesChange({
      ...quantities,
      [type]: {
        ...getDraft(quantities, type),
        [productId]: Math.max(0, quantity),
      },
    })
  }

  function changeOrderType(nextType: OrderType) {
    onTypeChange(nextType)
    setSearchQuery("")
  }

  function clearCurrentOrder() {
    onQuantitiesChange({ ...quantities, [type]: {} })
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

function ReviewContext({ business, 
  type,
  afterCutoff,

}: { business: "fresh" | "style" | "tech", type: OrderType, afterCutoff: boolean

}) {
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
          {afterCutoff ? "Friday, 2 October" : "Tomorrow · Thursday, 1 October"}
        </strong>
      </div>
      <div>
        <span>Cutoff</span>
        <strong>
          {afterCutoff ? "Next-day ordering closed" : "2h 14m remaining"}
        </strong>
      </div>
    </div>
  )
}

function ReviewProductList({
  items,
}: {
  items: Array<CatalogProduct & { quantity: number }>
}) {
  const totalUnits = items.reduce((total, item) => total + item.quantity, 0)
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

type SubmissionState = "idle" | "submitting" | "error"

function SubmissionError({
  onRetry,
  onBack,
}: {
  onRetry: () => void
  onBack: () => void
}) {
  return (
    <motion.div
      className="submission-error"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={calmSpring}
    >
      <span className="submission-error-icon">
        <AlertTriangle />
      </span>
      <div>
        <strong>We couldn’t submit this order.</strong>
        <p>Your selections are still saved.</p>
      </div>
      <div className="submission-error-actions">
        <Button onClick={onRetry}>Try again</Button>
        <Button tone="secondary" onClick={onBack}>
          Back to edit
        </Button>
      </div>
    </motion.div>
  )
}

function ReviewOrderPage({ business, 
  type,
  quantities,
  afterCutoff,
  forceError,
  onBack,
  onConfirmed,
}: { business: "fresh" | "style" | "tech"
  type: OrderType
  quantities: OrderDrafts
  afterCutoff: boolean
  forceError: boolean
  onBack: () => void
  onConfirmed: () => void
}) {
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle")
  const items = selectedProducts(business, type, getDraft(quantities, type))
  const totalUnits = items.reduce((total, item) => total + item.quantity, 0)

  async function submitOrder() {
    setSubmissionState("submitting")
    if (forceError) { setSubmissionState("error"); return }
    try {
      await submitStoreOrder({ business, type, items: items.map((item) => ({ id: item.id, quantity: item.quantity })) })
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

      <ReviewContext business={business} type={type} afterCutoff={afterCutoff} />

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

function ConfirmationCard({ business, 
  type,
  afterCutoff,
  items,

}: { business: "fresh" | "style" | "tech", type: OrderType, afterCutoff: boolean

  items: Array<CatalogProduct & { quantity: number }>
}) {
  const totalUnits = items.reduce((total, item) => total + item.quantity, 0)
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
  ]

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

function OrderConfirmationPage({ business, 
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
  const items = selectedProducts(business, type, getDraft(quantities, type))
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

type OrderDetailState = "confirmed" | "deferred" | "scheduled" | "on-way" | "arrived" | "awaiting-confirmation" | "receipt-confirmed" | "receipt-issue"

const orderDetailStages = [
  "Order confirmed",
  "Scheduled",
  "On the way",
  "Arrived",
  "Receipt confirmation",
]

const orderDetailTimestamps: Record<OrderDetailState, string[]> = {
  deferred: ["Wed � 13:46", "-", "-", "-", "-", "-"],
  confirmed: ["Wed · 13:46", "-", "-", "-", "-", "-"],
  scheduled: ["Wed · 13:46", "Wed · 16:35", "-", "-", "-", "-"],
  "on-way": ["Wed · 13:46", "Wed · 16:35", "Thu · 05:48", "-", "-", "-"],
  arrived: ["Wed · 13:46", "Wed · 16:35", "Thu · 05:48", "Thu · 06:43", "-", "-"],

  "awaiting-confirmation": [
    "Wed · 13:46",
    "Wed · 16:35",
    "Thu · 05:48",
    "Thu · 06:43",
    "Thu · 06:45",
    "Current",
  ],
  "receipt-confirmed": [
    "Wed · 13:46",
    "Wed · 16:35",
    "Thu · 05:48",
    "Thu · 06:43",
    "Thu · 06:45",
    "Thu · 06:57",
  ],
  "receipt-issue": [
    "Wed · 13:46",
    "Wed · 16:35",
    "Thu · 05:48",
    "Thu · 06:43",
    "Thu · 06:45",
    "Thu · 06:59",
  ],
}

const orderDetailStep: Record<OrderDetailState, number> = {
  deferred: 0,
  confirmed: 0,
  scheduled: 1,
  "on-way": 2,
  arrived: 3,
  
  "awaiting-confirmation": 5,
  "receipt-confirmed": 5,
  "receipt-issue": 5,
}
function OrderDetailLifecycle({ state, wasDeferred }: { state: OrderDetailState, wasDeferred: boolean }) {
  
  const stages = wasDeferred ? [
    "Order confirmed",
    "Deferred",
    "Scheduled",
    "On the way",
    "Arrived",
    "Receipt confirmation",
  ] : [
    "Order confirmed",
    "Scheduled",
    "On the way",
    "Arrived",
    "Receipt confirmation",
  ];

  let currentStep = 0;
  if (state === "confirmed") currentStep = 0;
  else if (state === "deferred") currentStep = 1;
  else if (state === "scheduled") currentStep = wasDeferred ? 2 : 1;
  else if (state === "on-way") currentStep = wasDeferred ? 3 : 2;
  else if (state === "arrived") currentStep = wasDeferred ? 4 : 3;
  else currentStep = wasDeferred ? 5 : 4;

  const receiptComplete = state === "receipt-confirmed" || state === "receipt-issue";
  
  const timestamps = stages.map((s, i) => {
    if (i > currentStep && !receiptComplete) return "-";
    if (s === "Order confirmed") return "Wed · 13:46";
    if (s === "Deferred") return "Wed · 16:42";
    if (s === "Scheduled") return "Wed · 16:35";
    if (s === "On the way") return "Thu · 05:48";
    if (s === "Arrived") return "Thu · 06:43";
    if (s === "Receipt confirmation") {
      if (state === "receipt-confirmed") return "Thu · 06:57";
      if (state === "receipt-issue") return "Thu · 06:59";
      if (state === "awaiting-confirmation") return "Current";
      return "-";
    }
    return "-";
  });

  return (
    <div className="order-detail-timeline-card">
      <div className="order-detail-lifecycle lifecycle">
        {stages.map((stage, index) => {
          const mode = receiptComplete
            ? "complete"
            : index < currentStep
              ? "complete"
              : index === currentStep
                ? "current"
                : "future"
          return (
            <motion.div
              className={`lifecycle-step lifecycle-step--${mode}`}
              key={stage}
              layout
              transition={calmSpring}
            >
              <motion.span className="step-marker" layout>
                {mode === "complete" ? <Check /> : index + 1}
              </motion.span>
              <span className="step-label">{stage}</span>
              <small>{timestamps[index]}</small>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function OrderDetailHero({ onConfirmArrived, 
  state,
  onReviewDelivery,
}: {
  state: OrderDetailState
  onReviewDelivery: () => void
  onConfirmArrived: () => void
}) {
  const showDeliveryMeta = state !== "confirmed" && state !== "arrived"

  return (
    <motion.div
      className={`order-detail-hero order-detail-hero--${state}`}
      key={state}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={calmSpring}
    >
      {state === "deferred" && (
        <>
          <span className="order-hero-icon" style={{ background: "var(--sunburst-50)", color: "var(--sunburst-600)" }}>
            <CalendarDays />
          </span>
          <div className="order-hero-copy">
            <span className="field-label">Current state</span>
            <div className="order-hero-title">Deferred</div>
            <p>This order has been moved to the next planning cycle.</p>
          </div>
          <div className="planning-facts">
            <span>
              <small>Target planning run</small>
              <strong>Friday, 2 October</strong>
            </span>
            <span>
              <small>Expected arrival</small>
              <strong>Not available yet</strong>
            </span>
          </div>
        </>
      )}

      {state === "confirmed" && (
        <>
          <span className="order-hero-icon">
            <PackageCheck />
          </span>
          <div className="order-hero-copy">
            <span className="field-label">Current state</span>
            <div className="order-hero-title">Order received successfully</div>
            <p>This order is waiting for delivery planning.</p>
          </div>
          <div className="planning-facts">
            <span>
              <small>Target planning run</small>
              <strong>Thursday, 1 October</strong>
            </span>
            <span>
              <small>Expected arrival</small>
              <strong>Not available yet</strong>
            </span>
          </div>
        </>
      )}

      {(state === "scheduled" || state === "on-way") && (
        <>
          <span className="order-hero-icon">
            <Truck />
          </span>
          <div className="order-hero-copy">
            <span className="field-label">Expected arrival</span>
            <div className="tracking-eta">06:40–07:00</div>
            <p>
              {state === "on-way"
                ? "Vehicle departed at 05:48 · On schedule"
                : "Thursday, 1 October · Please have receiving staff ready."}
            </p>
          </div>
        </>
      )}
      {state === "arrived" && (
        <>
          <span className="order-hero-icon" style={{ background: "var(--indigo-50)", color: "var(--indigo-600)" }}>
            <KeyRound />
          </span>
          <div className="order-hero-copy" style={{ minWidth: 0, paddingRight: "var(--space-3)" }}>
            <span className="field-label">Delivery verification</span>
            <div className="order-hero-title">Verify delivery arrival</div>
            <p style={{ marginTop: 4, marginBottom: 16 }}>Give this 4-digit code to the driver to verify the delivery.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {["4", "8", "2", "7"].map((num, i) => (
                <div key={i} style={{ width: 48, height: 56, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, border: "1px solid var(--border)", borderRadius: 6, color: "var(--navy-900)", background: "var(--navy-50)" }}>{num}</div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 13, color: "var(--text-primary)", fontWeight: 500, marginBottom: 8, flexWrap: "wrap" }}>
              <span>ORD-1082</span>
              <span style={{ color: "var(--text-tertiary)" }}>•</span>
              <span>WP-014</span>
              <span style={{ color: "var(--text-tertiary)" }}>•</span>
              <span>PLG-03</span>
              <span style={{ color: "var(--text-tertiary)" }}>•</span>
              <span>Arrived 06:43</span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Note: Only share this code with the driver handling this delivery.</p>
          </div>
          <div className="arrived-action-panel">
            <div>
              <div style={{ fontWeight: 600, color: "var(--navy-900)", marginBottom: 4 }}>Delivery at your store?</div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 12 }}>Confirm after the vehicle has arrived and the driver has verified the code.</p>
            </div>
            <Button onClick={onConfirmArrived} className="full-width-btn">
              Confirm delivery arrived
            </Button>
          </div>
        </>
      )}
      {state === "awaiting-confirmation" && (
        <>
          <span className="order-hero-icon">
            <ReceiptText />
          </span>
          <div className="order-hero-copy">
            <span className="field-label">Action required</span>
            <div className="order-hero-title">
              Delivery awaiting confirmation
            </div>
            <p>
              Driver completed delivery at 06:52. Confirm what arrived at the
              store.
            </p>
          </div>
        </>
      )}

      {(state === "receipt-confirmed" || state === "receipt-issue") && (
        <>
          <span className="order-hero-icon">
            {state === "receipt-confirmed" ? (
              <PackageCheck />
            ) : (
              <AlertTriangle />
            )}
          </span>
          <div className="order-hero-copy">
            <span className="field-label">Store receipt</span>
            <div className="order-hero-title">
              {state === "receipt-confirmed"
                ? "Receipt confirmed"
                : "Receipt confirmed with issue"}
            </div>
            <p>
              {state === "receipt-confirmed"
                ? "The store confirmed all 4 products at 06:57."
                : "The store recorded missing and damaged goods at 06:59."}
            </p>
          </div>
        </>
      )}

      {showDeliveryMeta && (
        <div className="tracking-meta">
          <span>
            <small>Trip</small>
            <strong className="data-id">PLG-03</strong>
          </span>
          <span>
            <small>Vehicle</small>
            <strong className="data-id">WP-014</strong>
          </span>
        </div>
      )}





      {state === "awaiting-confirmation" && (
        <Button className="order-hero-action" onClick={onReviewDelivery}>
          Review delivery
        </Button>
      )}
    </motion.div>
  )
}

const orderActivity = [
  {
    label: "Order received",
    time: "Wed · 13:46",
    step: 0,
    icon: <PackageCheck />,
  },
  {
    label: "Scheduled",
    time: "Wed · 16:35",
    step: 1,
    icon: <CalendarDays />,
  },
  {
    label: "Vehicle departed",
    time: "Thu · 05:48",
    step: 2,
    icon: <Truck />,
  },
  {
    label: "Arrived",
    time: "Thu · 06:43",
    step: 3,
    icon: <CheckCircle2 />,
  },
  {
    label: "Driver completed delivery",
    time: "Thu · 06:52",
    step: 4,
    icon: <ReceiptText />,
  },
]

function OrderActivity({ state }: { state: OrderDetailState }) {
  const currentStep = orderDetailStep[state]
  const receiptComplete =
    state === "receipt-confirmed" || state === "receipt-issue"
  return (
    <div className="order-activity-list">
      {orderActivity
        .filter((activity) => activity.step <= currentStep)
        .map((activity) => (
          <motion.div
            className="order-activity-row"
            key={activity.label}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={calmSpring}
          >
            <span>{activity.icon}</span>
            <div>
              <strong>{activity.label}</strong>
              <small>{activity.time}</small>
            </div>
          </motion.div>
        ))}
      {receiptComplete && (
        <motion.div
          className="order-activity-row"
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={calmSpring}
        >
          <span>
            {state === "receipt-confirmed" ? (
              <PackageCheck />
            ) : (
              <AlertTriangle />
            )}
          </span>
          <div>
            <strong>
              {state === "receipt-confirmed"
                ? "Receipt confirmed"
                : "Receipt confirmed with issue"}
            </strong>
            <small>
              {state === "receipt-confirmed" ? "Thu · 06:57" : "Thu · 06:59"}
            </small>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function PrototypeStateControl<T extends string>({
  value,
  options,
  onChange,
  onSimulatePin,
}: {
  value: T
  options: Array<{
    value: T
    label: string
  }>
  onChange: (value: T) => void
  onSimulatePin?: () => void
}) {
  const stateIndex = options.findIndex((option) => option.value === value)
  return (
    <div className="prototype-state-control">
      <span className="prototype-only-label">Prototype only</span>
      <label>
        <span>Prototype state</span>
        <span className="prototype-select-wrap">
          <select
            value={value}
            onChange={(event) => onChange(event.target.value as T)}
          >
            {options.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown />
        </span>
      </label>
      <div className="prototype-step-actions">
        <button
          type="button"
          disabled={stateIndex === 0}
          onClick={() => onChange(options[Math.max(0, stateIndex - 1)].value)}
        >
          <ArrowLeft />
          Previous
        </button>
        {onSimulatePin && value === "arrived" && (
          <button type="button" onClick={onSimulatePin} style={{ color: "var(--emerald-700)", borderColor: "var(--emerald-600)", background: "var(--emerald-50)" }}>
            <CheckCircle2 style={{ width: 14, height: 14 }} />
            Simulate PIN verified
          </button>
        )}
        <button
          type="button"
          disabled={stateIndex === options.length - 1}
          onClick={() =>
            onChange(
              options[Math.min(options.length - 1, stateIndex + 1)].value,
            )
          }
        >
          Next
          <ArrowRight />
        </button>
      </div>
    </div>
  )
}

function OrderDetailPage({
  orderId = "ORD-1082",
  business,
  state,
  onBack,
  onStateChange,
  onReviewDelivery,
  onBusinessChange,
  onSimulatePin,
  onNavigateDeferred,
}: {
  orderId?: string
  business: "fresh" | "style" | "tech"
  state: OrderDetailState
  onBack: () => void
  onStateChange: (state: OrderDetailState) => void
  onReviewDelivery: () => void
    onOpenOrder: (id: string, view: string, state: string) => void
    onBusinessChange?: (b: "fresh" | "style" | "tech") => void
  onSimulatePin?: () => void
  onNavigateDeferred: () => void
}) {
  
  const [warehouseIssue, setWarehouseIssue] = useState(false)
  const [wasDeferred, setWasDeferred] = useState(state === "deferred")
  
  useEffect(() => {
    if (state === "deferred") setWasDeferred(true)
  }, [state])

  const statusKind: Record<OrderDetailState, StatusKind> = {
    deferred: "deferred",
    confirmed: "confirmed",
    scheduled: "scheduled",
    "on-way": "transit",
    arrived: "arrived",
    
    "awaiting-confirmation": "awaiting",
    "receipt-confirmed": "received",
    "receipt-issue": "issue",
  }
  const items = selectedProducts(business, getDefaultOrderType(business || "fresh"), getDraft(mockDrafts[business], getDefaultOrderType(business || "fresh")))
  const showAction = state === "awaiting-confirmation"
    const stateOptions: Array<{
      value: string
      label: string
    }> = [
      { value: "confirmed", label: "Order confirmed" },
      { value: "deferred", label: "Deferred" },
      { value: "scheduled", label: "Scheduled" },
      { value: "on-way", label: "On the way" },
      { value: "on-way-issue", label: "On the way (Warehouse issue)" },
      { value: "arrived", label: "Arrived" },
      { value: "awaiting-confirmation", label: "Awaiting confirmation" },
      { value: "receipt-confirmed", label: "Receipt confirmed" },
      { value: "receipt-issue", label: "Receipt confirmed with issue" },
    ]

  const activeOptions = stateOptions.filter(o => {
    if (o.value === "on-way-issue") return false;
    if (o.value === "deferred" && state !== "confirmed" && state !== "deferred") return false;
    return true;
  });

  return (
    <div className="order-detail-page">
      <div className="order-detail-utility-row">
        <button className="order-back-link" type="button" onClick={onBack}>
          <ArrowLeft />
          Back to Home
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <PrototypeStateControl
              value={state}
              options={activeOptions}
              onChange={(val) => {
                onStateChange(val as OrderDetailState)
              }}
              onSimulatePin={onSimulatePin}
            />

            {state === "on-way" && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", background: "var(--slate-50)", padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>
                <input 
                  type="checkbox" 
                  checked={warehouseIssue} 
                  onChange={(e) => setWarehouseIssue(e.target.checked)} 
                />
                Simulate warehouse issue
              </label>
            )}
          </div>
      </div>

      <div className="order-detail-header">
        <div>
          <div className="order-detail-title-row">
            <div className="page-title data-title">{orderId}</div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={state}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <StatusPill kind={statusKind[state]} />
              </motion.div>
            </AnimatePresence>
          </div>
          <p>{formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh"))} · {formatOutlet(business)}</p>
        </div>
      </div>

      <OrderDetailLifecycle state={state} wasDeferred={wasDeferred} />

      <div className="order-detail-layout">
        <div className="order-detail-primary">
          
          
          


          <OrderDetailHero state={state} onReviewDelivery={onReviewDelivery} onConfirmArrived={() => onStateChange("awaiting-confirmation")} />

{state === "deferred" && (
            <motion.div className="delivery-update-card" style={{ marginTop: -16, marginBottom: 24 }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={calmSpring}>
              <div className="order-detail-section-heading">
                <div>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CircleAlert size={16} /> Delivery deferred
                  </span>
                  <small>No action required.</small>
                </div>
              </div>
              <div className="delivery-update-grid">
                <span>
                  <small>Original plan</small>
                  <strong>Thursday, 1 October</strong>
                </span>
                <span className="delivery-update-new">
                  <small>New expected delivery</small>
                  <strong>Friday, 2 October</strong>
                </span>
                <span>
                  <small>Reason</small>
                  <strong>{business === "fresh" ? "Refrigerated delivery capacity unavailable" : "Vehicle capacity constraints"}</strong>
                </span>
              </div>
            </motion.div>
          )}


          <AnimatePresence>
            {state === "on-way" && warehouseIssue && (
              <motion.div
                className="warehouse-issue-card"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={calmSpring}
                style={{ overflow: "hidden" }}
              >
                <div style={{ display: "flex", gap: "12px", padding: "16px", background: "var(--sunburst-50)", border: "1px solid var(--sunburst-200)", borderRadius: "8px" }}>
                  <AlertTriangle style={{ color: "var(--sunburst-600)", width: 20, height: 20, flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: "block", color: "var(--sunburst-900)", fontSize: 14, marginBottom: 4 }}>Order out for delivery with an issue</strong>
                    <p style={{ margin: "0 0 8px 0", color: "var(--sunburst-900)", fontSize: 13, lineHeight: 1.4 }}>2 cartons of Milk powder were unavailable during loading.</p>
                    <span style={{ color: "var(--sunburst-700)", fontSize: 12 }}>Reported during loading &middot; 05:32</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          {state === "confirmed" && (
            <div className="order-detail-info">
              <span className="next-steps-icon">
                <Clock3 />
              </span>
              <div>
                <strong>What happens next?</strong>
                <p>
                  Once the dispatcher schedules this order, the expected arrival
                  time will appear here.
                </p>
              </div>
            </div>
          )}

          <section className="ordered-products-panel">
            <div className="order-detail-section-heading">
              <div>
                <span>Ordered products</span>
                <small>The quantities originally requested.</small>
              </div>
              <span>4 products · 80 units</span>
            </div>
            <ReviewProductList items={items} />
          </section>
        </div>

        <aside className="order-record-panel">
          <div className="order-detail-section-heading">
            <div>
              <span>Record history</span>
              <small>Activity for this order.</small>
            </div>
          </div>
          <OrderActivity state={state} />

          <div className="order-record-meta">
            <span>
              <small>Order type</small>
              <strong>{formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh"))}</strong>
            </span>
            <span>
              <small>Target date</small>
              <strong>Thursday, 1 October</strong>
            </span>
            <span>
              <small>Outlet</small>
              <strong>{formatOutlet(business)}</strong>
            </span>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {showAction && (
          <motion.div
            className="order-detail-mobile-action"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={calmSpring}
          >
            <Button size="mobile" onClick={onReviewDelivery}>
              Review delivery
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

type ReceiptFlowState = "verify" | "full" | "issue-edit" | "issue-review" | "confirmed" | "confirmed-issue"

type ReceiptIssueType = "good" | "missing" | "damaged" | "temperature" | "wrong-variant" | "wrong-item" | "seal" | "condition" | "other"



function ReceiptReadOnlySummary({ business = "fresh" }: { business?: "fresh" | "style" | "tech" }) {
  const receiptProducts = selectedProducts(business, getDefaultOrderType(business || "fresh"), getDraft(mockDrafts[business], getDefaultOrderType(business || "fresh")))
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

function ReceiptGoodRows({ business = "fresh" }: { business?: "fresh" | "style" | "tech" }) {
  const receiptProducts = selectedProducts(business, getDefaultOrderType(business || "fresh"), getDraft(mockDrafts[business], getDefaultOrderType(business || "fresh")))
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

function IssueChips({
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
  ]
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

function ReceiptIssueRow({
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
  const missing = Math.max(0, product.quantity - received)
  let summaryText = "Good"
  let statusClass = "status-good"
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

function ReceiptConfirmationState({
  orderId = "ORD-1082",
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

function ReceiptFlowPage({ 
  business,
  state,
  onStateChange,
  onBack,
  onHome,
  onViewOrder,
  onBusinessChange,
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
  const receiptProducts = selectedProducts(business, getDefaultOrderType(business || "fresh"), getDraft(mockDrafts[business], getDefaultOrderType(business || "fresh")))
  const [received, setReceived] = useState<Record<string, number>>({
    rice: 20,
    "milk-powder": 28,
    flour: 10,
    "cooking-oil": 20,
  })
  const [issueTypes, setIssueTypes] =
    useState<Record<string, ReceiptIssueType>>({
      rice: "good",
      "milk-powder": "missing",
      flour: "good",
      "cooking-oil": "damaged",
    })
  const [damaged, setDamaged] = useState<Record<string, number>>({
    "cooking-oil": 1,
  })
  const [issueSearch, setIssueSearch] = useState("")
  const [expandedIssueId, setExpandedIssueId] = useState<string | undefined>(undefined)
  const [remark, setRemark] = useState(
    "One bottle was damaged during unloading.",
  )
  const [photoAdded, setPhotoAdded] = useState(false)
  const stateOptions: Array<{
    value: ReceiptFlowState
    label: string
  }> = [
    { value: "verify", label: "Verify" },
    { value: "full", label: "Full receipt" },
    { value: "issue-edit", label: "Issue editing" },
    { value: "issue-review", label: "Issue review" },
    { value: "confirmed", label: "Receipt confirmed" },
    { value: "confirmed-issue", label: "Receipt confirmed with issue" },
  ]
  const success = state === "confirmed" || state === "confirmed-issue"

  return (
    <div className="receipt-flow-page">
      <div className="order-detail-utility-row">
        <button className="order-back-link" type="button" onClick={onBack}>
          <ArrowLeft />
          Back to order
        </button>
        <PrototypeStateControl
          value={state}
          options={stateOptions}
          onChange={onStateChange}
        />
      </div>

      {!success && (
        <div className="receipt-page-header">
          <div>
            <span className="page-kicker">ORD-1082 · {formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh"))}</span>
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
                  onToggle={() => setExpandedIssueId((current: string | undefined) => current === product.id ? undefined : product.id)}
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


const deferredProducts: Array<CatalogProduct & { quantity: number }> = [
  { id: "fresh-milk", name: "Fresh milk", unit: "carton", quantity: 24 },
  { id: "chicken", name: "Chicken", unit: "kg", quantity: 20 },
  {
    id: "frozen-vegetables",
    name: "Frozen vegetables",
    unit: "box",
    quantity: 10,
  },
  { id: "yoghurt", name: "Yoghurt", unit: "crate", quantity: 8 },
]

const deferredStages = [
  "Order confirmed",
  "Deferred",
  "Awaiting reschedule",
  "Scheduled",
  "Delivery",
]





function OrdersPage({
  business,
  onOpenOrder,
  onNewOrder,
}: {
  business: "fresh" | "style" | "tech"
  onOpenOrder: (id: string, view: string, state: string) => void
  onNewOrder: () => void
}) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    storeDeliveryApi.orderHistory()
      .then((data: any) => {
        if (active) {
          setOrders(data.items || data || [])
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load order history")
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [business])

  return (
    <div className="home-page" style={{ padding: "var(--space-8)" }}>
      <div className="home-page-header">
        <div>
          <div className="page-title">Order History</div>
          <p>Review past orders and receipts.</p>
        </div>
      </div>

      {loading && <div style={{ padding: "var(--space-8)", textAlign: "center" }}>Loading orders...</div>}
      
      {error && !loading && (
        <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--issue-text)" }}>
          {error}
          <br /><br />
          <Button onClick={() => window.location.reload()} tone="primary">Retry</Button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-secondary)" }}>
          <p>No order history available.</p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="upcoming-list" style={{ marginTop: "var(--space-6)" }}>
          {orders.map((order) => (
            <div key={order._id || order.id || order.orderNumber} className="upcoming-row" onClick={() => onOpenOrder(order.orderNumber || order.id || order._id, "order-detail", order.status || "confirmed")}>
              <div className="upcoming-row-main">
                <strong>{order.orderNumber || order.id || order._id}</strong>
                <span>{order.status || "Unknown"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DeliveriesPage({ business, onOpenOrder }: { business: "fresh" | "style" | "tech", onOpenOrder: (id: string, view: string, state: string) => void }) {
  const [liveDeliveries, setLiveDeliveries] = useState<StoreDelivery[]>([])
  const [issuedPin, setIssuedPin] = useState<{ deliveryId: string; pin: string; expiresAt: string } | null>(null)
  const [liveError, setLiveError] = useState("")
  const prototypeMode = import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === "true"

  useEffect(() => {
    if (prototypeMode) return
    void storeDeliveryApi.list().then(setLiveDeliveries).catch((error) => setLiveError(error instanceof Error ? error.message : "Unable to load deliveries."))
  }, [prototypeMode])

  async function issuePin(delivery: StoreDelivery) {
    try {
      const result = await storeDeliveryApi.issuePin(delivery._id)
      setIssuedPin({ deliveryId: delivery._id, ...result })
      setLiveError("")
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : "Unable to issue a PIN.")
    }
  }

  async function confirmReceipt(delivery: StoreDelivery) {
    if (!window.confirm("Confirm that the full delivery was received with no issues?")) return
    try {
      const updated = await storeDeliveryApi.confirmFullReceipt(delivery)
      setLiveDeliveries((current) => current.map((item) => item._id === updated._id ? updated : item))
      setLiveError("")
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : "Unable to confirm the receipt.")
    }
  }
  const deliveries = [
    { section: "Needs attention", id: "ORD-1045", type: "", date: "", statusLabel: "Awaiting confirmation", status: "awaiting" as StatusKind, subtext: "Driver completed delivery at 06:52", view: "verify-delivery", state: "verify" },
    { section: "Upcoming", id: "ORD-1062", type: formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")), date: "Tomorrow · Thursday, 1 October", statusLabel: "Scheduled", status: "scheduled" as StatusKind, eta: "Expected arrival 06:40–07:00", subtext: "Trip PLG-03 · Vehicle WP-014", view: "order-detail", state: "scheduled" },
    { section: "Upcoming", id: "ORD-1065", type: formatOrderType(business || "fresh", business === "fresh" ? "chilled" : getDefaultOrderType(business || "fresh")), date: "Friday, 2 October", statusLabel: "Deferred", status: "deferred" as StatusKind, subtext: "New date Friday, 2 October", view: "order-detail", state: "deferred" },
    { section: "In progress", id: "ORD-1082", type: formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")), date: "", statusLabel: "On the way", status: "transit" as StatusKind, eta: "Expected arrival 06:40–07:00", subtext: "Departed 05:48", view: "order-detail", state: "on-way" },
    { section: "Recent", id: "ORD-1037", type: formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")), date: "Today · 06:57", statusLabel: "Receipt confirmed", status: "received" as StatusKind, view: "order-detail", state: "receipt-confirmed" },
    { section: "Recent", id: "ORD-1034", type: formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")), date: "Yesterday", statusLabel: "Receipt confirmed with issue", status: "issue" as StatusKind, view: "order-detail", state: "receipt-issue" },
  ]
  
  const sections = ["Needs attention", "In progress", "Upcoming", "Recent"]

  return (
    <div className="">
      <div className="page-header">
        <div>
          <div className="page-title">Deliveries</div>
          <p>See upcoming, active, and recently completed deliveries for your store.</p>
        </div>
      </div>

      <div style={{ marginTop: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        {!prototypeMode ? (
          <section>
            <span className="eyebrow" style={{ display: "block", marginBottom: "var(--space-3)" }}>Live deliveries</span>
            {liveError ? <div className="work-alert" role="alert">{liveError}</div> : null}
            {issuedPin ? (
              <div className="work-alert" role="status">
                Delivery PIN <strong className="data-id" style={{ fontSize: 22 }}>{issuedPin.pin}</strong> · expires {new Date(issuedPin.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            ) : null}
            <div className="upcoming-list">
              {liveDeliveries.map((delivery) => (
                <div className="upcoming-row" key={delivery._id}>
                  <span className="upcoming-record"><strong className="data-id">{delivery._id.slice(-8).toUpperCase()}</strong><span>{delivery.items.length} products</span></span>
                  <span className="upcoming-date">{delivery.arrivedAt ? new Date(delivery.arrivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Scheduled"}</span>
                  <span className="upcoming-status"><strong>{delivery.status.replace(/_/g, " ")}</strong></span>
                  {delivery.status === "arrived" ? <Button onClick={() => void issuePin(delivery)}>Issue PIN</Button> : null}
                  {delivery.status === "completed" && !delivery.receipt ? <Button onClick={() => void confirmReceipt(delivery)}>Confirm receipt</Button> : null}
                </div>
              ))}
              {!liveDeliveries.length && !liveError ? <p>No live deliveries for this outlet.</p> : null}
            </div>
          </section>
        ) : null}
        {prototypeMode ? sections.map(section => {
          const items = deliveries.filter(d => d.section === section)
          if (items.length === 0) return null
          return (
            <section key={section}>
              <span className="eyebrow" style={{ display: "block", marginBottom: "var(--space-3)" }}>{section}</span>
              <div className="upcoming-list">
                {items.map(order => (
                  <motion.button
                    key={order.id}
                    className="upcoming-row"
                    type="button"
                    layout
                    onClick={() => onOpenOrder(order.id, order.view, order.state)}
                    whileTap={{ scale: 0.99 }}
                    transition={calmSpring}
                  >
                    <span className="upcoming-record">
                      <strong className="data-id">{order.id}</strong>
                      {order.type && <span>{order.type}</span>}
                    </span>
                    <span className="upcoming-date">
                      {order.date ? (
                        <>
                          <CalendarDays />
                          {order.date}
                        </>
                      ) : null}
                    </span>
                    <span className="upcoming-status">
                      <StatusPill kind={order.status} />
                      {(order.eta || order.subtext) && (
                        <small style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {order.eta && <span>{order.eta}</span>}
                          {order.subtext && <span style={{ opacity: 0.8 }}>{order.subtext}</span>}
                        </small>
                      )}
                    </span>
                    <ArrowRight className="row-arrow" />
                  </motion.button>
                ))}
              </div>
            </section>
          )
        }) : null}
        {deliveries.filter(d => d.section === "Needs attention").length === 0 && (
          <div style={{ textAlign: "center", padding: "var(--space-8) 0", color: "var(--text-secondary)" }}>
            <CheckCircle2 style={{ margin: "0 auto var(--space-2)", opacity: 0.5, display: "block" }} />
            <p style={{ margin: 0 }}>No deliveries need attention. Everything is up to date.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const prototypeState = params.get("state")
  const prototypeView = params.get("view")
  const initialBusiness = (params.get("business") as "fresh" | "style" | "tech") || "fresh"
  const [business, setBusiness] = useState<"fresh" | "style" | "tech">(initialBusiness)
  const showAttention = prototypeState !== "no-attention"
  const afterCutoff = prototypeState === "after-cutoff"
  const showUpcoming = prototypeState !== "no-upcoming"
  const initialOrderType: OrderType =
    prototypeState === "chilled" ? "chilled" : "dry"
  const [orderType, setOrderType] = useState<OrderType>(initialOrderType)

  function handleBusinessChange(newBusiness: "fresh" | "style" | "tech") {
    setBusiness(newBusiness)
    setOrderType(getDefaultOrderType(newBusiness))
  }
  const [drafts, setDrafts] = useState<OrderDrafts>({ dry: {}, chilled: {}, products: {} } as unknown as OrderDrafts)

  useEffect(() => {
    if (prototypeState !== "empty") {
      
    }
  }, [business])
  const [view, setView] =
    useState<"home" | "orders" | "deliveries" | "new-order" | "review" | "confirmation" | "order-detail" | "deferred-detail" | "verify-delivery">(
      prototypeView === "new-order" ||
        prototypeView === "orders" ||
        prototypeView === "deliveries" ||
        prototypeView === "review" ||
        prototypeView === "confirmation" ||
        prototypeView === "order-detail" ||
        prototypeView === "verify-delivery"
        ? (prototypeView as any)
        : "home",
    )
  const getBottomNavTab = (v: string) => {
    if (v === "home" || v === "new-order" || v === "review" || v === "confirmation") return "Home"
    if (v === "orders" || v === "order-detail" ) return "Orders"
    if (v === "deliveries" || v === "verify-delivery") return "Deliveries"
    return "Home"
  }
  const currentNav = getBottomNavTab(view)
  const initialOrderDetailState: OrderDetailState =
    prototypeState === "scheduled" ||
    prototypeState === "on-way" ||
    prototypeState === "arrived" ||
    prototypeState === "awaiting-confirmation" ||
    prototypeState === "receipt-confirmed" ||
    prototypeState === "receipt-issue"
      ? prototypeState
      : "confirmed"
  const [orderDetailState, setOrderDetailState] = useState<OrderDetailState>(
    initialOrderDetailState,
  )

  const initialReceiptState: ReceiptFlowState =
    prototypeState === "full"
      ? "full"
      : prototypeState === "issue-edit"
        ? "issue-edit"
        : prototypeState === "issue-review"
          ? "issue-review"
          : prototypeState === "receipt-confirmed"
            ? "confirmed"
            : prototypeState === "receipt-confirmed-issue"
              ? "confirmed-issue"
              : "verify"
  const [receiptFlowState, setReceiptFlowState] =
    useState<ReceiptFlowState>(initialReceiptState)
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(undefined)

  
    function handleOpenOrder(id: string, nextView: string, state: string) {
    setSelectedOrderId(id)
    if (state) {
      if (nextView === "order-detail") setOrderDetailState(state as OrderDetailState)
      if (nextView === "verify-delivery") setReceiptFlowState(state as ReceiptFlowState)
    }
    setView(nextView as any)
  }

  
  const directionRef = useRef(0)
  const viewIndex = { home: 0, orders: 1, deliveries: 2 }
  const pageVariants = {
    enter: (direction: number) => ({ x: direction * 24, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction * -24, opacity: 0 })
  }

  function navigate(label: string) {
    const nextView = label.toLowerCase() as "home" | "orders" | "deliveries"
    const currentIndex = (viewIndex as any)[view] ?? 0
    const nextIndex = viewIndex[nextView] ?? 0
    if (nextIndex !== currentIndex) {
      directionRef.current = nextIndex > currentIndex ? 1 : -1
    }
    setView(nextView)
  }

  const mainContentRef = useRef<HTMLElement>(null)


  useEffect(() => {
    // Desktop window scroll
    window.scrollTo(0, 0)
    // Mobile flex shell scroll
    mainContentRef.current?.scrollTo({ top: 0, behavior: "auto" })
  }, [view])

  return (
    <div className="app-shell">
      <div className="app-area">
        <TopBar business={business} current={currentNav} onNavigate={navigate} afterCutoff={prototypeState === "after-cutoff" || prototypeState === "full"} />
        <main className="main-content" ref={mainContentRef}>
          <AnimatePresence mode="wait" initial={false} custom={directionRef.current}>
          {view === "home" && (
            <motion.div key="home" custom={directionRef.current} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: "easeOut" }}>
              <HomePage
                business={business}
                onBusinessChange={handleBusinessChange}
                showAttention={showAttention}
                afterCutoff={afterCutoff}
                showUpcoming={showUpcoming}
                onNewOrder={() => setView("new-order")}
                onOpenDeferred={() => {
                  setOrderDetailState("deferred")
                  setView("order-detail")
                }}
                onOpenOrder={handleOpenOrder}
                onNavigate={navigate}
              />
            </motion.div>
          )}
          {view === "orders" && (
            <motion.div key="orders" custom={directionRef.current} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: "easeOut" }}>
              <OrdersPage business={business}
                  onNewOrder={() => setView("new-order")}
                  onOpenOrder={handleOpenOrder}
                />
            </motion.div>
          )}

          {view === "deliveries" && (
            <motion.div key="deliveries" custom={directionRef.current} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: "easeOut" }}>
              <DeliveriesPage business={business} 
                onOpenOrder={handleOpenOrder}
              />
            </motion.div>
          )}

          {view === "new-order" && (
            <motion.div
              key="new-order"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <NewOrderPage business={business}
                afterCutoff={afterCutoff}
                type={orderType}
                onTypeChange={setOrderType}
                quantities={drafts}
                onQuantitiesChange={setDrafts}
                initialSearch={prototypeState === "search" ? "Rice" : ""}
                initialSummaryOpen={prototypeState === "summary"}
                onReview={() => setView("review")}
              />
            </motion.div>
          )}

          {view === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <ReviewOrderPage business={business}
                type={orderType}
                quantities={drafts}
                afterCutoff={afterCutoff}
                forceError={prototypeState === "submit-error"}
                onBack={() => setView("new-order")}
                onConfirmed={() => setView("confirmation")}
              />
            </motion.div>
          )}

          {view === "confirmation" && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={calmSpring}
            >
              <OrderConfirmationPage business={business}
                type={orderType}
                quantities={drafts}
                afterCutoff={afterCutoff}
                onHome={() => setView("home")}
                onViewOrder={() => {
                  setOrderDetailState("confirmed")
                  setView("order-detail")
                }}
              />
            </motion.div>
          )}

          {view === "order-detail" && (
            <motion.div
              key="order-detail"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <OrderDetailPage
                orderId={selectedOrderId}
                business={business}
                onBusinessChange={handleBusinessChange}
                state={orderDetailState}
                onBack={() => setView("home")}
                onStateChange={setOrderDetailState}
                onOpenOrder={handleOpenOrder}
                onNavigateDeferred={() => {
                    setOrderDetailState("deferred"); setView("order-detail")
                  }}
                  onReviewDelivery={() => {
                  setReceiptFlowState("verify")
                  setView("verify-delivery")

                }}
              />
            </motion.div>
          )}

          

          {view === "verify-delivery" && (
            <motion.div
              key="verify-delivery"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <ReceiptFlowPage
                orderId={selectedOrderId}
                business={business}
                onBusinessChange={handleBusinessChange}
                state={receiptFlowState}
                onStateChange={setReceiptFlowState}
                onBack={() => {
                  setOrderDetailState("awaiting-confirmation")
                  setView("order-detail")
                }}
                onHome={() => setView("home")}
                onOpenOrder={handleOpenOrder}
                onViewOrder={(withIssue) => {
                  setOrderDetailState(
                    withIssue ? "receipt-issue" : "receipt-confirmed",
                  )
                  setView("order-detail")
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </main>
      </div>
      <BottomNavigation current={currentNav} onNavigate={navigate} />
    </div>
  )
}



