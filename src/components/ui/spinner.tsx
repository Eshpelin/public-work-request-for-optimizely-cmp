import { cn } from "@/lib/utils"

function Spinner({
  className,
  label,
  size = "default",
}: {
  className?: string
  label?: string
  size?: "sm" | "default" | "lg"
}) {
  const sizeClasses = {
    sm: "size-4 border-2",
    default: "size-6 border-2",
    lg: "size-8 border-3",
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-current border-t-transparent",
          sizeClasses[size]
        )}
      />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  )
}

export { Spinner }
