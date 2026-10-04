import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Flag,
  Hammer,
  AlertTriangle,
  PackageCheck,
  Route,
  Scale,
  Truck,
  Warehouse,
  Download,
} from "lucide-react"
import { jsPDF } from "jspdf"
import { useEffect, useRef, useState } from "react"
import { BottomActionBar } from "../components/ui/BottomActionBar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { LoaderShell } from "../components/layout/LoaderShell";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusPill } from "../components/ui/StatusPill";
import { Text } from "../components/ui/Text";
import { LoadDepartureTimer } from "../components/load/LoadDepartureTimer"
import type { ActiveStop, LoadCase } from "../types/loader"
import { useConnectivity } from "../hooks/useConnectivity"

// ── Constants ──────────────────────────────────────────────────────────────────

// ── Props ─────────────────────────────────────────────────────────────────────

interface LoadConfirmedPageProps {
  /** Full stop/item state from App — authoritative source of truth. */
  stops: ActiveStop[]
  /** Navigate back to the Available Work screen. */
  onBackToWork: () => void
  /** The current load case being handled. */
  activeLoad?: LoadCase
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoadConfirmedPage({
  stops,
  onBackToWork,
  activeLoad,
}: LoadConfirmedPageProps) {
  const [connectivity] = useConnectivity()

  const connectivityDetail = {
    online: "Online",
    offline: "Offline",
  }[connectivity]

  // ── Scroll to top on mount ────────────────────────────────────────────────
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // ── Record: confirmation timestamp (device-local) ────────────────────────
  // Captured once when this component first mounts — represents the moment
  // the Loader pressed "Confirm load" on the Reconciliation screen.
  // This is a device-local timestamp only; no server call is made.
  const confirmedAtRef = useRef<Date>(new Date())
  const [confirmedAt] = useState(() => confirmedAtRef.current)

  const confirmedLabel = confirmedAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  // ── Animate success card in on mount ─────────────────────────────────────
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    // One rAF so the element is in the DOM before we animate
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // ── Derived accounting ────────────────────────────────────────────────────
  const allItems = stops.flatMap((s) => s.items)
  const total = allItems.length
  const loadedCount = allItems.filter((i) => i.status === "loaded").length
  const flaggedCount = allItems.filter((i) => i.status === "flagged").length
  const pendingCount = allItems.filter((i) => i.status === "pending").length
  const accountedCount = loadedCount + flaggedCount

  // Exception breakdown by type (derived — no hardcoding)
  const flaggedItems = stops.flatMap((s) =>
    s.items.filter((i) => i.status === "flagged"),
  )
  const missingCount = flaggedItems.filter(
    (i) => i.exception?.type === "missing",
  ).length
  const damagedCount = flaggedItems.filter(
    (i) => i.exception?.type === "damaged",
  ).length

  // ── PDF Generation ────────────────────────────────────────────────────────
  function handleDownloadPdf() {
    const doc = new jsPDF()
    
    doc.setFontSize(20)
    doc.text("WAYLINK", 20, 20)
    doc.setFontSize(14)
    doc.text("Loading Record — Confirmed", 20, 30)

    const vehicleStr = activeLoad?.vehicle ?? "—"
    const routeStr = activeLoad?.tripNumber ?? "—"
    const departureStr = activeLoad?.departure ?? "—"
    const stopsStr = activeLoad?.stops != null ? String(activeLoad.stops) : "—"
    const weightStr = activeLoad?.weight ?? "—"

    doc.setFontSize(12)
    doc.text("Vehicle:", 20, 45)
    doc.text(vehicleStr, 20, 52)
    
    doc.text("Route:", 80, 45)
    doc.text(routeStr, 80, 52)
    
    doc.text("Departure:", 20, 65)
    doc.text(departureStr, 20, 72)
    
    doc.text("Stops:", 80, 65)
    doc.text(stopsStr, 80, 72)
    
    doc.text("Load weight:", 140, 65)
    doc.text(weightStr, 140, 72)
    
    doc.text("Loading status:", 20, 85)
    doc.text("Confirmed", 20, 92)
    
    doc.text("Accounted:", 80, 85)
    doc.text(`${accountedCount} / ${total}`, 80, 92)
    
    doc.text("Loaded:", 20, 105)
    doc.text(String(loadedCount), 20, 112)
    
    doc.text("Flagged:", 80, 105)
    doc.text(String(flaggedCount), 80, 112)
    
    doc.text("Pending:", 140, 105)
    doc.text(String(pendingCount), 140, 112)
    
    doc.text("Confirmed at:", 20, 125)
    doc.text(`${confirmedLabel} · Device time`, 20, 132)

    doc.text("The loading record has been successfully confirmed.", 20, 145)
    doc.text("Vehicle not yet released.", 20, 152)

    if (flaggedCount > 0) {
      doc.setFontSize(14)
      doc.text("Exceptions Recorded", 20, 172)
      doc.setFontSize(12)
      
      let y = 185
      const margin = 20
      const maxLineWidth = 170
      const lineHeight = 7
      const pageHeight = 280

      function checkPageBreak(neededSpace: number) {
        if (y + neededSpace > pageHeight) {
          doc.addPage()
          y = margin
        }
      }

      flaggedItems.forEach(item => {
        const isDamaged = item.exception?.type === "damaged"
        const reason = item.exception?.reason || "Exception recorded"
        const qty = item.exception ? `${item.exception.affectedQuantity} ${item.exception.unit === "item" && item.exception.affectedQuantity !== 1 ? "items" : item.exception.unit}` : ""
        const typeStr = isDamaged ? "Damaged" : "Missing"
        
        const nameLines = doc.splitTextToSize(`- ${item.name}`, maxLineWidth)
        const typeLines = doc.splitTextToSize(`${qty} · ${typeStr}`, maxLineWidth - 5)
        const reasonLines = doc.splitTextToSize(`Reason: ${reason}`, maxLineWidth - 5)
        
        const totalSpace = (nameLines.length + typeLines.length + reasonLines.length) * lineHeight + 5
        checkPageBreak(totalSpace)
        
        doc.text(nameLines, margin, y)
        y += nameLines.length * lineHeight
        
        doc.text(typeLines, margin + 5, y)
        y += typeLines.length * lineHeight
        
        doc.text(reasonLines, margin + 5, y)
        y += reasonLines.length * lineHeight + 5
      })
    }

    const safeVehicle = activeLoad?.vehicle || "Unknown-Vehicle"
    const filename = `WayLink_Load_Confirmed_${safeVehicle}.pdf`
    doc.save(filename)
  }

  return (
    <LoaderShell
      connectivity={connectivity}
      connectivityDetail={connectivityDetail}
      bottomActions={
        <BottomActionBar
          context={
            <div className="active-action-context">
              <Text variant="label">Workflow complete</Text>
              <Text variant="caption">
                Return to available work to claim your next load.
              </Text>
            </div>
          }
          primaryAction={
            <Button
              variant="success"
              size="large"
              icon={ArrowLeft}
              onClick={onBackToWork}
            >
              Back to available work
            </Button>
          }
          secondaryAction={
            <Button
              variant="secondary"
              size="large"
              icon={Download}
              onClick={handleDownloadPdf}
            >
              Download PDF
            </Button>
          }
        />
      }
    >
      <div className="active-load-page confirmed-page">

        <PageHeader
          eyebrow="Load confirmed"
          title={
            <>
              <span className="active-load-title__vehicle">{activeLoad?.vehicle ?? "—"}</span>
              <span className="active-load-title__route"> · {activeLoad?.tripNumber ?? "—"}</span>
            </>
          }
          subtitle="The loading record has been confirmed."
          aside={<StatusPill variant="loaded" label="Confirmed" />}
        />

        {/* ── Vehicle metadata strip ─────────────────────────────────── */}
        <div className="active-load-context">
          <div>
            <Clock3 aria-hidden="true" />
            <div>
              <Text variant="caption">Departure</Text>
              <Text variant="data">{activeLoad?.departure ?? "—"}</Text>
            </div>
          </div>
          <div>
            <Route aria-hidden="true" />
            <div>
              <Text variant="caption">Route</Text>
              <Text variant="body-strong">
                {activeLoad?.stops != null
                  ? `${activeLoad.stops} stop${activeLoad.stops === 1 ? "" : "s"}`
                  : "—"}
              </Text>
            </div>
          </div>
          <div>
            <Scale aria-hidden="true" />
            <div>
              <Text variant="caption">Load weight</Text>
              <Text variant="data">{activeLoad?.weight ?? "—"}</Text>
            </div>
          </div>
        </div>

        {/* ── Primary success card ───────────────────────────────────── */}
        <div
          className={`confirmed-success-card ${visible ? "confirmed-success-card--visible" : ""}`}
          role="status"
          aria-live="polite"
          aria-label="Load confirmed successfully"
        >
          <div className="confirmed-success-card__icon" aria-hidden="true">
            <CheckCircle2 />
          </div>
          <div className="confirmed-success-card__copy">
            <Text variant="label" className="confirmed-success-card__label">
              Load confirmed
            </Text>
            <Text as="h2" variant="h2" className="confirmed-success-card__heading">
              The loading record has been successfully confirmed.
            </Text>
            <Text variant="body">
              Your loading responsibilities for this trip are complete.
            </Text>
          </div>
          <StatusPill variant="loaded" label="Confirmed" />
        </div>

        {/* ── Vehicle release distinction ────────────────────────────── */}
        <div
          className="work-alert work-alert--refreshing confirmed-release-note"
          role="note"
        >
          <div className="work-alert__icon">
            <Truck aria-hidden="true" />
          </div>
          <div>
            <Text variant="body-strong">
              Load confirmed · Vehicle not yet released
            </Text>
            <Text variant="caption">
              Confirming the load records the Loader's completion. Vehicle
              release and dispatch happen in a separate step.
            </Text>
          </div>
        </div>

        {/* ── Summary + Exceptions side-by-side ─────────────────────── */}
        <div className="confirmed-detail-grid">

          {/* Load summary */}
          <Card className="confirmed-summary-card">
            <div className="confirmed-summary-card__heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Text variant="label" className="confirmed-summary-card__label">
                Load summary
              </Text>
              {activeLoad?.timing ? (
                <div style={{ justifySelf: "end", textAlign: "right" }}>
                  <LoadDepartureTimer timing={activeLoad.timing} />
                </div>
              ) : null}
            </div>

            <div className="confirmed-summary-rows">
              <div className="confirmed-summary-row">
                <Text variant="caption">Vehicle</Text>
                <Text variant="data">{activeLoad?.vehicle ?? "—"}</Text>
              </div>
              <div className="confirmed-summary-row">
                <Text variant="caption">Route</Text>
                <Text variant="body-strong">{activeLoad?.tripNumber ?? "—"}</Text>
              </div>
              <div className="confirmed-summary-row">
                <Text variant="caption">Departure</Text>
                <Text variant="data">{activeLoad?.departure ?? "—"}</Text>
              </div>
              <div className="confirmed-summary-row">
                <Text variant="caption">Stops</Text>
                <Text variant="data">{activeLoad?.stops ?? "—"}</Text>
              </div>
            </div>

            <div className="confirmed-summary-divider" aria-hidden="true" />

            <div className="confirmed-summary-rows">
              <div className="confirmed-summary-row">
                <Text variant="caption">Total items</Text>
                <Text variant="data">{total}</Text>
              </div>
              <div className="confirmed-summary-row">
                <Text variant="caption">Accounted</Text>
                <Text variant="data" className="confirmed-summary-row__accounted">
                  {accountedCount} / {total}
                </Text>
              </div>
              <div className="confirmed-summary-row">
                <Text variant="caption">Loaded</Text>
                <Text variant="data">{loadedCount}</Text>
              </div>
              {flaggedCount > 0 ? (
                <div className="confirmed-summary-row">
                  <Text variant="caption">Flagged</Text>
                  <Text variant="data" className="confirmed-summary-row__flagged">
                    {flaggedCount}
                  </Text>
                </div>
              ) : null}
              {pendingCount === 0 ? (
                <div className="confirmed-summary-row">
                  <Text variant="caption">Pending</Text>
                  <Text variant="data" className="confirmed-summary-row__pending">
                    {pendingCount}
                  </Text>
                </div>
              ) : null}
            </div>

            <div className="confirmed-summary-divider" aria-hidden="true" />

            {/* Confirmation timestamp */}
            <div className="confirmed-timestamp">
              <Text variant="caption">Confirmed at</Text>
              <Text variant="data">{confirmedLabel} · Device time</Text>
            </div>
          </Card>

          {/* Exceptions recorded */}
          {flaggedCount > 0 ? (
            <Card variant="exception" className="confirmed-exceptions-card">
              <div className="confirmed-exceptions-card__heading">
                <div className="confirmed-exceptions-card__icon" aria-hidden="true">
                  <Flag />
                </div>
                <div>
                  <Text variant="label" className="confirmed-exceptions-card__label">
                    Exceptions recorded
                  </Text>
                  <Text as="h2" variant="h2">
                    {flaggedCount} flagged item{flaggedCount === 1 ? "" : "s"}
                  </Text>
                </div>
              </div>

              <Text variant="body">
                These exceptions are part of the confirmed loading record and
                will be reviewed by the Dispatcher.
              </Text>

              {/* Compact breakdown */}
              <div className="confirmed-exceptions-breakdown">
                {missingCount > 0 ? (
                  <div className="confirmed-exceptions-breakdown__item confirmed-exceptions-breakdown__item--missing">
                    <AlertTriangle aria-hidden="true" />
                    <div>
                      <Text variant="data">{missingCount}</Text>
                      <Text variant="caption">
                        Missing item{missingCount === 1 ? "" : "s"}
                      </Text>
                    </div>
                  </div>
                ) : null}
                {damagedCount > 0 ? (
                  <div className="confirmed-exceptions-breakdown__item confirmed-exceptions-breakdown__item--damaged">
                    <Hammer aria-hidden="true" />
                    <div>
                      <Text variant="data">{damagedCount}</Text>
                      <Text variant="caption">
                        Damaged item{damagedCount === 1 ? "" : "s"}
                      </Text>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Per-item compact list */}
              <div className="confirmed-exceptions-list" role="list">
                {flaggedItems.map((item) => {
                  const isDamaged = item.exception?.type === "damaged"
                  return (
                    <div
                      className="confirmed-exception-row"
                      key={item.id}
                      role="listitem"
                    >
                      <div
                        className={`confirmed-exception-row__icon ${
                          isDamaged
                            ? "confirmed-exception-row__icon--damaged"
                            : "confirmed-exception-row__icon--missing"
                        }`}
                        aria-hidden="true"
                      >
                        {isDamaged ? <Hammer /> : <AlertTriangle />}
                      </div>
                      <div className="confirmed-exception-row__info">
                        <Text variant="body-strong">{item.name}</Text>
                        <Text variant="caption">
                          {item.exception
                            ? `${item.exception.affectedQuantity} ${item.exception.unit} · ${
                                isDamaged ? "Damaged" : "Missing"
                              } · ${item.exception.reason}`
                            : "Exception recorded"}
                        </Text>
                      </div>
                      <StatusPill
                        variant="changed"
                        label={isDamaged ? "Damaged" : "Missing"}
                      />
                    </div>
                  )
                })}
              </div>
            </Card>
          ) : (
            /* No exceptions state */
            <Card variant="standard" className="confirmed-exceptions-card confirmed-exceptions-card--clean">
              <div className="confirmed-exceptions-card__heading">
                <div className="confirmed-exceptions-card__icon confirmed-exceptions-card__icon--clean" aria-hidden="true">
                  <PackageCheck />
                </div>
                <div>
                  <Text variant="label" className="confirmed-exceptions-card__label confirmed-exceptions-card__label--clean">
                    No exceptions
                  </Text>
                  <Text as="h2" variant="h2">
                    All items loaded cleanly
                  </Text>
                </div>
              </div>
              <Text variant="body">
                No missing or damaged items were recorded for this load.
              </Text>
            </Card>
          )}
        </div>
      </div>
    </LoaderShell>
  )
}
