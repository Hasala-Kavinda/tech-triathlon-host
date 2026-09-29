const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/directionRef\.current = nextIndex > currentIndex \? -1 : 1/, 'directionRef.current = nextIndex > currentIndex ? 1 : -1');

fs.writeFileSync('src/App.tsx', code);
