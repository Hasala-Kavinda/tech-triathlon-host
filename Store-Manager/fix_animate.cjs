const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/<AnimatePresence mode="wait" initial=\{false\} custom=\{directionRef.current\}>\r?\n\s*\{showUpcoming \? \(/g, '<AnimatePresence mode="wait" initial={false}>\n            {showUpcoming ? (');
code = code.replace(/<AnimatePresence mode="wait" initial=\{false\} custom=\{directionRef.current\}>\r?\n\s*<motion.div\r?\n\s*key=\{state\}/g, '<AnimatePresence mode="wait" initial={false}>\n              <motion.div\n                key={state}');

fs.writeFileSync('src/App.tsx', code);
