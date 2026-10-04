import { type HTMLAttributes } from "react";
import { cx } from "../../lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "standard" | "compact"
  variant?: CardVariant
}
export type CardVariant = "standard" | "information" | "exception" | "work"
export function Card({
  children,
  className,
  padding = "standard",
  variant = "standard",
  ...props
}: CardProps) {
  return (
    <div
      className={cx(
        "card",
        `card--${variant}`,
        `card--padding-${padding}`,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
