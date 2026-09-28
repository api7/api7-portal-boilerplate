import { type ReactNode } from "react"
import { AlertTriangleIcon, InfoIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import {
  Alert as AlertPrimitive,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { cn } from "@/lib/utils"

const alertVariants = cva("", {
  variants: {
    variant: {
      default: "",
      destructive: "",
      info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-50",
    },
  },
  defaultVariants: {
    variant: "info",
  },
})

const icons = {
  default: AlertTriangleIcon,
  destructive: AlertTriangleIcon,
  info: InfoIcon,
} as const

export type AlertProps = VariantProps<typeof alertVariants> & {
  title?: string
  description?: ReactNode
  className?: string
}

export function Alert({ variant = "info", title, description, className }: AlertProps) {
  const Icon = icons[variant ?? "info"]
  return (
    <AlertPrimitive
      className={cn(alertVariants({ variant }), className)}
      variant={variant === "destructive" ? "destructive" : "default"}
    >
      <Icon />
      {title && <AlertTitle>{title}</AlertTitle>}
      {description && <AlertDescription>{description}</AlertDescription>}
    </AlertPrimitive>
  )
}
