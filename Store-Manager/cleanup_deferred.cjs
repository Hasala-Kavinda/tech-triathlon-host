const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove deferred-detail from Router
code = code.replace(/\{view === "deferred-detail" && \([\s\S]*?<\/motion\.div>\s*\)\}/, '');
// Wait, the regex might be greedy or fail. I'll use a precise replace.
