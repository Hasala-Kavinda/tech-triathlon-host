import { X } from "lucide-react";
import { UnstyledButton } from "../../components/ui";
import type { ShopType } from "../../types/dispatcher";

export function FilterCard({
  type,
  count,
  active,
  onClick,
}: {
  type: ShopType
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <UnstyledButton
      className={`filter-card ${active ? "filter-card--active" : ""}`}
      onClick={onClick}
    >
      {count ? <span className="filter-card__count">{count}</span> : null}
      <strong>Waypoint {type}</strong>
      <span>
        {active ? "Filter on · click to clear" : "Shop type · active routes"}
      </span>
      {active ? (
        <X className="filter-card__x" aria-hidden="true" size={20} />
      ) : null}
    </UnstyledButton>
  )
}
