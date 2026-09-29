const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

const regex = /\.compact-mobile-outlet\s*\{[\s\S]*?\}/g;

const newCss = `.compact-mobile-outlet {
  font-size: 13px;
  font-weight: 600;
  color: white;
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 100px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}`;

let matches = css.match(regex);
if (matches) {
  // Replace the last one with newCss
  const lastMatch = matches[matches.length - 1];
  css = css.replace(lastMatch, newCss);
  
  // Replace all others with empty string
  for (let i = 0; i < matches.length - 1; i++) {
    css = css.replace(matches[i], '');
  }
}

fs.writeFileSync('src/index.css', css);
