import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Inbox,
  LoaderCircle,
  RefreshCw,
  Truck,
} from "lucide-react"
import { useState } from "react"
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { LoaderShell } from "../components/layout/LoaderShell";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusPill } from "../components/ui/StatusPill";
import { Text } from "../components/ui/Text";
import { WorkCard } from "../components/load/WorkCard"
import type { LoadCase } from "../types/loader"
import { useConnectivity } from "../hooks/useConnectivity"
import type { JobsStatus } from "../App"

type RefreshStatus = "idle" | "refreshing" | "updated"

interface AvailableWorkPageProps {
  loadCases: LoadCase[]
  status: JobsStatus
  /** Why the list could not be loaded (when status is "error"). */
  error: string
  /** A problem with the last claim or open, for example another loader claimed the job first. */
  actionError: string
  /** The trip being opened right now, if any. */
  opening: string | null
  onRefresh: () => Promise<void>
  onClaim: (loadCase: LoadCase) => Promise<void>
  onOpenLoad: (tripId: string) => void
}

export default function AvailableWorkPage({ loadCases, status, error, actionError, opening, onRefresh, onClaim, onOpenLoad }: AvailableWorkPageProps) {
  const [connectivity] = useConnectivity()
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>("idle")

  const isOnline = connectivity === "online"

  const visibleCases = loadCases
  const availableCount = visibleCases.filter(
    (loadCase) => loadCase.state === "available",
  ).length
  const claimedCount = visibleCases.filter(
    (loadCase) => loadCase.state === "claimed",
  ).length

  async function handleRefresh() {
    if (!isOnline || refreshStatus === "refreshing") return

    setRefreshStatus("refreshing")
    await onRefresh()
    setRefreshStatus("updated")
    window.setTimeout(() => setRefreshStatus("idle"), 2200)
  }

  function handleClaim(loadCase: LoadCase) {
    if (!isOnline) return
    if (!window.confirm("Are you sure you really need to claim this load?")) return
    void onClaim(loadCase)
  }

  const refreshLabel =
    refreshStatus === "refreshing" ? "Refreshing…" : "Refresh"

  return (
    <LoaderShell
      connectivity={connectivity}
      bottomActions={undefined}
    >
      <div className="available-work-page">
        <PageHeader
          eyebrow="Outbound loading"
          title="Available Work"
          subtitle="Select a loading job to assign yourself."
          aside={
            <Button
              variant="secondary"
              icon={RefreshCw}
              disabled={!isOnline || refreshStatus === "refreshing"}
              onClick={() => void handleRefresh()}
            >
              {refreshLabel}
            </Button>
          }
        />

        {!isOnline ? (
          <div className="work-alert work-alert--offline" role="status">
            <div className="work-alert__icon">
              <CloudOff aria-hidden="true" />
            </div>
            <div>
              <Text variant="body-strong">
                Offline
              </Text>
              <Text variant="body">
                Work list may be out of date. Reconnect before claiming a load.
              </Text>
            </div>
          </div>
        ) : refreshStatus !== "idle" ? (
          <div
            className={`work-alert work-alert--${refreshStatus}`}
            role="status"
            aria-live="polite"
          >
            <div className="work-alert__icon">
              {refreshStatus === "refreshing" ? (
                <LoaderCircle className="icon-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 aria-hidden="true" />
              )}
            </div>
            <div>
              <Text variant="body-strong">
                {refreshStatus === "refreshing"
                  ? "Updating available work…"
                  : "Work list updated"}
              </Text>
              <Text variant="caption">
                {refreshStatus === "refreshing"
                  ? "Checking your depot for the latest assignments."
                  : "Available cases are up to date."}
              </Text>
            </div>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="work-alert work-alert--offline" role="alert">
            <div className="work-alert__icon">
              <AlertTriangle aria-hidden="true" />
            </div>
            <div>
              <Text variant="body-strong">The load jobs could not be loaded</Text>
              <Text variant="body">{error}</Text>
            </div>
            <Button variant="secondary" icon={RefreshCw} onClick={() => void handleRefresh()}>
              Try again
            </Button>
          </div>
        ) : null}

        {actionError ? (
          <div className="work-alert work-alert--offline" role="alert">
            <div className="work-alert__icon">
              <AlertTriangle aria-hidden="true" />
            </div>
            <div>
              <Text variant="body-strong">That did not go through</Text>
              <Text variant="body">{actionError}</Text>
            </div>
          </div>
        ) : null}

        <div className="work-summary">
          <div className="work-summary__icon">
            <Truck aria-hidden="true" />
          </div>
          <div className="work-summary__copy">
            <Text variant="label">
              Available load cases
            </Text>
            <div className="work-summary__count">
              <Text variant="data">{availableCount}</Text>
              <Text variant="body">
                {availableCount === 1
                  ? "case ready to claim"
                  : "cases ready to claim"}
              </Text>
            </div>
          </div>
          {claimedCount > 0 ? (
            <StatusPill
              variant="loaded"
              label={`${claimedCount} claimed by you`}
            />
          ) : (
            <Text variant="caption">Outbound queue · Live</Text>
          )}
        </div>

        {status === "loading" && visibleCases.length === 0 ? (
          <Card className="empty-work-state">
            <div className="empty-work-state__icon">
              <LoaderCircle className="icon-spin" aria-hidden="true" />
            </div>
            <div className="empty-work-state__copy">
              <Text as="h2" variant="h2">Loading load jobs…</Text>
            </div>
          </Card>
        ) : status === "error" && visibleCases.length === 0 ? null : visibleCases.length === 0 ? (
          <Card className="empty-work-state">
            <div className="empty-work-state__icon">
              <Inbox aria-hidden="true" />
            </div>
            <div className="empty-work-state__copy">
              <Text as="h2" variant="h2">
                No loading jobs available right now
              </Text>
              <Text variant="body">
                New jobs will appear here when they are assigned to the
                warehouse.
              </Text>
            </div>
            <Button
              variant="secondary"
              icon={RefreshCw}
              disabled={!isOnline || refreshStatus === "refreshing"}
              onClick={() => void handleRefresh()}
            >
              {refreshLabel}
            </Button>
          </Card>
        ) : (
          <section
            className={`work-list ${
              refreshStatus === "refreshing" ? "work-list--refreshing" : ""
            }`}
            aria-label="Available outbound load cases"
          >
            {visibleCases.map((loadCase) => (
              <WorkCard
                key={loadCase.tripId}
                {...loadCase}
                disabled={!isOnline || refreshStatus === "refreshing" || opening !== null}
                disabledReason={
                  !isOnline
                    ? "Reconnect to claim this load."
                    : refreshStatus === "refreshing"
                      ? "Checking the latest assignment…"
                      : undefined
                }
                onClaim={() => handleClaim(loadCase)}
                onOpen={() => onOpenLoad(loadCase.tripId)}
              />
            ))}
          </section>
        )}

        {visibleCases.length > 0 ? (
          <div className="queue-note" role="note">
            <AlertTriangle aria-hidden="true" />
            <Text variant="caption">
              Jobs are assigned when the claim is confirmed. Another loader may
              claim a case while this list is open.
            </Text>
          </div>
        ) : null}
      </div>
    </LoaderShell>
  )
}
