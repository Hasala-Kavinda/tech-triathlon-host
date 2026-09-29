const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/<motion\.div\r?\n\s*key="deliveries"\r?\n\s*initial=\{\{ opacity: 0, x: 10 \}\}\r?\n\s*animate=\{\{ opacity: 1, x: 0 \}\}\r?\n\s*exit=\{\{ opacity: 0, x: 10 \}\}\r?\n\s*transition=\{\{ duration: 0.2, ease: "easeOut" \}\}\r?\n\s*>/, '<motion.div key="deliveries" custom={directionRef.current} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: "easeOut" }}>');

fs.writeFileSync('src/App.tsx', code);
