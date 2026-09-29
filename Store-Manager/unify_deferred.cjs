const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove deferred-detail from initial state
code = code.replace(/prototypeView === "deferred-detail" \|\|\r?\n\s*/g, '');
code = code.replace(/\|\| v === "deferred-detail"/g, '');
code = code.replace(/if \(nextView === "deferred-detail"\) setDeferredOrderState\(state as DeferredOrderState\)\r?\n\s*/g, '');

// 2. Remove DeferredOrderPage from router
code = code.replace(/\{view === "deferred-detail" && \([\s\S]*?<DeferredOrderPage[\s\S]*?<\/motion\.div>\r?\n\s*\)\}/, '');

// 3. Remove DeferredOrderPage component entirely
code = code.replace(/function DeferredOrderPage\(\{[\s\S]*?function ReceiptFlowPage/m, 'function ReceiptFlowPage');

// 4. Update the "Deferred" button in HomePage and UpcomingDeliveries
code = code.replace(/onOpenDeferred=\{\(\) => \{\r?\n\s*setDeferredOrderState\("deferred"\)\r?\n\s*setView\("deferred-detail"\)\r?\n\s*\}\}/g, 'onOpenDeferred={() => {\n                  setOrderDetailState("deferred")\n                  setView("order-detail")\n                }}');

code = code.replace(/function DeferredLifecycle\(\{ state \}: \{ state: DeferredOrderState \}\) \{/g, 'function DeferredLifecycle({ state }: { state: OrderDetailState }) {');

const deferredContent = `
          {state === "deferred" && (
            <>
              <DeferredHero state={state} />
              <motion.div className="no-action-card" layout transition={calmSpring}>
                <span>
                  <CheckCircle2 />
                </span>
                <div>
                  <strong>No action required</strong>
                  <p>
                    We will continue planning this order for the next delivery run.
                  </p>
                </div>
              </motion.div>
              <section className="delivery-update-card">
                <div className="order-detail-section-heading">
                  <div>
                    <span>Delivery update</span>
                    <small>The original order remains active.</small>
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
              </section>
            </>
          )}

          {state !== "deferred" && (
            <OrderDetailHero state={state} onReviewDelivery={onReviewDelivery} onConfirmArrived={() => onStateChange("awaiting-confirmation")} />
          )}
`;

code = code.replace(/<OrderDetailHero state=\{state\} onReviewDelivery=\{onReviewDelivery\} onConfirmArrived=\{\(\) => onStateChange\("awaiting-confirmation"\)\} \/>/, deferredContent);

code = code.replace(/<OrderDetailLifecycle state=\{state\} \/>/, '{state === "deferred" ? <DeferredLifecycle state={state} /> : <OrderDetailLifecycle state={state} />}');

// In DeferredHero, change state to OrderDetailState
code = code.replace(/function DeferredHero\(\{ state \}: \{ state: DeferredOrderState \}\)/, 'function DeferredHero({ state }: { state: OrderDetailState })');

fs.writeFileSync('src/App.tsx', code);
