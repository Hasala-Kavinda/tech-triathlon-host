import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react"
import type { LucideIcon } from "lucide-react"

type ButtonVariant = "primary" | "secondary" | "confirm" | "danger" | "quiet"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  icon?: LucideIcon
  children: ReactNode
}

export function Button({
  variant = "secondary",
  icon: Icon,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {Icon ? <Icon aria-hidden="true" size={18} /> : null}
      <span>{children}</span>
    </button>
  )
}

export function UnstyledButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} />
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  icon: LucideIcon
}

export function IconButton({
  label,
  icon: Icon,
  className = "",
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`icon-button ${className}`}
      title={label}
      {...props}
    >
      <Icon aria-hidden="true" size={20} />
    </button>
  )
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="page-title">{children}</h1>
}

export function Heading({
  children,
  id,
}: {
  children: ReactNode,
  id?: string,
}) {
  return <h2 id={id}>{children}</h2>
}

export function ShopTag({ type }: { type: string }) {
  return (
    <span className={`shop-tag shop-tag--${type.toLowerCase()}`}>{type}</span>
  )
}

export function ProgressBar({
  value,
  warning = false,
}: {
  value: number
  warning?: boolean
}) {
  return (
    <span
      aria-label={`${value}% complete`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className="progress"
      role="progressbar"
    >
      <span
        className={`progress__fill ${warning ? "progress__fill--warning" : ""}`}
        style={
          { "--progress": `${Math.min(value, 100)}%` } as React.CSSProperties
        }
      />
    </span>
  )
}
