const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix the one inside HomePage
code = code.replace(/<AnimatePresence mode="wait" initial=\{false\} custom=\{directionRef\.current\}>/, '<AnimatePresence mode="wait" initial={false}>');

// Now add it to the one inside App
code = code.replace(/<main className="main-content" ref=\{mainContentRef\}>\r?\n\s*<AnimatePresence mode="wait" initial=\{false\}>/, '<main className="main-content" ref={mainContentRef}>\n          <AnimatePresence mode="wait" initial={false} custom={directionRef.current}>');

fs.writeFileSync('src/App.tsx', code);
