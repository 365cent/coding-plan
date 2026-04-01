import { TriangleAlert } from "lucide-react"

export function Notice({ title = "注意事项", children }: { title?: string, children: React.ReactNode }) {
  return (
    <div id="notice" className="mt-2 p-4 rounded-xl bg-accent border border-border flex items-start gap-3">
      <TriangleAlert className="h-5 w-5 text-chart-1 shrink-0 mt-0.5" />
      <div className="text-xs text-muted-foreground leading-relaxed w-full">
        <p className="font-medium text-foreground mb-1">{title}</p>
        <div className="space-y-1">
          {children}
        </div>
      </div>
    </div>
  )
}
