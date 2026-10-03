import { type ReactNode } from "react";
import { Text } from "./Text";

export function PageHeader({
  aside,
  eyebrow,
  subtitle,
  title,
}: {
  aside?: ReactNode
  eyebrow?: string
  subtitle: string
  title: ReactNode
}) {
  return (
    <div className="page-header">
      <div className="page-header__copy">
        {eyebrow ? (
          <Text variant="label" className="page-header__eyebrow">
            {eyebrow}
          </Text>
        ) : null}
        <Text as="h1" variant="h1">
          {title}
        </Text>
        <Text variant="body" className="page-header__subtitle">
          {subtitle}
        </Text>
      </div>
      {aside ? <div className="page-header__aside">{aside}</div> : null}
    </div>
  )
}
