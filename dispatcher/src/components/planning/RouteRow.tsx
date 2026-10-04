import { Bell, ChevronRight } from "lucide-react";
import { ProgressBar, ShopTag, UnstyledButton } from "../../components/ui";
import type { RouteRecord } from "../../types/dispatcher";

export function RouteRow({
  item,
  onOpen,
}: {
  item: RouteRecord
  onOpen: (remarksOpen: boolean) => void
}) {
  return (
    <UnstyledButton
      className="route-row"
      onClick={(event) =>
        onOpen(
          Boolean((event.target as HTMLElement).closest(".remarks-count")),
        )
      }
    >
      <span className="route-row__identity">
        <span className="route-row__top">
          <span className="data-text">{item.id}</span>
          {item.tags.map((tag) => (
            <ShopTag key={tag} type={tag} />
          ))}
        </span>
        <span className="route-row__name">{item.route}</span>
        {item.tripNumber ? <small className="route-row__trip data-text">{item.tripNumber}</small> : null}
      </span>
      <span className="route-row__progress">
        <strong>
          {item.done}/{item.total} shops
        </strong>
        <ProgressBar value={(item.done / item.total) * 100} />
      </span>
      <span className="route-row__end">
        {item.remarks ? (
          <span className="remarks-count">
            <Bell aria-hidden="true" size={18} />
            <strong>{item.remarks}</strong>
          </span>
        ) : null}
        <ChevronRight
          className="route-row__chevron"
          aria-hidden="true"
          size={22}
        />
      </span>
    </UnstyledButton>
  )
}
