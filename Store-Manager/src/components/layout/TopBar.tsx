import wayTrackLogo from '../../assets/waytrack-logo.png';
import { Bell, ChevronDown, LogOut, Box, Clock3, Plus } from "lucide-react";
import {  AnimatePresence, motion, useMotionValue, useTransform, animate  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {  IconButton, Button  } from '../common/Button';
import { calmSpring, navigation } from '../../lib/constants';

export function TopBar({
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
    const [showNotifs, setShowNotifs] = useState(false);
    const [showCutoff, setShowCutoff] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const cutoffRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
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

export function Sidebar({
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

export function BrandMark({ compact = false, onClick }: { compact?: boolean, onClick?: () => void }) {
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

export function OutletIdentity({ business = "fresh" }: { business?: "fresh" | "style" | "tech" }) {
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

export function GlobalCutoff({ closed = false, open, setOpen }: { closed?: boolean, open: boolean, setOpen: (v: boolean) => void }) {
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

export function FloatingNewOrder({ onClick }: { onClick: () => void }) {
    return (
    <div className="floating-new-order">
      <Button icon={<Plus />} onClick={onClick} tone="primary">
        New order
      </Button>
    </div>
    )
}

export function BottomNavigation({
      current,
      onNavigate,
    }: {
          current: string
          onNavigate: (label: string) => void
        }) {
    const tabIndex = navigation.findIndex((n) => n.label === current);
    const lastValidIndex = useRef(0);
    if (tabIndex >= 0) {
    lastValidIndex.current = tabIndex
    }

    const currentIndex = tabIndex >= 0 ? tabIndex : lastValidIndex.current;
    const [visualIndex, setVisualIndex] = useState(currentIndex);
    const navRef = useRef<HTMLElement>(null);
    const didDragRef = useRef(false);
    const dragStartRef = useRef<{ x: number; y: number; active: boolean; magneticIndex: number } | null>(null);
    const baseLeft = useMotionValue(0);
    const baseRight = useMotionValue(0);
    const dragOffsetLeft = useMotionValue(0);
    const dragOffsetRight = useMotionValue(0);
    const indicatorLeft = useTransform([baseLeft, dragOffsetLeft], ([b, d]) => (b as number) + (d as number));
    const indicatorRight = useTransform([baseRight, dragOffsetRight], ([b, d]) => (b as number) + (d as number));
    const indicatorCenter = useTransform([indicatorLeft, indicatorRight], ([l, r]) => ((l as number) + (r as number)) / 2);
    const indicatorWidth = useTransform([indicatorLeft, indicatorRight], ([l, r]) => (r as number) - (l as number));
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
    const leadingSpring = { type: "spring" as const, stiffness: 500, damping: 34, mass: 0.45 };
    const trailingSpring = { type: "spring" as const, stiffness: 420, damping: 30, mass: 0.65 };
    const magneticSpring = { type: "spring" as const, stiffness: 600, damping: 32, mass: 0.45 };
    const prevIndexRef = useRef(currentIndex);
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
          };
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
          };
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
          };
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
