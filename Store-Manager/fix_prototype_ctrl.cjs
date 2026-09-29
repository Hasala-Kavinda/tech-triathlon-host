const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const stateOptions: Array<\{\s*value: string\s*label: string\s*\}> = \[\s*\{ value: "confirmed", label: "Order confirmed" \},\s*\{ value: "scheduled", label: "Scheduled \(Normal\)" \},\s*[\s\S]*?\{state === "confirmed" && onNavigateDeferred && \([\s\S]*?<\/button>\s*\)\}/;

const replacement = `const stateOptions: Array<{
      value: string
      label: string
    }> = [
      { value: "confirmed", label: "Order confirmed" },
      { value: "deferred", label: "Deferred" },
      { value: "scheduled", label: "Scheduled" },
      { value: "on-way", label: "On the way" },
      { value: "on-way-issue", label: "On the way (Warehouse issue)" },
      { value: "arrived", label: "Arrived" },
      { value: "awaiting-confirmation", label: "Awaiting confirmation" },
      { value: "receipt-confirmed", label: "Receipt confirmed" },
      { value: "receipt-issue", label: "Receipt confirmed with issue" },
    ]

  const activeOptions = stateOptions.filter(o => {
    if (o.value === "on-way-issue") return false;
    if (o.value === "deferred" && state !== "confirmed" && state !== "deferred") return false;
    return true;
  });

  return (
    <div className="order-detail-page">
      <div className="order-detail-utility-row">
        <button className="order-back-link" type="button" onClick={onBack}>
          <ArrowLeft />
          Back to Home
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <PrototypeStateControl
              value={state}
              options={activeOptions}
              onChange={(val) => {
                onStateChange(val as OrderDetailState)
              }}
              onSimulatePin={onSimulatePin}
            />`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
