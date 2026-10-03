import { cx } from "../../lib/utils";
import { Text } from "./Text";

export function Progress({
  damaged = 0,
  flagged = 0,
  loaded,
  missing = 0,
  total,
}: {
  damaged?: number
  flagged?: number
  loaded: number
  missing?: number
  total: number
}) {
  const pending = Math.max(total - loaded - flagged - missing - damaged, 0)
  const accounted = loaded + flagged + missing + damaged
  const segments = [
    { className: "progress__segment--loaded", label: "Loaded", value: loaded },
    {
      className: "progress__segment--damaged",
      label: "Flagged",
      value: flagged,
    },
    {
      className: "progress__segment--missing",
      label: "Missing",
      value: missing,
    },
    {
      className: "progress__segment--damaged",
      label: "Damaged",
      value: damaged,
    },
    {
      className: "progress__segment--pending",
      label: "Pending",
      value: pending,
    },
  ].filter((segment) => segment.value > 0 || segment.label === "Pending")

  return (
    <div className="progress-system">
      <div className="progress-system__header">
        <div>
          <Text variant="caption">Overall progress</Text>
          <Text variant="body-strong">
            {accounted} / {total} items accounted for
          </Text>
        </div>
        <Text variant="data">{Math.round((accounted / total) * 100)}%</Text>
      </div>
      <div
        aria-label={`${accounted} of ${total} items accounted for`}
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={accounted}
      >
        {segments.map((segment) =>
          segment.value > 0 ? (
            <span
              aria-hidden="true"
              className={cx("progress__segment", segment.className)}
              key={segment.label}
              style={{ flexGrow: segment.value }}
            />
          ) : null,
        )}
      </div>
      <div className="progress-legend">
        {segments.map((segment) => (
          <div className="progress-legend__item" key={segment.label}>
            <span
              className={cx("progress-legend__dot", segment.className)}
              aria-hidden="true"
            />
            <Text as="span" variant="caption">
              {segment.label}
            </Text>
            <Text as="span" variant="data">
              {segment.value}
            </Text>
          </div>
        ))}
      </div>
    </div>
  )
}
