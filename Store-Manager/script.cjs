const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = unction BottomNavigation({
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
  const dragStartRef = useRef<{ x: number; y: number; active: boolean; baseX: number } | null>(null)
  
  const indicatorLeft = useMotionValue(0)
  const indicatorRight = useMotionValue(0)
  const indicatorCenter = useTransform([indicatorLeft, indicatorRight], ([l, r]) => ((l as number) + (r as number)) / 2)
  const indicatorWidth = useTransform([indicatorLeft, indicatorRight], ([l, r]) => (r as number) - (l as number))

  useEffect(() => {
    return indicatorCenter.on("change", (latest) => {
      if (dragStartRef.current?.active) return
      
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

  const leadingSpring = { type: "spring", stiffness: 500, damping: 34, mass: 0.45 }
  const trailingSpring = { type: "spring", stiffness: 420, damping: 30, mass: 0.65 }
  const prevIndexRef = useRef(currentIndex)

  // Sync indicator when current tab changes externally
  useEffect(() => {
    if (navRef.current && !dragStartRef.current?.active) {
      const slotWidth = navRef.current.getBoundingClientRect().width / 3
      const inset = 8
      const targetLeft = currentIndex * slotWidth + inset
      const targetRight = (currentIndex + 1) * slotWidth - inset

      if (indicatorRight.get() === 0) {
        // Initial setup
        indicatorLeft.set(targetLeft)
        indicatorRight.set(targetRight)
        prevIndexRef.current = currentIndex
        return
      }

      const prevIndex = prevIndexRef.current
      prevIndexRef.current = currentIndex

      if (currentIndex === prevIndex) {
        animate(indicatorLeft, targetLeft, trailingSpring)
        animate(indicatorRight, targetRight, trailingSpring)
      } else if (currentIndex > prevIndex) {
        // Forward stretch
        animate(indicatorRight, targetRight, leadingSpring)
        animate(indicatorLeft, targetLeft, { ...trailingSpring, delay: 0.05 })
      } else {
        // Backward stretch
        animate(indicatorLeft, targetLeft, leadingSpring)
        animate(indicatorRight, targetRight, { ...trailingSpring, delay: 0.05 })
      }
    }
  }, [currentIndex, indicatorLeft, indicatorRight])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!navRef.current) return
    didDragRef.current = false
    const slotWidth = navRef.current.getBoundingClientRect().width / 3
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      active: false,
      baseX: currentIndex * slotWidth
    }
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
      const inset = 8
      let newBaseX = dragStartRef.current.baseX + deltaX
      // clamp
      if (newBaseX < 0) newBaseX = 0
      if (newBaseX > slotWidth * 2) newBaseX = slotWidth * 2
      
      indicatorLeft.set(newBaseX + inset)
      indicatorRight.set(newBaseX + slotWidth - inset)
    }
  }

  const handlePointerUp = () => {
    if (!dragStartRef.current || !navRef.current) return
    
    if (dragStartRef.current.active) {
      const slotWidth = navRef.current.getBoundingClientRect().width / 3
      const center = indicatorLeft.get() + (indicatorRight.get() - indicatorLeft.get()) / 2
      let targetIndex = Math.floor(center / slotWidth)
      if (targetIndex < 0) targetIndex = 0
      if (targetIndex > 2) targetIndex = 2
      
      onNavigate(navigation[targetIndex].label)
      
      if (targetIndex === currentIndex) {
        const inset = 8
        animate(indicatorLeft, targetIndex * slotWidth + inset, trailingSpring)
        animate(indicatorRight, (targetIndex + 1) * slotWidth - inset, trailingSpring)
      }
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
          className={\ottom-nav-item \\}
          key={label};

const regex = /function BottomNavigation\([\s\S]*?key=\{label\}/;
code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log('Replaced BottomNavigation');
