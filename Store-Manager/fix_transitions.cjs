const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const refStr = `
  const directionRef = useRef(0)
  const viewIndex = { home: 0, orders: 1, deliveries: 2 }
  const pageVariants = {
    enter: (direction: number) => ({ x: direction * 24, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction * -24, opacity: 0 })
  }
`;

code = code.replace(/function navigate\(label: string\) \{[\s\S]*?const mainContentRef = useRef<HTMLElement>\(null\)/, refStr + `
  function navigate(label: string) {
    const nextView = label.toLowerCase() as "home" | "orders" | "deliveries"
    const currentIndex = (viewIndex as any)[view] ?? 0
    const nextIndex = viewIndex[nextView] ?? 0
    if (nextIndex !== currentIndex) {
      directionRef.current = nextIndex > currentIndex ? -1 : 1
    }
    setView(nextView)
  }

  const mainContentRef = useRef<HTMLElement>(null)
`);

code = code.replace(/<AnimatePresence mode="wait" initial=\{false\}>/, '<AnimatePresence mode="wait" initial={false} custom={directionRef.current}>');

code = code.replace(/<motion\.div\s*key="home"\s*initial=\{\{ opacity: 0, x: -8 \}\}\s*animate=\{\{ opacity: 1, x: 0 \}\}\s*exit=\{\{ opacity: 0, x: -8 \}\}\s*transition=\{\{ duration: 0.2, ease: "easeOut" \}\}\s*>/, '<motion.div key="home" custom={directionRef.current} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: "easeOut" }}>');

code = code.replace(/<motion\.div\s*key="orders"\s*initial=\{\{ opacity: 0, x: 10 \}\}\s*animate=\{\{ opacity: 1, x: 0 \}\}\s*exit=\{\{ opacity: 0, x: 10 \}\}\s*transition=\{\{ duration: 0.2, ease: "easeOut" \}\}\s*>/, '<motion.div key="orders" custom={directionRef.current} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: "easeOut" }}>');

code = code.replace(/<motion\.div\s*key="deliveries"\s*initial=\{\{ opacity: 0, x: 10 \}\}\s*animate=\{\{ opacity: 1, x: 0 \}\}\s*exit=\{\{ opacity: 0, x: -8 \}\}\s*transition=\{\{ duration: 0.22, ease: "easeOut" \}\}\s*>/, '<motion.div key="deliveries" custom={directionRef.current} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: "easeOut" }}>');

fs.writeFileSync('src/App.tsx', code);
