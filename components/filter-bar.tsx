"use client"

import { Search, X } from "lucide-react"
import type { PlanCategory } from "@/lib/plans-data"

type FilterBarProps = {
  search: string
  onSearchChange: (v: string) => void
  billingFilter: string
  onBillingFilterChange: (v: string) => void
  billingOptions: string[]
  categoryFilter: PlanCategory | ""
  onCategoryChange: (v: PlanCategory | "") => void
  sortBy: string
  onSortByChange: (v: string) => void
}

const sortOptions = [
  { value: "price-asc", label: "价格从低到高" },
  { value: "price-desc", label: "价格从高到低" },
  { value: "value", label: "性价比" },
  { value: "models", label: "模型数量" },
  { value: "tools", label: "工具数量" },
  { value: "requests", label: "请求频次" },
  { value: "default", label: "默认" },
]

const categoryOptions: { value: PlanCategory | ""; label: string }[] = [
  { value: "", label: "全部" },
  { value: "国内大厂", label: "国内大厂" },
  { value: "御三家", label: "御三家" },
  { value: "其他", label: "其他" },
]

export function FilterBar({
  search,
  onSearchChange,
  billingFilter,
  onBillingFilterChange,
  billingOptions,
  categoryFilter,
  onCategoryChange,
  sortBy,
  onSortByChange,
}: FilterBarProps) {
  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div role="search" className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索平台、模型..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="搜索套餐平台或模型"
            className="w-full h-9 pl-9 pr-8 rounded-md bg-secondary text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
          {/* Category */}
          <div className="flex items-center gap-1.5 shrink-0">
            {categoryOptions.map((opt) => (
              <button
                key={opt.value || "all"}
                onClick={() => onCategoryChange(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  categoryFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Billing */}
          <select
            value={billingFilter}
            onChange={(e) => onBillingFilterChange(e.target.value)}
            className="h-8 px-3 rounded-lg bg-secondary text-xs font-medium text-secondary-foreground border-none outline-none cursor-pointer focus:ring-2 focus:ring-primary/30 shrink-0"
            aria-label="计费单位筛选"
          >
            {billingOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="h-8 px-3 rounded-lg bg-secondary text-xs font-medium text-secondary-foreground border-none outline-none cursor-pointer focus:ring-2 focus:ring-primary/30 shrink-0"
            aria-label="排序"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
