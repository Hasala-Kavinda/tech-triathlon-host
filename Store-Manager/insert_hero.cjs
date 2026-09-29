const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const deferredHeroBlock = `
      {state === "deferred" && (
        <>
          <span className="order-hero-icon" style={{ background: "var(--sunburst-50)", color: "var(--sunburst-600)" }}>
            <CalendarDays />
          </span>
          <div className="order-hero-copy">
            <span className="field-label">Current state</span>
            <div className="order-hero-title">Deferred</div>
            <p>This order has been moved to the next planning cycle.</p>
          </div>
          <div className="planning-facts">
            <span>
              <small>Target planning run</small>
              <strong>Friday, 2 October</strong>
            </span>
            <span>
              <small>Expected arrival</small>
              <strong>Not available yet</strong>
            </span>
          </div>
        </>
      )}
`;

code = code.replace(/\{state === "confirmed" && \(/, deferredHeroBlock.trim() + '\n\n      {state === "confirmed" && (');

fs.writeFileSync('src/App.tsx', code);
