"use client"

import {
  type Plan,
  lowestFirstMonthInPlan,
  purchasableRegularTiers,
  tierComparableMonthly,
} from "@/lib/plans-data"
import { ExternalLink } from "lucide-react"
import Image from "next/image"

export function ComparisonTable({ plans }: { plans: Plan[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">AI Coding Plan 套餐对比表</caption>
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap sticky left-0 bg-secondary/50 z-10"
            >
              平台
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
              入门价
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
              首月/次月
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
              计费单位
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
              5小时限额
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
              每月限额
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
              模型数
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
              工具数
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
              套餐档
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
              购买
            </th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan, i) => {
            const regularTiers = plan.tiers.filter((t) => !t.isFirstMonthOnly)
            const baseTier = purchasableRegularTiers(plan)[0]
            const buyUrl = plan.links.affiliate ?? plan.links.official
            const standardMonthlyPrice = baseTier ? tierComparableMonthly(baseTier) : undefined
            const firstMonthPrice = baseTier?.firstMonthPrice
            const minFirstMonth = lowestFirstMonthInPlan(plan)
            const buyDisplayPrice =
              minFirstMonth !== undefined ? minFirstMonth : firstMonthPrice ?? standardMonthlyPrice
            /** 按量包且存在任一档首月价时，购买列写「首月 ¥」；月付仍只写「¥」 */
            const buyPriceLabel =
              buyDisplayPrice != null
                ? buyDisplayPrice === 0
                  ? "首月免费"
                  : baseTier?.period === "包" && minFirstMonth !== undefined
                    ? `首月 ¥${buyDisplayPrice}`
                    : `¥${buyDisplayPrice}`
                : "—"
            return (
              <tr
                key={plan.id}
                data-plan-id={plan.id}
                data-company={plan.company}
                data-product={plan.product}
                data-min-price={standardMonthlyPrice ?? undefined}
                data-billing-unit={plan.billingUnit}
                className={`border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors ${
                  i % 2 === 0 ? "" : "bg-secondary/20"
                }`}
              >
                <th scope="row" className="px-4 py-3 sticky left-0 bg-card z-10 text-left font-normal">
                  <div className="min-w-[140px] flex items-start gap-2">
                    {plan.logo && (
                      <Image
                        src={plan.logo.src}
                        alt={plan.logo.alt}
                        width={20}
                        height={20}
                        className="h-5 w-5 rounded bg-secondary/50 object-contain shrink-0 mt-0.5"
                        loading={i === 0 ? "eager" : "lazy"}
                        priority={i === 0}
                      />
                    )}
                    <div>
                      <a
                        href={plan.links.official}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                      >
                        {plan.company}
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </a>
                      <p className="text-[11px] text-muted-foreground">{plan.product}</p>
                    </div>
                  </div>
                </th>
                <td className="px-4 py-3 whitespace-nowrap">
                  <>
                    <span className="font-semibold text-foreground">
                      {"¥"}{standardMonthlyPrice ?? "-"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {baseTier?.period === "包" ? "/包" : "/月"}
                      {baseTier?.period === "季" ? "(季付)" : baseTier?.period === "年" ? "(年付)" : ""}
                    </span>
                  </>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {minFirstMonth !== undefined ? (
                    minFirstMonth === 0 ? (
                      <span className="text-primary font-medium text-xs">首月免费</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-primary font-medium text-xs">首月 ¥{minFirstMonth}</span>
                        {baseTier?.secondMonthPrice !== undefined && (
                          <span className="text-muted-foreground text-xs">次月 ¥{baseTier.secondMonthPrice}</span>
                        )}
                      </div>
                    )
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
                    {plan.billingUnit}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                  {baseTier?.limit5h ?? "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                  {baseTier?.limitMonth ?? baseTier?.limitWeek ?? "-"}
                </td>
                <td className="px-4 py-3 text-center text-sm text-foreground">
                  {plan.models.length}
                </td>
                <td className="px-4 py-3 text-center text-sm text-foreground">
                  {Math.max(plan.toolCount, plan.tools.length)}+
                </td>
                <td className="px-4 py-3 text-center text-sm text-foreground">
                  {regularTiers.length}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <a
                    href={buyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-9 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:brightness-105 transition whitespace-nowrap"
                    aria-label={`${plan.company} ${buyPriceLabel} 立即购买`}
                  >
                    {buyPriceLabel} 立即购买
                  </a>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
