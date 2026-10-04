import type { ConnectivityState } from "../types/loader";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flag,
  Hammer,
  AlertTriangle,
  PackageCheck,
  Route,
  Warehouse,
  LoaderCircle,
} from "lucide-react"
import { useEffect } from "react"
import { BottomActionBar } from "../components/ui/BottomActionBar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { LoaderShell } from "../components/layout/LoaderShell";
import { PageHeader } from "../components/ui/PageHeader";
import { Progress } from "../components/ui/Progress";
import { StatusPill } from "../components/ui/StatusPill";
import { Text } from "../components/ui/Text";
import { LoadDepartureTimer } from "../components/load/LoadDepartureTimer"
import type { ActiveStop, LoadCase } from "../types/loader"
import { useConnectivity } from "../hooks/useConnectivity"

// ── Types ────────────────────────────────────────────────────────────────────

interface ReconciliationPageProps {
  stops: ActiveStop[]
  onBack: () => void
  onConfirmed: () => void | Promise<void>
  activeLoad?: LoadCase
  workflowError?: string
  isSubmittingWorkflow?: boolean
  onClearWorkflowError?: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatQuantity(amount: number, unit: string) {
  return `${amount} ${amount === 1 ? unit.replace(/s$/, "") : unit}`
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReconciliationPage({
  stops,
  onBack,
  onConfirmed,
  activeLoad,
  workflowError,
  isSubmittingWorkflow,
  onClearWorkflowError,
}: ReconciliationPageProps) {
  const [connectivity] = useConnectivity()

  // ── Scroll to top on mount ────────────────────────────────────────────────
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // ── Derived accounting totals ─────────────────────────────────────────────

  const allItems = stops.flatMap((stop) => stop.items)
  const total = allItems.length
  const loadedCount = allItems.filter((i) => i.status === "loaded").length
  const flaggedCount = allItems.filter((i) => i.status === "flagged").length
  const pendingCount = allItems.filter((i) => i.status === "pending").length
  const accountedCount = loadedCount + flaggedCount

  // Invariant: Loaded + Flagged + Pending = Total
  const canConfirm = pendingCount === 0

  // ── Exception items (all flagged items across all stops) ──────────────────

  const flaggedItems = stops.flatMap((stop) =>
    stop.items
      .filter((item) => item.status === "flagged")
      .map((item) => ({ item, stop })),
  )

  // ── Stop accounting status ────────────────────────────────────────────────

  const stopSummaries = stops.map((stop) => {
    const pending = stop.items.filter((i) => i.status === "pending").length
    const flagged = stop.items.filter((i) => i.status === "flagged").length
    const loaded = stop.items.filter((i) => i.status === "loaded").length
    const isComplete = pending === 0
    return { stop, isComplete, loaded, flagged, pending }
  })

  // ── Connectivity detail label ─────────────────────────────────────────────

  const connectivityDetail = {
    online: "Online",
    offline: "Offline",
    syncing: "Connecting…",
    synced: "Online",
  }[connectivity]

  return (
    <LoaderShell
      connectivity={connectivity}
      connectivityDetail={connectivityDetail}
      bottomActions={
        <BottomActionBar
          context={
            <div className="active-action-context">
              <Text variant="label">
                {canConfirm
                  ? "All items accounted · Ready to confirm"
                  : `${pendingCount} item${pendingCount === 1 ? "" : "s"} still pending`}
              </Text>
              <Text variant="caption">
                {canConfirm
                  ? "Review the exceptions above, then confirm the load record."
                  : "Return to Active Load to account for remaining items."}
              </Text>
            </div>
          }
          secondaryAction={
            <Button variant="secondary" icon={ArrowLeft} onClick={onBack}>
              Back to load
            </Button>
          }
          primaryAction={
            <Button
              variant="primary"
              size="large"
              icon={ArrowRight}
              iconPosition="end"
              disabled={!canConfirm || isSubmittingWorkflow}
              onClick={() => void onConfirmed()}
            >
              Confirm load
            </Button>
          }
        />
      }
    >
      <div className="active-load-page reconciliation-page">
        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <PageHeader
          eyebrow="Load reconciliation"
          title={
            <>
              <span className="active-load-title__vehicle">{activeLoad?.vehicle ?? "—"}</span>
              <span className="active-load-title__route"> · {activeLoad?.tripNumber ?? "—"}</span>
            </>
          }
          subtitle="Review the loading record before confirming."
          aside={<StatusPill variant="loaded" label="Loading accounted" />}
        />

        {/* ── Vehicle metadata strip ────────────────────────────────────── */}
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
        </div>

        {workflowError ? (
          <div
            className="work-alert work-alert--offline"
            role="alert"
            aria-live="assertive"
            style={{ marginBottom: "1.5rem" }}
          >
            <div className="work-alert__icon">
              <AlertTriangle aria-hidden="true" />
            </div>
            <div style={{ flex: 1 }}>
              <Text variant="body-strong">Action failed</Text>
              <Text variant="caption">{workflowError}</Text>
            </div>
            <button
              type="button"
              onClick={() => onClearWorkflowError?.()}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "inherit",
                textDecoration: "underline",
                alignSelf: "center",
                marginLeft: "auto"
              }}
            >
              <Text variant="body-strong">Dismiss</Text>
            </button>
          </div>
        ) : null}

        {isSubmittingWorkflow ? (
          <div
            className="work-alert work-alert--refreshing"
            role="status"
            aria-live="polite"
            style={{ marginBottom: "1.5rem" }}
          >
            <div className="work-alert__icon">
              <LoaderCircle className="icon-spin" aria-hidden="true" />
            </div>
            <div style={{ flex: 1 }}>
              <Text variant="body-strong">Confirming load…</Text>
              <Text variant="caption">Updating load record.</Text>
            </div>
          </div>
        ) : null}

        {/* ── Accounting summary ────────────────────────────────────────── */}
        <div className="recon-summary-grid">
          {/* Primary accounting card */}
          <Card className="load-progress-card load-progress-card--complete recon-summary-card">
            <div className="recon-summary-card__headline">
              <div className="recon-summary-card__icon" aria-hidden="true">
                <CheckCircle2 />
              </div>
              <div>
                <Text variant="label" className="recon-summary-card__label">
                  Loading accounted
                </Text>
                <div className="recon-summary-card__count">
                  <Text variant="data" className="recon-summary-card__big-num">
                    {accountedCount}
                  </Text>
                  <Text variant="body-strong" className="recon-summary-card__slash">
                    / {total}
                  </Text>
                </div>
                <Text variant="body">Items accounted for</Text>
              </div>
              {activeLoad?.timing ? (
                <div style={{ justifySelf: "end", textAlign: "right" }}>
                  <LoadDepartureTimer timing={activeLoad.timing} />
                </div>
              ) : null}
            </div>

            <Progress flagged={flaggedCount} loaded={loadedCount} total={total} />

            <div className="recon-breakdown">
              <div className="recon-breakdown__item recon-breakdown__item--loaded">
                <PackageCheck aria-hidden="true" />
                <div>
                  <Text variant="data">{loadedCount}</Text>
                  <Text variant="caption">Loaded</Text>
                </div>
              </div>
              <div className="recon-breakdown__item recon-breakdown__item--flagged">
                <Flag aria-hidden="true" />
                <div>
                  <Text variant="data">{flaggedCount}</Text>
                  <Text variant="caption">Flagged</Text>
                </div>
              </div>
              <div className="recon-breakdown__item recon-breakdown__item--pending">
                <AlertTriangle aria-hidden="true" />
                <div>
                  <Text variant="data">{pendingCount}</Text>
                  <Text variant="caption">Pending</Text>
                </div>
              </div>
            </div>

            <Text variant="caption" className="recon-summary-card__note">
              All items are accounted for. Review exceptions before confirming the load.
            </Text>
          </Card>

          {/* Stop summary card */}
          <Card variant="standard" className="recon-stop-summary-card">
            <div className="recon-section-heading">
              <Text variant="label" className="recon-section-heading__label">
                Stop summary
              </Text>
              <StatusPill variant="loaded" label="All accounted" />
            </div>
            <div className="recon-stop-list" role="list">
              {stopSummaries.map(({ stop, isComplete, loaded, flagged }) => (
                <div
                  className="recon-stop-row"
                  key={stop.stopNumber}
                  role="listitem"
                >
                  <div className="recon-stop-row__number" aria-hidden="true">
                    <Text as="span" variant="data">
                      {String(stop.stopNumber).padStart(2, "0")}
                    </Text>
                  </div>
                  <div className="recon-stop-row__info">
                    <Text variant="body-strong">{stop.outlet}</Text>
                    <Text variant="caption">
                      {loaded} loaded
                      {flagged > 0 ? ` · ${flagged} flagged` : ""}
                    </Text>
                  </div>
                  <div className="recon-stop-row__status">
                    {isComplete ? (
                      <StatusPill variant="loaded" label="Accounted" />
                    ) : (
                      <StatusPill variant="in-progress" label="Pending" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Exception review ──────────────────────────────────────────── */}
        {flaggedItems.length > 0 ? (
          <div className="recon-exceptions">
            <div className="recon-section-heading recon-section-heading--standalone">
              <div>
                <Text variant="label" className="recon-section-heading__label">
                  Exceptions
                </Text>
                <Text as="h2" variant="h2">
                  {flaggedCount} flagged item{flaggedCount === 1 ? "" : "s"} to review
                </Text>
              </div>
              <StatusPill variant="changed" label={`${flaggedCount} flagged`} />
            </div>

            <div className="recon-exception-list" role="list">
              {flaggedItems.map(({ item, stop }) => {
                const exc = item.exception
                const isDamaged = exc?.type === "damaged"

                return (
                  <Card
                    key={item.id}
                    variant="exception"
                    className="recon-exception-card"
                    role="listitem"
                  >
                    {/* Exception type badge */}
                    <div className="recon-exception-card__badge">
                      <StatusPill
                        variant="changed"
                        label={isDamaged ? "Damaged" : "Missing"}
                      />
                      <Text variant="caption">
                        Stop {String(stop.stopNumber).padStart(2, "0")} · {stop.outlet} · {stop.orderIds.join(', ')}
                      </Text>
                    </div>

                    {/* Product identity */}
                    <div className="recon-exception-card__product">
                      <div
                        className={`recon-exception-card__icon ${
                          isDamaged
                            ? "recon-exception-card__icon--damaged"
                            : "recon-exception-card__icon--missing"
                        }`}
                        aria-hidden="true"
                      >
                        {isDamaged ? <Hammer /> : <AlertTriangle />}
                      </div>
                      <div>
                        <Text variant="body-strong">{item.name}</Text>
                        <Text variant="data">{item.quantity} expected</Text>
                      </div>
                    </div>

                    {/* Exception details */}
                    {exc ? (
                      <div className="recon-exception-details">
                        <div>
                          <Text variant="caption">Quantity affected</Text>
                          <Text variant="data">
                            {formatQuantity(exc.affectedQuantity, exc.unit)}
                          </Text>
                        </div>
                        <div>
                          <Text variant="caption">Type</Text>
                          <Text variant="body-strong">
                            {isDamaged ? "Damaged" : "Missing"}
                          </Text>
                        </div>
                        <div>
                          <Text variant="caption">Reason</Text>
                          <Text variant="body-strong">{exc.reason}</Text>
                        </div>
                        {exc.note ? (
                          <div className="recon-exception-details__note">
                            <Text variant="caption">Note</Text>
                            <Text variant="body">{exc.note}</Text>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </Card>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* ── Confirmation note ─────────────────────────────────────────── */}
        <div
          className="work-alert work-alert--updated recon-confirm-note"
          role="note"
        >
          <div className="work-alert__icon">
            <CheckCircle2 aria-hidden="true" />
          </div>
          <div>
            <Text variant="body-strong">
              Confirm load · Not vehicle release
            </Text>
            <Text variant="caption">
              Pressing "Confirm load" records your loading confirmation. The
              vehicle has not been released — that happens in the next step.
            </Text>
          </div>
        </div>
      </div>
    </LoaderShell>
  )
}
