const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

code = code.replace(/\.topbar \.manager-name \{\n  color: var\(--white\);\n\}/g, \.topbar .manager-name {
  color: var(--white);
}
.topbar .outlet-identity strong {
  color: var(--white);
}
.topbar .outlet-identity .outlet-label,
.topbar .outlet-identity .outlet-location {
  color: rgba(255, 255, 255, 0.7);
}\);

fs.writeFileSync('src/index.css', code);
