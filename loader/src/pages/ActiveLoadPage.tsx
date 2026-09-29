import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudOff,
  ListOrdered,
  LoaderCircle,
  Route,
  Scale,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  BottomActionBar,
  Button,
  Card,
  ExceptionSheet,
  LoaderShell,
  PageHeader,
  Progress,
  StatusPill,
  StopCard,
  Text,
  type ConnectivityState,
  type LoadItemData,
  type LoadItemException,
  LoadDepartureTimer,
} from "../components/loader-ui"
import type { ActiveStop, LoadCase } from "../data/mock-data"
import { useConnectivity } from "../hooks/useConnectivity"

// Prototype URL override for connectivity state
const connectivityParam = new URLSearchParams(window.location.search).get(
  "connectivity",
)
const forcedConnectivity: ConnectivityState | null =
  connectivityParam === "offline" ||
  connectivityParam === "syncing" ||
  connectivityParam === "synced"
    ? (connectivityParam as ConnectivityState)
    : null

interface ActiveLoadPageProps {
  /** Called when the user presses "Available work" (back navigation). */
  onBack: () => void
  /** Called when all items are accounted and the user confirms to proceed. */
  onLoadingAccounted: () => void
  /** The mutable stops array — owned by the application shell. */
  stops: ActiveStop[]
  /** Callback to update the stops array in the application shell. */
  onStopsChange: (stops: ActiveStop[]) => void
  /** The current load case being handled. */
  activeLoad?: LoadCase
  /** Triggered the exact moment the load becomes fully accounted. */
  onLoadCompleted?: (completionTime: number) => void
}

export default function ActiveLoadPage({
  onBack,
  onLoadingAccounted,
  stops,
  onStopsChange,
  activeLoad,
  onLoadCompleted,
}: ActiveLoadPageProps) {
  const [connectivity] = useConnectivity(forcedConnectivity)
  const [visibleStopIndex, setVisibleStopIndex] = useState(0)
  const [exceptionItemId, setExceptionItemId] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState<{
    detail: string
    pendingSync: boolean
  } | null>(null)
  const [reconciliationReady, setReconciliationReady] = useState(false)

  // Slide animation state: "none" | "slide-left" | "slide-right"
  const [slideDirection, setSlideDirection] = useState<
    "none" | "slide-left" | "slide-right"
  >("none")
  const slideTimerRef = useRef<number | null>(null)

  // ── Derived state ────────────────────────────────────────────────────────

  const allItems = stops.flatMap((stop) => stop.items)
  const loadedCount = allItems.filter((item) => item.status === "loaded").length
  const flaggedCount = allItems.filter(
    (item) => item.status === "flagged",
  ).length
  const pendingCount = allItems.filter((item) => item.status === "pending").length
  const accountedCount = loadedCount + flaggedCount
  const allItemsAccounted = accountedCount === allItems.length

  // TRUE as soon as every item across all stops is accounted — derived purely
  // from accounting state, NOT from visibleStopIndex position.
  const globallyComplete = pendingCount === 0

  // The first stop (in loading order = array order 0…N) that still has at
  // least one pending item. -1 means all stops are complete.
  const nextRequiredStopIndex = stops.findIndex((stop) =>
    stop.items.some((item) => item.status === "pending"),
  )

  useEffect(() => {
    if (
      globallyComplete &&
      activeLoad &&
      activeLoad.timing.finalVariance === undefined &&
      onLoadCompleted
    ) {
      onLoadCompleted(Date.now())
    }
  }, [globallyComplete, activeLoad, onLoadCompleted])

  const visibleStop = stops[visibleStopIndex]
  const visiblePending =
    visibleStop?.items.filter((item) => item.status === "pending").length ?? 0

  const exceptionItem =
    allItems.find((item) => item.id === exceptionItemId) ?? null

  // ── Per-stop completion helper ──────────────────────────────────────────

  function isStopComplete(stopIndex: number) {
    return stops[stopIndex].items.every((item) => item.status !== "pending")
  }

  // ── Auto-advance on stop completion ────────────────────────────────────

  const prevNextRequired = useRef(nextRequiredStopIndex)

  useEffect(() => {
    // When the next required stop changes and moves forward (i.e. the current
    // visible stop just became complete), auto-advance with a slide animation.
    const prev = prevNextRequired.current
    prevNextRequired.current = nextRequiredStopIndex

    // Only auto-advance if:
    // 1. The visible stop just became complete (its index matches the previous nextRequired)
    // 2. There IS a new next required stop to go to
    // 3. The visible stop IS the one that just completed (user hasn't manually navigated away)
    if (
      prev !== -1 &&
      prev === visibleStopIndex &&
      nextRequiredStopIndex !== -1 &&
      nextRequiredStopIndex !== prev &&
      isStopComplete(prev)
    ) {
      triggerSlide(nextRequiredStopIndex, "slide-left")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextRequiredStopIndex, visibleStopIndex])

  // ── Slide animation helper ─────────────────────────────────────────────

  function triggerSlide(
    targetIndex: number,
    direction: "slide-left" | "slide-right",
  ) {
    if (slideTimerRef.current) {
      window.clearTimeout(slideTimerRef.current)
    }
    setSlideDirection(direction)
    slideTimerRef.current = window.setTimeout(() => {
      setVisibleStopIndex(targetIndex)
      setSlideDirection("none")
      slideTimerRef.current = null
    }, 280)
  }

  // ── Item mutation helpers ─────────────────────────────────────────────────

  function updateItems(
    updater: (item: LoadItemData) => LoadItemData,
  ) {
    onStopsChange(
      stops.map((stop) => ({
        ...stop,
        items: stop.items.map(updater),
      })),
    )
  }

  function markItemLoaded(itemId: string) {
    updateItems((item) =>
      item.id === itemId
        ? { ...item, exception: undefined, status: "loaded" }
        : item,
    )
  }

  function saveException(exception: LoadItemException) {
    if (!exceptionItemId) return

    updateItems((item) =>
      item.id === exceptionItemId
        ? { ...item, exception, status: "flagged" }
        : item,
    )

    setExceptionItemId(null)

    const affectedUnit =
      exception.affectedQuantity === 1
        ? exception.unit.replace(/s$/, "")
        : exception.unit

    setSavedNotice({
      detail: `${exception.affectedQuantity} ${affectedUnit} ${exception.type} · ${
        exception.pendingSync
          ? "Dispatcher notified when synced"
          : "Dispatcher notified"
      }`,
      pendingSync: exception.pendingSync,
    })

    window.setTimeout(() => setSavedNotice(null), 3600)
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  function handleContinue() {
    const currentStopComplete = isStopComplete(visibleStopIndex)
    if (!currentStopComplete) return

    if (globallyComplete) {
      setReconciliationReady(true)
      window.scrollTo({ behavior: "smooth", top: 0 })
      return
    }

    // Jump directly to the next stop that actually has pending items.
    if (nextRequiredStopIndex === -1) return

    triggerSlide(nextRequiredStopIndex, "slide-left")
  }

  function handleLoadingAccounted() {
    onLoadingAccounted()
  }

  // Manual stop navigation
  function handlePrevStop() {
    if (visibleStopIndex > 0) {
      triggerSlide(visibleStopIndex - 1, "slide-right")
    }
  }

  function handleNextStop() {
    if (visibleStopIndex < stops.length - 1) {
      triggerSlide(visibleStopIndex + 1, "slide-left")
    }
  }

  // ── Connectivity detail label ─────────────────────────────────────────────

  const connectivityDetail: Record<ConnectivityState, string> = {
    online: "Synced 04:12",
    offline: "Changes saved on device",
    syncing: "Syncing changes…",
    synced: "All changes synced",
  }

  // ── Derive active-stop info for footer context ────────────────────────────

  const footerStopIndex =
    nextRequiredStopIndex !== -1 ? nextRequiredStopIndex : visibleStopIndex
  const footerStop = stops[footerStopIndex]
  const footerPending =
    footerStop?.items.filter((i) => i.status === "pending").length ?? 0

  return (
    <LoaderShell
      connectivity={connectivity}
      connectivityDetail={connectivityDetail[connectivity]}
      bottomActions={
        <BottomActionBar
          context={
            <div className="active-action-context">
              <Text variant="label">
                {globallyComplete
                  ? `All ${allItems.length} items are accounted for`
                  : `Stop ${footerStop.stopNumber} · ${footerStop.outlet}`}
              </Text>
              <Text variant="caption">
                {globallyComplete
                  ? "Reconciliation and release are completed in the next workflow."
                  : footerPending > 0
                    ? `Account for ${footerPending} ${
                        footerPending === 1 ? "item" : "items"
                      } before continuing.`
                    : "This stop is accounted for. Continue to the next stop."}
              </Text>
            </div>
          }
          secondaryAction={
            <Button variant="secondary" icon={ArrowLeft} onClick={onBack}>
              Available work
            </Button>
          }
          primaryAction={
            reconciliationReady ? (
              <Button
                variant="primary"
                size="large"
                icon={ArrowRight}
                iconPosition="end"
                onClick={handleLoadingAccounted}
              >
                Begin reconciliation
              </Button>
            ) : (
              <Button
                variant="primary"
                size="large"
                icon={ArrowRight}
                iconPosition="end"
                disabled={!isStopComplete(visibleStopIndex)}
                onClick={handleContinue}
              >
                {globallyComplete ? "Loading accounted" : "Continue loading"}
              </Button>
            )
          }
        />
      }
    >
      <div className="active-load-page">
        <PageHeader
          eyebrow="Active load"
          title={
            <>
              <span className="active-load-title__vehicle">WP-CAB-4821</span>
              <span className="active-load-title__route"> · Colombo North</span>
            </>
          }
          subtitle="Claimed by you · Loading at Bay 03"
          aside={
            <StatusPill
              variant={globallyComplete ? "loaded" : "in-progress"}
              label={
                globallyComplete ? "Loading accounted" : "Loading in progress"
              }
            />
          }
        />

        <div className="active-load-context">
          <div>
            <Clock3 aria-hidden="true" />
            <div>
              <Text variant="caption">Departure</Text>
              <Text variant="data">04:30</Text>
            </div>
          </div>
          <div>
            <Route aria-hidden="true" />
            <div>
              <Text variant="caption">Route</Text>
              <Text variant="body-strong">6 stops</Text>
            </div>
          </div>
          <div>
            <Scale aria-hidden="true" />
            <div>
              <Text variant="caption">Load weight</Text>
              <Text variant="data">1,260 kg</Text>
            </div>
          </div>
        </div>

        {connectivity !== "online" ? (
          <div
            className={`work-alert work-alert--${
              connectivity === "offline" ? "offline" : "refreshing"
            }`}
            role="status"
          >
            <div className="work-alert__icon">
              {connectivity === "offline" ? (
                <CloudOff aria-hidden="true" />
              ) : connectivity === "syncing" ? (
                <LoaderCircle className="icon-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 aria-hidden="true" />
              )}
            </div>
            <div>
              <Text variant="body-strong">
                {connectivityDetail[connectivity]}
              </Text>
              <Text variant="caption">
                {connectivity === "offline"
                  ? "You can keep loading. Updates will sync when the connection returns."
                  : "Your loading record remains available while WayLink updates."}
              </Text>
            </div>
          </div>
        ) : null}

        {savedNotice ? (
          <div
            className={`work-alert work-alert--${
              savedNotice.pendingSync ? "offline" : "updated"
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="work-alert__icon">
              {savedNotice.pendingSync ? (
                <AlertTriangle aria-hidden="true" />
              ) : (
                <CheckCircle2 aria-hidden="true" />
              )}
            </div>
            <div>
              <Text variant="body-strong">
                {savedNotice.pendingSync
                  ? "Offline · Saved on this device"
                  : "Exception recorded"}
              </Text>
              <Text variant="caption">{savedNotice.detail}</Text>
            </div>
          </div>
        ) : null}

        {reconciliationReady ? (
          <div
            className="work-alert work-alert--updated"
            role="status"
            aria-live="polite"
          >
            <div className="work-alert__icon">
              <CheckCircle2 aria-hidden="true" />
            </div>
            <div>
              <Text variant="body-strong">
                Loading accounted · Ready for reconciliation
              </Text>
              <Text variant="caption">
                The vehicle has not been released. Final review and release
                happen in the next workflow.
              </Text>
            </div>
          </div>
        ) : null}

        <div className="active-load-overview">
          <Card
            className={`load-progress-card ${
              allItemsAccounted ? "load-progress-card--complete" : ""
            }`}
          >
            <div className="load-progress-card__heading">
              <div>
                <Text variant="label">Load progress</Text>
                <Text as="h2" variant="h2">
                  {accountedCount} / {allItems.length} items accounted for
                </Text>
              </div>
              {activeLoad?.timing ? (
                <div style={{ justifySelf: "end", textAlign: "right" }}>
                  <LoadDepartureTimer timing={activeLoad.timing} />
                </div>
              ) : (
                <StatusPill
                  variant={allItemsAccounted ? "loaded" : "in-progress"}
                  label={`${Math.round(
                    (accountedCount / allItems.length) * 100,
                  )}% accounted`}
                />
              )}
            </div>
            <Progress
              flagged={flaggedCount}
              loaded={loadedCount}
              total={allItems.length}
            />
            <Text variant="caption">
              Accounted for includes loaded items and flagged exceptions.
            </Text>
          </Card>

          <Card variant="information" className="load-sequence-card">
            <div className="load-sequence-card__icon">
              <ListOrdered aria-hidden="true" />
            </div>
            <div>
              <Text variant="label">Load sequence</Text>
              <Text as="h2" variant="h2">
                Load in reverse delivery order
              </Text>
              <Text variant="body">Last stop → First stop</Text>
            </div>
            <div className="sequence-track" aria-label="Stop sequence 6 to 1">
              {[6, 5, 4, 3, 2, 1].map((stopNumber) => {
                const stopData = stops.find((s) => s.stopNumber === stopNumber)
                const isComplete =
                  stopData?.items.every((i) => i.status !== "pending") ?? false
                const currentSequenceStop =
                  !globallyComplete && nextRequiredStopIndex !== -1
                    ? stops[nextRequiredStopIndex].stopNumber
                    : null
                const isActive = stopNumber === currentSequenceStop

                return (
                  <span
                    className={
                      isComplete
                        ? "sequence-track__stop sequence-track__stop--completed"
                        : isActive
                        ? "sequence-track__stop sequence-track__stop--active"
                        : "sequence-track__stop"
                    }
                    key={stopNumber}
                  >
                    {isComplete ? <Check aria-hidden="true" /> : stopNumber}
                  </span>
                )
              })}
            </div>
          </Card>
        </div>

        <div className="load-list-heading">
          <div>
            <Text as="h2" variant="h2">
              Stop load list
            </Text>
            <Text variant="body">Vehicle → Route → Stop → Order → Item</Text>
          </div>
          <Text variant="data">6 → 5 → 4 → 3 → 2 → 1</Text>
        </div>

        {/* ── Stop card navigation ────────────────────────────────────── */}
        <div className="stop-carousel">
          <div className="stop-carousel__nav">
            <button
              className="stop-carousel__arrow"
              onClick={handlePrevStop}
              disabled={visibleStopIndex === 0}
              aria-label="Previous stop"
              type="button"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <Text variant="label" className="stop-carousel__indicator">
              Stop {visibleStop.stopNumber} of {stops.length}
            </Text>
            <button
              className="stop-carousel__arrow"
              onClick={handleNextStop}
              disabled={visibleStopIndex === stops.length - 1}
              aria-label="Next stop"
              type="button"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>

          <div className="stop-carousel__viewport">
            <div
              className={`stop-carousel__track ${
                slideDirection !== "none"
                  ? `stop-carousel__track--${slideDirection}`
                  : ""
              }`}
              key={visibleStopIndex}
            >
              <StopCard
                {...visibleStop}
                isActive={
                  !globallyComplete &&
                  nextRequiredStopIndex === visibleStopIndex
                }
                isComplete={isStopComplete(visibleStopIndex)}
                onFlagItem={setExceptionItemId}
                onMarkLoaded={markItemLoaded}
              />
            </div>
          </div>
        </div>
      </div>

      {exceptionItem ? (
        <ExceptionSheet
          isOffline={connectivity === "offline"}
          item={exceptionItem}
          onClose={() => setExceptionItemId(null)}
          onSave={saveException}
        />
      ) : null}
    </LoaderShell>
  )
}
