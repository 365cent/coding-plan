import type { Plan } from "@/lib/plans-data"

export function StatsBar({ plans }: { plans: Plan[] }) {
  const perPlanMonthly = plans
    .map((p) =>
      p.tiers
        .filter((t) => !t.isFirstMonthOnly)
        .map((t) => {
          if (t.period === "季") return t.price / 3
          if (t.period === "年") return t.price / 12
          return t.price
        })
    )
    .map((arr) => (arr.length ? Math.min(...arr) : NaN))
    .filter((x) => Number.isFinite(x))

  const avgMonthly = perPlanMonthly.length
    ? perPlanMonthly.reduce((a, b) => a + b, 0) / perPlanMonthly.length
    : NaN
  const allModels = new Set(plans.flatMap((p) => p.models))
  const totalTools = Math.max(...plans.map((p) => Math.max(p.toolCount, p.tools.length)))

  const stats = [
    { label: "平台对比", value: String(plans.length) },
    { label: "平均月付", value: Number.isFinite(avgMonthly) ? `¥${avgMonthly.toFixed(1)}` : "—" },
    { label: "可选模型", value: `${allModels.size}+` },
    { label: "编程工具", value: `${totalTools}+` },
  ]

  return (
    <div className="mt-6 w-full">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center justify-center px-4 py-4 rounded-lg bg-card border border-border min-h-[72px]"
          >
            <span className="text-xl font-bold text-foreground">{s.value}</span>
            <span className="text-xs text-muted-foreground mt-1">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
