import { plans } from "@/lib/plans-data"

export function Hero() {
  return (
    <section className="px-6 pt-20 pb-6 text-center">
      <p className="text-xs font-semibold text-primary/90 tracking-wider mb-3 uppercase">
        2026 持续更新 · {plans.length}家平台全面对比
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl text-balance">
        国内 Coding Plan 性价比排行
      </h1>
      <p className="mt-3 text-sm text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
        价格、模型、用量限制、每元请求数全面横评，助你选出最划算的编程套餐
      </p>
    </section>
  )
}
