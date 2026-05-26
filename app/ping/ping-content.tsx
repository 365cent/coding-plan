"use client"

import { Notice } from "@/components/notice"
import { FaqSection } from "@/components/faq-section"

import { ArrowDown, ArrowUp, Check, Copy, Gauge, Waves, Info, X } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useRef, useState } from "react"
type Endpoint = {
  provider: string
  company: string
  product: string
  logoSrc: string
  logoAlt: string
  url: string
  region: "domestic" | "international"
}

type PingResult = {
  endpoint: Endpoint
  samples: number[]
  failed: number
  avg: number | null
  min: number | null
  max: number | null
  jitter: number | null
}

const ENDPOINTS: Endpoint[] = [
  { provider: "百炼", company: "阿里云", product: "百炼 Coding Plan", logoSrc: "/logos/qwen.png", logoAlt: "通义千问", url: "https://coding.dashscope.aliyuncs.com/v1", region: "domestic" },
  { provider: "百炼 Token Plan", company: "阿里云（华北）", product: "百炼 Token Plan", logoSrc: "/logos/qwen.png", logoAlt: "通义千问", url: "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1", region: "domestic" },
  { provider: "百炼（国际站）", company: "阿里云（国际站）", product: "百炼 Coding Plan", logoSrc: "/logos/qwen.png", logoAlt: "通义千问", url: "https://coding-intl.dashscope.aliyuncs.com/v1", region: "international" },
  { provider: "火山方舟", company: "字节跳动", product: "火山方舟 Coding Plan", logoSrc: "/logos/volcengine.png", logoAlt: "火山引擎", url: "https://ark.cn-beijing.volces.com/api/coding/v3", region: "domestic" },
  { provider: "火山方舟 Agent Plan", company: "字节跳动", product: "火山方舟 Agent Plan", logoSrc: "/logos/volcengine.png", logoAlt: "火山引擎", url: "https://ark.cn-beijing.volces.com/api/plan/v3", region: "domestic" },
  { provider: "BytePlus（字节国际站）", company: "字节跳动（国际站）", product: "BytePlus Coding", logoSrc: "/logos/volcengine.png", logoAlt: "火山引擎", url: "https://ark.ap-southeast.bytepluses.com/api/coding", region: "international" },
  { provider: "腾讯云", company: "腾讯云", product: "腾讯云 Token Plan", logoSrc: "/logos/tencentcloud.png", logoAlt: "腾讯云", url: "https://api.lkeap.cloud.tencent.com/plan/v3", region: "domestic" },
  { provider: "智谱 GLM", company: "智谱AI", product: "GLM Coding Plan", logoSrc: "/logos/bigmodel.png", logoAlt: "智谱AI", url: "https://open.bigmodel.cn/api/coding/paas/v4", region: "domestic" },
  { provider: "智谱 Z.ai（国际站）", company: "智谱AI（国际站）", product: "Z.ai Coding", logoSrc: "/logos/bigmodel.png", logoAlt: "智谱AI", url: "https://api.z.ai/api/coding/paas/v4", region: "international" },
  { provider: "Kimi", company: "月之暗面", product: "Kimi Code Plan", logoSrc: "/logos/kimi.png", logoAlt: "Kimi", url: "https://api.kimi.com/coding/v1", region: "domestic" },
  { provider: "MiniMax", company: "MiniMax", product: "MiniMax Token Plan", logoSrc: "/logos/minimax.png", logoAlt: "MiniMax", url: "https://api.minimaxi.com/v1/", region: "domestic" },
  { provider: "MiniMax（国际站）", company: "MiniMax（国际站）", product: "MiniMax Token Plan", logoSrc: "/logos/minimax.png", logoAlt: "MiniMax", url: "https://api.minimax.io/v1", region: "international" },
  { provider: "MiMo", company: "小米", product: "MiMo Token Plan", logoSrc: "/logos/xiaomi.png", logoAlt: "小米", url: "https://token-plan-cn.xiaomimimo.com/v1", region: "domestic" },
  { provider: "MiMo（亚太）", company: "小米（亚太）", product: "MiMo Token Plan", logoSrc: "/logos/xiaomi.png", logoAlt: "小米", url: "https://token-plan-sgp.xiaomimimo.com/v1", region: "international" },
  { provider: "MiMo（欧洲）", company: "小米（欧洲）", product: "MiMo Token Plan", logoSrc: "/logos/xiaomi.png", logoAlt: "小米", url: "https://token-plan-ams.xiaomimimo.com/v1", region: "international" },
  { provider: "Infini", company: "无问芯穹", product: "Infini Coding Plan", logoSrc: "/logos/infini.png", logoAlt: "无问芯穹", url: "https://cloud.infini-ai.com/maas/coding/v1", region: "domestic" },
  { provider: "UCloud", company: "UCloud 优刻得", product: "优云智算 Agent Plan", logoSrc: "/logos/ucloud.png", logoAlt: "UCloud", url: "https://cp.compshare.cn/v1", region: "domestic" },
  { provider: "OpenCode Go", company: "Anomaly", product: "OpenCode Go", logoSrc: "/logos/opencode.png", logoAlt: "OpenCode", url: "https://opencode.ai/zen/go/v1", region: "international" },
  { provider: "千帆", company: "百度", product: "千帆 Coding Plan", logoSrc: "/logos/yiyan.png", logoAlt: "文心一言", url: "https://qianfan.baidubce.com/v2/coding", region: "domestic" },
  { provider: "科大讯飞", company: "科大讯飞", product: "讯飞星辰 Astron Coding Plan", logoSrc: "/logos/xfyun.png", logoAlt: "讯飞星辰", url: "https://maas-coding-api.cn-huabei-1.xf-yun.com/v2", region: "domestic" },
  { provider: "京东云", company: "京东云", product: "京东云 Coding Plan", logoSrc: "/logos/jd.png", logoAlt: "京东", url: "https://modelservice.jdcloud.com/coding/openai/v1", region: "domestic" },
  { provider: "快手 KwaiKAT", company: "快手", product: "KwaiKAT Coding Plan", logoSrc: "/logos/kuaishou.png", logoAlt: "快手", url: "https://wanqing.streamlakeapi.com/api/gateway/coding/v1", region: "domestic" },
  { provider: "联通云（贵阳）", company: "联通云（贵阳）", product: "Coding Plan", logoSrc: "/logos/cucloud.png", logoAlt: "联通云", url: "https://aigw-gzgy2.cucloud.cn:8443/v1", region: "domestic" },
  { provider: "联通云（济南）", company: "联通云（济南）", product: "Coding Plan", logoSrc: "/logos/cucloud.png", logoAlt: "联通云", url: "https://aigw-jnzs5.cucloud.cn:8443/v1", region: "domestic" },
]

const SAMPLE_COUNT = 5
const TIMEOUT_MS = 5000
const TEST_CONCURRENCY = 4
const COLOR_REFERENCE_MS = 1200
const WARMUP_COUNT = 1

function avg(v: number[]) {
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
}
function min(v: number[]) {
  return v.length ? Math.round(Math.min(...v)) : null
}
function max(v: number[]) {
  return v.length ? Math.round(Math.max(...v)) : null
}
function jitter(v: number[]) {
  if (v.length < 2) return null
  let t = 0
  for (let i = 1; i < v.length; i++) t += Math.abs(v[i] - v[i - 1])
  return Math.round(t / (v.length - 1))
}

function median(v: number[]) {
  if (v.length === 0) return null
  const sorted = [...v].sort((a, b) => a - b)
  const m = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[m - 1] + sorted[m]) / 2) : sorted[m]
}

function robustSamples(v: number[]) {
  if (v.length < 4) return v
  const med = median(v)
  if (med == null) return v

  const absDev = v.map((x) => Math.abs(x - med))
  const mad = median(absDev)
  if (mad == null || mad === 0) return v

  // Modified Z-score based outlier rejection: |x-med| / (1.4826*MAD) <= 3.5
  const sigma = 1.4826 * mad
  const filtered = v.filter((x) => Math.abs(x - med) / sigma <= 3.5)
  // Keep enough points for stable stats; otherwise use original sample set.
  if (filtered.length >= 3) return filtered
  return v
}

async function pingOnce(url: string, signal?: AbortSignal): Promise<number> {
  const ctrl = new AbortController()
  const mergedSignal = signal ? AbortSignal.any([signal, ctrl.signal]) : ctrl.signal
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  const t0 = performance.now()
  try {
    await fetch(url, { method: "GET", mode: "no-cors", cache: "no-store", signal: mergedSignal })
    return Math.round(performance.now() - t0)
  } finally {
    clearTimeout(timer)
  }
}

async function testEndpoint(ep: Endpoint, signal?: AbortSignal): Promise<PingResult> {
  const rawSamples: number[] = []
  let failed = 0
  const totalAttempts = SAMPLE_COUNT + WARMUP_COUNT
  for (let i = 0; i < totalAttempts; i++) {
    if (signal?.aborted) break
    try {
      const one = await pingOnce(`${ep.url}${ep.url.includes("?") ? "&" : "?"}_t=${Date.now()}_${i}`, signal)
      // Drop warm-up sample to reduce DNS/TLS cold-start skew.
      if (i >= WARMUP_COUNT) rawSamples.push(one)
    } catch {
      if (i >= WARMUP_COUNT) failed++
    }
  }
  const samples = robustSamples(rawSamples)
  return { endpoint: ep, samples, failed, avg: avg(samples), min: min(samples), max: max(samples), jitter: jitter(samples) }
}

function rankResults(items: PingResult[]) {
  return [...items].sort((a, b) => {
    if (a.avg == null && b.avg == null) return 0
    if (a.avg == null) return 1
    if (b.avg == null) return -1
    return a.avg - b.avg
  })
}

function ms(v: number | null) {
  return v == null ? "—" : `${v}`
}

type FilterMode = "all" | "domestic" | "international"

const pingFaqs = [
  {
    q: "API延迟低是否意味着大模型的响应速度更快？",
    a: "存在相关性，但不完全对等。HTTP Ping 测试主要衡量设备至 API 服务器端点的网络建立及响应时间。低网络延迟是实现快速响应的重要基础，能有效缩减请求前置耗时。然而，大模型实际的输出体感（如首字响应时间 TTFT 和每秒生成吞吐量 TPS）更核心地受制于模型参数规模、厂商下发的推理算力，以及高并发态下的集群限流策略。总体而言，网络延迟是影响用户最终交互体感的子集变量。"
  },
  {
    q: "为什么部分接口的测速状态会显示为“超时”？",
    a: "主要由客户端安全策略拦截或物理网络链路拥堵引起。浏览器发起的跨源资源共享（CORS）若未被服务端适配允许，其探测请求将被浏览器主动拦截导致超时。此外，国际出口流量波动、运营商路由策略或本地防火墙规则限制均可导致封包丢失。测速超时客观反映了当前测试节点环境直连目标服务器的受阻状态，但不可直接作为判定该 API 骨干服务产生故障的绝对依据。"
  },
  {
    q: "为什么在服务器发起的API请求，其延迟表现通常优于本地浏览器的测速结果？",
    a: "网络拓扑结构与路由节点的物理差异决定了耗时量级。商业云服务器通常部署于高等级数据中心，具备直连大厂 API 网关的骨干网络支撑；部分场景下（如云上同城内网调用），路由链路得到高度精简，延迟可下探至毫秒级。相对而言，通过个人宽带的客户端链路需经多级市级、省级运营商节点汇集处理，传输损耗客观存在。因此，在生产环境下于服务器端发起部署请求，其实际通讯效率通常优于个人设备的浏览器直接评测。"
  }
]

export function PingContent() {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<PingResult[]>([])
  const [testCompleted, setTestCompleted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [filter, setFilter] = useState<FilterMode>("all")
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [activeUrls, setActiveUrls] = useState<Set<string>>(new Set())
  const abortRef = useRef(false)
  const runAbortRef = useRef<AbortController | null>(null)
  const copiedTimerRef = useRef<number | null>(null)

  const stats = useMemo(() => {
    let testedCount = 0
    let sumAvg = 0
    let minLatency = Infinity
    let successCount = 0

    for (const r of results) {
      testedCount++
      if (r.avg != null) {
        successCount++
        sumAvg += r.avg
        if (r.min != null && r.min < minLatency) minLatency = r.min
      }
    }

    const overallAvg = successCount > 0 ? Math.round(sumAvg / successCount) : null
    const overallMin = minLatency !== Infinity ? minLatency : null
    const availability = testedCount > 0 ? Math.round((successCount / testedCount) * 100) : null

    return [
      { label: "测试接口", value: String(ENDPOINTS.length) },
      { label: "平均延迟", value: overallAvg != null ? `${overallAvg} ms` : "—" },
      { label: "最快响应", value: overallMin != null ? `${overallMin} ms` : "—" },
      { label: "连通率", value: availability != null ? `${availability}%` : "—" },
    ]
  }, [results])

  const displayRows = useMemo(() => {
    const resultMap = new Map(results.map((r) => [r.endpoint.url, r]))
    const filteredEndpoints =
      filter === "all" ? ENDPOINTS : ENDPOINTS.filter((ep) => ep.region === filter)

    const orderedEndpoints = testCompleted
      ? [...filteredEndpoints].sort((a, b) => {
          const aAvg = resultMap.get(a.url)?.avg
          const bAvg = resultMap.get(b.url)?.avg
          if (aAvg == null && bAvg == null) return 0
          if (aAvg == null) return 1
          if (bAvg == null) return -1
          return aAvg - bAvg
        })
      : filteredEndpoints

    return orderedEndpoints.map((endpoint) => ({
      endpoint,
      result: resultMap.get(endpoint.url),
    }))
  }, [results, filter, testCompleted])

  const maxAvg = useMemo(() => {
    let m = 0
    for (const row of displayRows) {
      if (row.result?.avg != null && row.result.avg > m) m = row.result.avg
    }
    // Keep early-stage scale stable/greener before enough samples arrive.
    return Math.max(m, COLOR_REFERENCE_MS)
  }, [displayRows])

  const renderCompanyTitle = (company: string) => {
    // Check if there's parenthetical info e.g. "阿里云（国际站）" or "MiniMax(国际站)"
    const match = company.match(/^(.*?)(\(|（)(.*?)(\)|）)?$/)
    let mainName = company
    let attr = ""
    if (match) {
      mainName = match[1].trim()
      attr = match[3]
    }
    const targetSearch = `by:provider ${mainName}`

    if (attr) {
      return (
        <span className="inline-flex items-center gap-1">
          <span>{mainName}</span>
          <button
            type="button"
            onClick={() => router.push(`/?q=${encodeURIComponent(targetSearch)}`)}
            className="inline-flex cursor-pointer items-center gap-0.5 text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm"
            title={`查看${mainName}套餐详细`}
            aria-label={`查看${mainName}套餐详细`}
          >
            <span className="text-[10px] sm:text-xs">({attr})</span>
            <Info className="h-2.5 w-2.5 sm:h-3 sm:w-3 cursor-pointer" />
          </button>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1">
        <span>{mainName}</span>
        <button
          type="button"
          onClick={() => router.push(`/?q=${encodeURIComponent(targetSearch)}`)}
          className="inline-flex cursor-pointer items-center text-muted-foreground/70 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm"
          title={`查看${mainName}套餐详细`}
          aria-label={`查看${mainName}套餐详细`}
        >
          <Info className="h-3 w-3 cursor-pointer" />
        </button>
      </span>
    )
  }

  const run = useCallback(async () => {
    abortRef.current = false
    runAbortRef.current?.abort()
    runAbortRef.current = new AbortController()
    const runSignal = runAbortRef.current.signal
    setRunning(true)
    setTestCompleted(false)
    setResults([])
    setProgress(0)
    setActiveUrls(new Set())
    const resultByIndex: Array<PingResult | undefined> = new Array(ENDPOINTS.length)
    let nextIndex = 0
    let completed = 0

    const worker = async () => {
      while (!abortRef.current) {
        const i = nextIndex
        nextIndex += 1
        if (i >= ENDPOINTS.length) return
        const endpointUrl = ENDPOINTS[i].url
        setActiveUrls((prev) => {
          const next = new Set(prev)
          next.add(endpointUrl)
          return next
        })
        const res = await testEndpoint(ENDPOINTS[i], runSignal)
        setActiveUrls((prev) => {
          const next = new Set(prev)
          next.delete(endpointUrl)
          return next
        })
        if (abortRef.current) return
        resultByIndex[i] = res
        completed += 1
        setResults(resultByIndex.filter((r): r is PingResult => r !== undefined))
        setProgress(Math.round((completed / ENDPOINTS.length) * 100))
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(TEST_CONCURRENCY, ENDPOINTS.length) }, () => worker()),
    )

    if (!abortRef.current && completed === ENDPOINTS.length) {
      setTestCompleted(true)
    }
    setActiveUrls(new Set())
    runAbortRef.current = null
    setRunning(false)
  }, [])

  const stop = useCallback(() => {
    abortRef.current = true
    runAbortRef.current?.abort()
    setActiveUrls(new Set())
  }, [])

  const urlRegionMap = useMemo(() => {
    const map = new Map<string, Set<"domestic" | "international">>()
    for (const ep of ENDPOINTS) {
      const regions = map.get(ep.url) ?? new Set<"domestic" | "international">()
      regions.add(ep.region)
      map.set(ep.url, regions)
    }
    return map
  }, [])

  const copyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = window.setTimeout(() => {
        setCopiedUrl(null)
        copiedTimerRef.current = null
      }, 1400)
    } catch {
      // Ignore clipboard failures silently to avoid breaking table interactions.
    }
  }, [])

  return (
    <main id="main-content" className="min-h-screen bg-background text-foreground">
      <section className="px-6 pt-20 pb-6 text-center">
        <p className="text-xs font-semibold text-primary/90 tracking-wider mb-3 uppercase">
          HTTP Ping · {ENDPOINTS.length} 个接口
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl text-balance">
          Coding Plan API 测速
        </h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
          基于浏览器 HTTP 请求时延测量各平台 API 接口延迟，结果受本地网络环境影响仅作参考
        </p>
      </section>

      <div className="sticky top-14 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1.5 shrink-0">
            {(["all", "domestic", "international"] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                aria-pressed={filter === mode}
                className={`h-8 px-2.5 inline-flex items-center rounded-lg text-xs font-medium whitespace-nowrap transition-all border border-transparent cursor-pointer ${
                  filter === mode
                    ? "bg-primary text-primary-foreground"
                    : "bg-background/60 text-foreground border-border/70 hover:bg-accent"
                }`}
              >
                {mode === "all" ? "全部" : mode === "domestic" ? "国内" : "海外"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            {running && (
              <button
                type="button"
                onClick={stop}
                className="h-8 px-3 rounded-md border border-border/70 text-xs font-medium text-foreground hover:bg-accent transition-colors shrink-0 cursor-pointer"
              >
                停止
              </button>
            )}
            <button
              type="button"
              onClick={run}
              disabled={running}
              className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition shrink-0 cursor-pointer"
            >
              {running ? `测试中 ${progress}%` : results.length > 0 ? "重新测试" : "开始测试"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-6 pt-6">
        <div className="md:hidden space-y-2">
          {displayRows.length === 0 ? (
            <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              点击「开始测试」发起延迟检测
            </div>
          ) : (
            displayRows.map(({ endpoint, result }, idx) => {
              const pct = result?.avg != null ? Math.max((result.avg / maxAvg) * 100, 4) : 0
              const hue = result?.avg != null ? Math.max(120 - (result.avg / maxAvg) * 120, 0) : 120
              return (
                <div
                  key={`mobile-${endpoint.provider}-${endpoint.url}`}
                  className="rounded-lg border border-border bg-card p-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2"
                >
                  <div className="min-w-0 flex items-start gap-2">
                    <Image
                      src={endpoint.logoSrc}
                      alt={endpoint.logoAlt}
                      width={20}
                      height={20}
                      className="h-4 w-4 rounded bg-secondary/50 object-contain shrink-0 self-center"
                      loading="lazy"
                    />
                    <div className="min-w-0 group/row">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="text-xs font-medium text-foreground leading-tight">
                          {renderCompanyTitle(endpoint.company)}
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${
                            endpoint.region === "domestic"
                              ? "bg-primary/8 text-primary"
                              : "bg-chart-2/10 text-chart-2"
                          }`}
                        >
                          {(() => {
                            const regions = urlRegionMap.get(endpoint.url)
                            if (regions?.has("domestic") && regions?.has("international")) return "国内/海外"
                            return endpoint.region === "domestic" ? "国内" : "海外"
                          })()}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{endpoint.product}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">{testCompleted ? `#${idx + 1}` : "未排名"}</p>
                    <p className="text-xs font-medium text-foreground">
                      {!result
                        ? activeUrls.has(endpoint.url)
                          ? "测试中"
                          : "未测试"
                        : result.avg == null
                          ? "超时"
                          : `${result.avg} ms`}
                    </p>
                  </div>

                  <div className="col-span-2 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: result?.avg != null ? `${pct}%` : "0%",
                          backgroundColor: `hsl(${hue} 70% 50%)`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="col-span-2 inline-flex max-w-full items-center gap-1 rounded-md border border-border/40 bg-muted/20 px-1.5 py-0.5">
                    <code className="text-[10px] leading-snug text-muted-foreground/80 break-all font-normal">
                      {endpoint.url}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyUrl(endpoint.url)}
                      className={`h-4 w-4 shrink-0 inline-flex items-center justify-center rounded-sm transition-all ${
                        copiedUrl === endpoint.url
                          ? "text-primary/90 bg-primary/8"
                          : "text-muted-foreground/80 hover:text-muted-foreground hover:bg-muted/50"
                      }`}
                      aria-label={copiedUrl === endpoint.url ? "已复制" : "复制接口地址"}
                      title={copiedUrl === endpoint.url ? "已复制" : "复制"}
                    >
                      {copiedUrl === endpoint.url ? (
                        <Check className="h-3 w-3 transition-transform duration-200 scale-100" />
                      ) : (
                        <Copy className="h-3 w-3 transition-transform duration-200" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap w-10">排名</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">平台</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap hidden md:table-cell">区域</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap hidden md:table-cell">接口地址</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap text-right hidden md:table-cell">平均</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap text-right hidden md:table-cell">最低</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap text-right hidden md:table-cell">最高</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap text-right hidden md:table-cell">抖动</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap" style={{ minWidth: 160 }}>
                  延迟
                </th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    点击「开始测试」发起延迟检测
                  </td>
                </tr>
              ) : (
                displayRows.map(({ endpoint, result }, idx) => {
                  const pct = result?.avg != null ? Math.max((result.avg / maxAvg) * 100, 4) : 0
                  const hue = result?.avg != null ? Math.max(120 - (result.avg / maxAvg) * 120, 0) : 120
                  return (
                    <tr
                      key={`${endpoint.provider}-${endpoint.url}`}
                      className="border-b border-border last:border-b-0 hover:bg-accent/40 transition-all duration-500 ease-out"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-medium">
                        {testCompleted ? idx + 1 : "-"}
                      </td>
                      <th scope="row" className="px-2 sm:px-4 py-2.5 sm:py-3 sticky left-0 bg-card z-10 text-left font-normal">
                        <div className="min-w-[132px] sm:min-w-[170px]">
                          <div className="flex items-start gap-1.5 sm:gap-2">
                            <Image
                              src={endpoint.logoSrc}
                              alt={endpoint.logoAlt}
                              width={20}
                              height={20}
                              className="h-4 w-4 sm:h-5 sm:w-5 rounded bg-secondary/50 object-contain shrink-0 mt-0.5"
                              loading="lazy"
                            />
                            <div>
                              <div className="text-xs sm:text-sm font-medium text-foreground leading-tight">
                                {renderCompanyTitle(endpoint.company)}
                              </div>
                              <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight mt-0.5">
                                {endpoint.product}
                              </p>
                            </div>
                          </div>
                          <div className="md:hidden mt-1 inline-flex max-w-full items-center gap-1 rounded-md border border-border/40 bg-muted/20 px-1.5 py-0.5">
                            <code className="text-[10px] leading-snug text-muted-foreground/80 break-all font-normal">
                              {endpoint.url}
                            </code>
                            <button
                              type="button"
                              onClick={() => copyUrl(endpoint.url)}
                              className={`h-4 w-4 shrink-0 inline-flex items-center justify-center rounded-sm transition-all ${
                                copiedUrl === endpoint.url
                                  ? "text-primary/90 bg-primary/8"
                                  : "text-muted-foreground/80 hover:text-muted-foreground hover:bg-muted/50"
                              }`}
                              aria-label={copiedUrl === endpoint.url ? "已复制" : "复制接口地址"}
                              title={copiedUrl === endpoint.url ? "已复制" : "复制"}
                            >
                              {copiedUrl === endpoint.url ? (
                                <Check className="h-3 w-3 transition-transform duration-200 scale-100" />
                              ) : (
                                <Copy className="h-3 w-3 transition-transform duration-200" />
                              )}
                            </button>
                          </div>
                        </div>
                      </th>
                      <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                        <span
                          className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${
                            endpoint.region === "domestic"
                              ? "bg-primary/8 text-primary"
                              : "bg-chart-2/10 text-chart-2"
                          }`}
                        >
                          {(() => {
                            const regions = urlRegionMap.get(endpoint.url)
                            if (regions?.has("domestic") && regions?.has("international")) return "国内/海外"
                            return endpoint.region === "domestic" ? "国内" : "海外"
                          })()}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/40 bg-muted/20 px-1.5 py-0.5">
                          <code className="text-[11px] leading-snug text-muted-foreground/80 break-all font-normal">
                            {endpoint.url}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyUrl(endpoint.url)}
                            className={`h-5 w-5 shrink-0 inline-flex items-center justify-center rounded-sm transition-all ${
                              copiedUrl === endpoint.url
                                ? "text-primary/90 bg-primary/8"
                                : "text-muted-foreground/80 hover:text-muted-foreground hover:bg-muted/50"
                            }`}
                            aria-label={copiedUrl === endpoint.url ? "已复制" : "复制接口地址"}
                            title={copiedUrl === endpoint.url ? "已复制" : "复制"}
                          >
                            {copiedUrl === endpoint.url ? (
                              <Check className="h-3.5 w-3.5 transition-transform duration-200 scale-100" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 transition-transform duration-200" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums hidden md:table-cell">{ms(result?.avg ?? null)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground hidden md:table-cell">{ms(result?.min ?? null)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground hidden md:table-cell">{ms(result?.max ?? null)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground hidden md:table-cell">{ms(result?.jitter ?? null)}</td>
                      <td className="px-4 py-3">
                        {result?.avg != null ? (
                          <div className="flex flex-col items-end sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: `hsl(${hue} 70% 50%)`,
                                }}
                              />
                            </div>
                            <span className="text-[11px] tabular-nums text-muted-foreground whitespace-nowrap w-12 text-right">
                              {result.avg} ms
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {!result ? (activeUrls.has(endpoint.url) ? "测试中" : "未测试") : "超时"}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          每个接口预热 {WARMUP_COUNT} 次后测试 {SAMPLE_COUNT} 次；结果采用稳健统计（基于中位数与 MAD 的异常值过滤）。并发 {TEST_CONCURRENCY} 路，超时 {TIMEOUT_MS / 1000}s。受浏览器跨域策略与本地网络环境影响，结果仅作参考。
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-2 pb-2 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
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

      <div className="max-w-7xl mx-auto px-6 pb-6 mt-2">
        <Notice title="测速说明">
          <p>当前 HTTP Ping 仅反映客户端到各平台 API 服务器的网络连接延迟。低延迟有助于缩短请求的初始响应周期，但大模型的实际生成速度还取决于模型参数规模、服务端算力分配及限流策略等多重因素。</p>
          <p>更多详情请查看下方的 <a href="#faq" className="text-primary hover:underline font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm">测速相关问题</a>。</p>
        </Notice>
      </div>

      <FaqSection items={pingFaqs} />
    </main>
  )
}
