"use client"

import { LayoutGrid, Table2 } from "lucide-react"

export function ViewToggle({
  view,
  onViewChange,
}: {
  view: "cards" | "table"
  onViewChange: (v: "cards" | "table") => void
}) {
  return (
    <div className="inline-flex items-center rounded-lg bg-secondary p-0.5">
      <button
        onClick={() => onViewChange("cards")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === "cards"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        卡片
      </button>
      <button
        onClick={() => onViewChange("table")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === "table"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Table2 className="h-3.5 w-3.5" />
        表格
      </button>
    </div>
  )
}
