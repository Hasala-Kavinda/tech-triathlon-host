import { Warehouse } from "lucide-react";
import { type ReactNode } from "react";
import type { ConnectivityState } from "../../types/loader";
import { Text } from "../ui/Text";
import { WayLinkMark } from "../ui/WayLinkMark";
import { ConnectivityIndicator } from "./ConnectivityIndicator";
import { LoaderIdentity } from "./LoaderIdentity";
import { readSession } from "../../auth/session";

export function LoaderShell({
  bottomActions,
  children,
  connectivity,
  connectivityDetail,
}: {
  bottomActions?: ReactNode
  children: ReactNode
  connectivity: ConnectivityState
  connectivityDetail?: string
}) {
  const session = readSession();
  const depot = session?.user?.depot || "Depot unavailable";

  return (
    <div className="loader-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__brand">
            <WayLinkMark />
          </div>
          <div className="app-header__location">
            <Warehouse aria-hidden="true" />
            <Text as="span" variant="label">
              {depot}
            </Text>
          </div>
          <div className="app-header__tools">
            <ConnectivityIndicator
              compact
              detail={connectivityDetail}
              state={connectivity}
            />
            <LoaderIdentity />
          </div>
        </div>
      </header>
      <main className="loader-shell__main">{children}</main>
      {bottomActions}
    </div>
  )
}
