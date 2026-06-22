import { type ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const colorClasses: Record<string, { dot: string; badge: string }> = {
  green: {
    dot: "bg-green-600 dark:bg-green-400",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  orange: {
    dot: "bg-orange-600 dark:bg-orange-400",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  gray: {
    dot: "bg-gray-600 dark:bg-gray-400",
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  red: {
    dot: "bg-red-600 dark:bg-red-400",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
}

const fallback = colorClasses.gray

export type StatusBadgeProps = {
  color: string
  children: ReactNode
  className?: string
}

export function StatusBadge({ color, children, className }: StatusBadgeProps) {
  const classes = colorClasses[color] ?? fallback
  return (
    <Badge
      variant="secondary"
      className={cn("flex items-center py-[2px] text-xs", classes.badge, className)}
    >
      <div className={cn("mr-1 h-2 w-2 rounded-full", classes.dot)} />
      {children}
    </Badge>
  )
}
