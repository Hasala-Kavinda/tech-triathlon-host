import { createElement, type ReactNode } from "react";
import { cx } from "../../lib/utils";

export type TextVariant = "display" | "h1" | "h2" | "h3" | "body" | "body-strong" | "label" | "caption" | "data"
export type TextTag = "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "label"
export function Text({
  as = "p",
  children,
  className,
  variant = "body",
}: {
  as?: TextTag
  children: ReactNode
  className?: string
  variant?: TextVariant
}) {
  return createElement(
    as,
    { className: cx("text", `text--${variant}`, className) },
    children,
  )
}
