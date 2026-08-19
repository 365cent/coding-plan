import {
  type Plan,
  lowestPaidRegularTier,
  planComparableMonthlyPrice,
  planMonthlyRequestEq,
  planRequestsPerYuan,
  purchasableRegularTiers,
  tierComparableMonthly,
} from "./plans-data"

export const DEFAULT_TABLE_LEADER_IDS = ["tencent", "bailian-token-team", "ark-agent", "opencode-go"] as const

type PlanMetrics = {
  price: number
  free: boolean
  requestsPerYuan: number | undefined
  fallbackPerYuan: number
  monthlyRequestEq: number
}

function defaultLeaderRank(planId: string): number {
  const idx = DEFAULT_TABLE_LEADER_IDS.indexOf(planId as (typeof DEFAULT_TABLE_LEADER_IDS)[number])
  return idx === -1 ? DEFAULT_TABLE_LEADER_IDS.length : idx
}

function isFreeSubscription(plan: Plan): boolean {
  const prices = purchasableRegularTiers(plan)
    .map((t) => tierComparableMonthly(t))
    .filter((p) => Number.isFinite(p))
  return prices.length > 0 && Math.max(...prices) === 0
}

function effectiveToolCount(plan: Plan): number {
  return Math.max(plan.toolCount, plan.tools.length)
}

function computeMetrics(plan: Plan): PlanMetrics {
  const price = planComparableMonthlyPrice(plan) ?? Infinity
  const basic = lowestPaidRegularTier(plan)
  const valuePrice = basic ? tierComparableMonthly(basic) : price
  return {
    price,
    free: isFreeSubscription(plan),
    requestsPerYuan: planRequestsPerYuan(plan),
    fallbackPerYuan:
      valuePrice > 0 && Number.isFinite(valuePrice)
        ? (plan.models.length * 10 + effectiveToolCount(plan) * 5) / valuePrice
        : 0,
    monthlyRequestEq: planMonthlyRequestEq(plan) ?? 0,
  }
}

function compareValue(ma: PlanMetrics, mb: PlanMetrics): number {
  if (ma.requestsPerYuan !== undefined || mb.requestsPerYuan !== undefined) {
    if (ma.requestsPerYuan === undefined) return 1
    if (mb.requestsPerYuan === undefined) return -1
    if (ma.requestsPerYuan !== mb.requestsPerYuan) return mb.requestsPerYuan - ma.requestsPerYuan
  }
  return mb.fallbackPerYuan - ma.fallbackPerYuan
}

function compareFreeLast(ma: PlanMetrics, mb: PlanMetrics): number {
  if (ma.free === mb.free) return 0
  return ma.free ? 1 : -1
}

/** 首页默认排序：置顶平台 → 付费优先 → 性价比 → plans-data 原始顺序 */
export function sortPlansDefault(plans: Plan[]): Plan[] {
  const metrics = new Map(plans.map((p) => [p.id, computeMetrics(p)]))
  const originalIndex = new Map(plans.map((p, idx) => [p.id, idx]))

  return [...plans].sort((a, b) => {
    const leaderDiff = defaultLeaderRank(a.id) - defaultLeaderRank(b.id)
    if (leaderDiff) return leaderDiff
    const ma = metrics.get(a.id)!
    const mb = metrics.get(b.id)!
    const freeCmp = compareFreeLast(ma, mb)
    if (freeCmp !== 0) return freeCmp
    const valueCmp = compareValue(ma, mb)
    if (valueCmp !== 0) return valueCmp
    return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0)
  })
}

export function buildPlanOrderIndex(plans: Plan[]): Map<string, number> {
  return new Map(sortPlansDefault(plans).map((plan, index) => [plan.id, index]))
}

export function compareByHomepageDefaultOrder<T extends { planId: string; endpointOrder?: number }>(
  planOrder: Map<string, number>,
  a: T,
  b: T,
): number {
  const planRankDiff = (planOrder.get(a.planId) ?? Number.MAX_SAFE_INTEGER) - (planOrder.get(b.planId) ?? Number.MAX_SAFE_INTEGER)
  if (planRankDiff !== 0) return planRankDiff
  return (a.endpointOrder ?? 0) - (b.endpointOrder ?? 0)
}
