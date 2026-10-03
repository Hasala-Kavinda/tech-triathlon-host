import { ArrowRight, CheckCircle2, Clock3, MapPin, Package, PackageCheck, RefreshCw, Route, Scale, Truck } from "lucide-react";
import type { LoadTiming } from "../../data/mock-data";
import { cx } from "../../lib/utils";
import type { WorkCardState } from "../../types/loader";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatusPill } from "../ui/StatusPill";
import { Text } from "../ui/Text";
import { LoadDepartureTimer } from "./LoadDepartureTimer";

export interface WorkCardProps {
  departure: string
  disabled?: boolean
  disabledReason?: string
  items: number
  onClaim?: () => void
  onOpen?: () => void
  priority: "normal" | "urgent"
  route: string
  state?: WorkCardState
  stops: number
  unavailableReason?: string
  vehicle: string
  weight: string
  timing?: LoadTiming
}
export function WorkCard({
  departure,
  disabled = false,
  disabledReason,
  items,
  onClaim,
  onOpen,
  priority,
  route,
  state = "available",
  stops,
  unavailableReason = "This load has already been claimed by another loader.",
  vehicle,
  weight,
  timing,
}: WorkCardProps) {
  const isClaimed = state === "claimed"
  const isUnavailable = state === "unavailable"
  const isClaiming = state === "claiming"

  return (
    <Card variant="work" className={cx("work-card", `work-card--${state}`)}>
      <div className="work-card__identity">
        <div className="work-card__vehicle">
          <div className="work-card__vehicle-icon">
            <Truck aria-hidden="true" />
          </div>
          <div>
            <Text variant="caption">Outbound load case</Text>
            <Text variant="data" className="work-card__vehicle-number">
              {vehicle}
            </Text>
          </div>
        </div>
        <div className="work-card__priority">
          <Text variant="caption">Priority</Text>
          <StatusPill variant={priority} />
        </div>
      </div>
      <div className="work-card__route">
        <MapPin aria-hidden="true" />
        <div>
          <Text variant="caption">Route</Text>
          <Text as="h3" variant="h3">
            {route}
          </Text>
        </div>
      </div>
      <div className="work-card__metrics">
        <div>
          <Route aria-hidden="true" />
          <Text variant="caption">Stops</Text>
          <Text variant="data">{stops}</Text>
        </div>
        <div>
          <PackageCheck aria-hidden="true" />
          <Text variant="caption">Items</Text>
          <Text variant="data">{items}</Text>
        </div>
        <div>
          <Scale aria-hidden="true" />
          <Text variant="caption">Weight</Text>
          <Text variant="data">{weight}</Text>
        </div>
      </div>
      <div className="work-card__departure">
        <div>
          <Clock3 aria-hidden="true" />
          <div>
            <Text variant="caption">Departure</Text>
            <Text variant="data">{departure}</Text>
          </div>
        </div>
        {timing ? (
          <div className="work-card__timer">
            <LoadDepartureTimer timing={timing} />
          </div>
        ) : null}
      </div>
      <div className="work-card__action">
        {isClaimed ? (
          <>
            <StatusPill variant="loaded" label="Claimed by you" />
            <Button
              variant="success"
              size="large"
              icon={ArrowRight}
              iconPosition="end"
              onClick={onOpen}
            >
              Open load
            </Button>
          </>
        ) : isUnavailable ? (
          <>
            <StatusPill variant="changed" label="Already assigned" />
            <Text variant="caption">{unavailableReason}</Text>
            <Button disabled size="large">
              Already assigned
            </Button>
          </>
        ) : state === "completed" ? (
          <>
            <StatusPill variant="loaded" label="Claimed by you" />
            <div className="work-card__completed-note">
              <CheckCircle2 className="icon-success" aria-hidden="true" />
              <Text variant="body-strong" className="text-success">Completed</Text>
            </div>
            <Button disabled size="large" variant="secondary">
              Completed
            </Button>
          </>
        ) : state === "completed-other" ? (
          <>
            <div className="work-card__completed-note">
              <CheckCircle2 className="icon-success" aria-hidden="true" />
              <Text variant="body-strong" className="text-success">Completed by another loader</Text>
            </div>
            <Text variant="caption">This load was completed by another loader.</Text>
            <Button disabled size="large" variant="secondary">
              Completed
            </Button>
          </>
        ) : (
          <>
            {disabledReason ? (
              <Text variant="caption">{disabledReason}</Text>
            ) : null}
            <Button
              disabled={disabled || isClaiming}
              variant="primary"
              size="large"
              icon={isClaiming ? RefreshCw : Package}
              onClick={onClaim}
            >
              {isClaiming ? "Claiming load…" : "Claim load"}
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}
