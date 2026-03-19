import type { Plan } from "@/lib/plans-data"
import { ShoppingCart } from "lucide-react"

export function PlanCard({ plan }: { plan: Plan }) {
  const regularTiers = plan.tiers.filter((t) => !t.isFirstMonthOnly)
  const dealTiers = plan.tiers.filter((t) => t.isFirstMonthOnly || t.firstMonthPrice != null)
  const buyUrl = plan.links.affiliate ?? plan.links.official
  const lowestPrice = regularTiers.length
    ? Math.min(
        ...regularTiers.map((t) => {
          if (t.period === "季") return Math.round(t.price / 3)
          if (t.period === "年") return Math.round(t.price / 12)
          return t.price
        })
      )
    : Infinity
  const lowestFirst = regularTiers.reduce<number | undefined>((min, t) => {
    if (t.firstMonthPrice === undefined) return min
    if (min === undefined) return t.firstMonthPrice
    return Math.min(min, t.firstMonthPrice)
  }, undefined)

  const lowestSecond = regularTiers.reduce<number | undefined>((min, t) => {
    if (t.secondMonthPrice === undefined) return min
    if (min === undefined) return t.secondMonthPrice
    return Math.min(min, t.secondMonthPrice)
  }, undefined)

  const lowestDealPrice = dealTiers.reduce<number | undefined>((min, t) => {
    const p = t.firstMonthPrice ?? t.price
    if (!Number.isFinite(p)) return min
    if (min === undefined) return p
    return Math.min(min, p)
  }, undefined)

  return (
    <div className="group bg-card rounded-xl border border-border hover:border-border transition-all hover:shadow-md flex flex-col">
      {/* Header */}
      <div className="p-5 pb-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 min-w-0">
            {plan.logo && (
              <a
                href={plan.links.affiliate ?? plan.links.official}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 mt-0.5"
                aria-label={`${plan.company} 购买/访问`}
              >
                <img
                  src={plan.logo.src}
                  alt={plan.logo.alt}
                  className="h-9 w-9 rounded-lg bg-secondary/70 border border-border object-contain"
                  loading="lazy"
                />
              </a>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{plan.company}</p>
              <h3 className="text-base font-semibold text-foreground mt-0.5 truncate">
                {plan.product}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            {/* 官网链接 - 不起眼的样式 */}
            <a
              href={plan.links.official}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              title="访问官网"
            >
              官网
            </a>
          </div>
        </div>

        <div className="flex items-baseline gap-1 mt-3">
          {lowestFirst !== undefined ? (
            <>
              <span className="text-2xl font-bold text-primary">{"¥"}{lowestFirst}</span>
              <span className="text-sm text-muted-foreground">/首月</span>
              {lowestSecond !== undefined && (
                <span className="text-sm text-muted-foreground ml-2">次月 {"¥"}{lowestSecond}</span>
              )}
              <span className="text-sm text-muted-foreground ml-2">续费 {"¥"}{lowestPrice}/月</span>
            </>
          ) : (
            <>
              <span className="text-2xl font-bold text-foreground">
                {Number.isFinite(lowestPrice) ? `¥${lowestPrice}` : "—"}
              </span>
              <span className="text-sm text-muted-foreground">
                /{regularTiers[0]?.period === "季" ? "季" : regularTiers[0]?.period === "年" ? "年" : "月"}
              </span>
            </>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="px-1.5 py-0.5 rounded-sm bg-muted text-[10px] font-medium text-muted-foreground">
            {plan.billingUnit}
          </span>
          {plan.tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded-sm bg-primary/8 text-[10px] font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Tiers (horizontal scroll, fixed height for aligned cards) */}
      <div className="p-5 pt-4">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
          套餐档位
        </p>
        <div className="h-[132px] -mx-1 px-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-2">
            {regularTiers.map((tier) => (
              <div
                key={tier.name}
                className="min-w-[220px] max-w-[220px] h-[132px] overflow-hidden px-3 py-2 rounded-lg bg-secondary/60 border border-border/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tier.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {tier.limit5h}/5h
                      {tier.limitWeek && <span>{" | "}{tier.limitWeek}/周</span>}
                      {tier.limitMonth && <span>{" | "}{tier.limitMonth}/月</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">
                      {"¥"}{tier.price}
                      <span className="text-xs text-muted-foreground font-normal">/{tier.period}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  {tier.firstMonthPrice !== undefined && (
                    <span className="text-[11px] font-medium text-primary">首月 ¥{tier.firstMonthPrice}</span>
                  )}
                  {tier.secondMonthPrice !== undefined && (
                    <span className="text-[11px] text-muted-foreground">次月 ¥{tier.secondMonthPrice}</span>
                  )}
                </div>
                {tier.notes && (
                  <p className="text-[11px] text-muted-foreground/70 mt-1 max-h-[32px] overflow-hidden">
                    {tier.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Models */}
      <div className="px-5 pb-4 h-[96px] overflow-y-auto">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
          支持模型
        </p>
        <div className="flex flex-wrap gap-1 max-h-[56px] overflow-hidden">
          {plan.models.map((m) => (
            <span
              key={m}
              className="px-2 py-0.5 rounded-md bg-secondary text-[11px] text-secondary-foreground"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Tools */}
      <div className="px-5 pb-5 h-[88px] overflow-y-auto">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
          适配工具 ({plan.toolCount}+)
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed max-h-[44px] overflow-hidden">
          {plan.tools.join(" / ")}
        </p>
      </div>

      {/* Order CTA (always present) */}
      <div className="px-5 pb-5 -mt-2 mt-auto">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            {lowestDealPrice !== undefined
              ? lowestDealPrice === 0
                ? "首月免费"
                : `首月 ¥${lowestDealPrice}`
              : Number.isFinite(lowestPrice)
                ? lowestPrice === 0
                  ? "免费体验"
                  : `¥${lowestPrice}/月`
                : "免费体验"}
          </p>
          <a
            href={buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-4 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground hover:brightness-110 transition text-xs font-bold"
            aria-label={`${plan.company} 立即购买`}
            title="立即购买"
          >
            <ShoppingCart className="h-4 w-4" />
            立即购买
          </a>
        </div>
      </div>
    </div>
  )
}
