import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-white hover:bg-secondary/80",
        secondary: "border-transparent bg-surface-container text-on-surface hover:bg-surface-container-high",
        destructive: "border-transparent bg-error text-white hover:bg-error/80",
        outline: "border-outline-variant text-on-surface-variant",
        success: "border-transparent bg-secondary-container/40 text-on-secondary-container",
        warning: "border-transparent bg-[#fff0d6] text-[#9a4e00]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
