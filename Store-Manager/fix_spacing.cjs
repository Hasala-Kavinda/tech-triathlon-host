const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

// Global (Desktop) main-content
code = code.replace(/\.main-content \{\r?\n\s*width: min\(1180px, calc\(100% - 64px\)\);\r?\n\s*margin: 0 auto;\r?\n\s*padding: 24px 0 104px;\r?\n\}/, '.main-content {\n  width: min(1180px, calc(100% - 64px));\n  margin: 0 auto;\n  padding: 16px 0 104px;\n}');

// Mobile main-content
code = code.replace(/\.main-content \{\r?\n\s*width: 100%;\r?\n\s*padding: var\(--space-4\) var\(--space-4\) var\(--space-7\);\r?\n\s*\}/g, '.main-content {\n    width: 100%;\n    padding: 12px var(--space-4) var(--space-7);\n  }');

// home-page
code = code.replace(/\.home-page \{\r?\n\s*padding-top: var\(--space-4\);\r?\n\s*padding-bottom: var\(--space-6\);\r?\n\s*\}/g, '.home-page {\n    padding-top: 0;\n    padding-bottom: var(--space-6);\n  }');
code = code.replace(/\.home-page \{\r?\n\s*padding-bottom: 96px !important;\r?\n\s*\}/g, '.home-page {\n    padding-top: 0;\n    padding-bottom: 96px !important;\n  }');

fs.writeFileSync('src/index.css', code);
