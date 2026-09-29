const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const orderDetailStateHook = `
  const [warehouseIssue, setWarehouseIssue] = useState(false)
  const [wasDeferred, setWasDeferred] = useState(state === "deferred")
  
  useEffect(() => {
    if (state === "deferred") setWasDeferred(true)
  }, [state])
`;

code = code.replace(/const \[warehouseIssue, setWarehouseIssue\] = useState\(false\)/, orderDetailStateHook);

code = code.replace(/\{state === "deferred" \? <DeferredLifecycle state=\{state\} \/> : <OrderDetailLifecycle state=\{state\} \/>\}/g, '<OrderDetailLifecycle state={state} wasDeferred={wasDeferred} />');

const oldDeferredContentRegex = /\{state === "deferred" && \(\s*<>\s*<DeferredHero state=\{state\} \/>[\s\S]*?<\/section>\s*<\/>\s*\)\}/;

const newDeferredWarning = `
          {state === "deferred" && (
            <motion.div className="delivery-update-card" style={{ marginTop: -16, marginBottom: 24 }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={calmSpring}>
              <div className="order-detail-section-heading">
                <div>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CircleAlert size={16} /> Delivery deferred
                  </span>
                  <small>No action required.</small>
                </div>
              </div>
              <div className="delivery-update-grid">
                <span>
                  <small>Original plan</small>
                  <strong>Thursday, 1 October</strong>
                </span>
                <span className="delivery-update-new">
                  <small>New expected delivery</small>
                  <strong>Friday, 2 October</strong>
                </span>
                <span>
                  <small>Reason</small>
                  <strong>{business === "fresh" ? "Refrigerated delivery capacity unavailable" : "Vehicle capacity constraints"}</strong>
                </span>
              </div>
            </motion.div>
          )}
`;

code = code.replace(oldDeferredContentRegex, newDeferredWarning);

code = code.replace(/\{state !== "deferred" && \(\s*<OrderDetailHero state=\{state\} onReviewDelivery=\{onReviewDelivery\} onConfirmArrived=\{\(\) => onStateChange\("awaiting-confirmation"\)\} \/>\s*\)\}/, '<OrderDetailHero state={state} onReviewDelivery={onReviewDelivery} onConfirmArrived={() => onStateChange("awaiting-confirmation")} />');

// Remove DeferredHero component
code = code.replace(/function DeferredHero\(\{ state \}: \{ state: OrderDetailState \}\) \{[\s\S]*?return \([\s\S]*?<\/motion\.div>\r?\n\s*\)\r?\n\}/m, '');

// Remove DeferredLifecycle component
code = code.replace(/function DeferredLifecycle\(\{ state \}: \{ state: OrderDetailState \}\) \{[\s\S]*?return \([\s\S]*?<\/div>\r?\n\s*\)\r?\n\}/m, '');

fs.writeFileSync('src/App.tsx', code);
