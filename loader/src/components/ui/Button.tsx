import { type LucideIcon } from "lucide-react";
import { type ButtonHTMLAttributes } from "react";
import { cx } from "../../lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon
  iconPosition?: "start" | "end"
  size?: "standard" | "large"
  variant?: ButtonVariant
}
export type ButtonVariant = "primary" | "secondary" | "success" | "critical"
export function Button({
  children,
  className,
  icon: Icon,
  iconPosition = "start",
  size = "standard",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        "button",
        `button--${variant}`,
        `button--${size}`,
        className,
      )}
      type={type}
      {...props}
    >
      {Icon && iconPosition === "start" ? <Icon aria-hidden="true" /> : null}
      <span>{children}</span>
      {Icon && iconPosition === "end" ? <Icon aria-hidden="true" /> : null}
    </button>
  )
}
