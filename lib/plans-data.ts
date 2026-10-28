export type PlanCategory = "国内大厂" | "其他"

export function normalizeModelText(s: string): string {
  return s
    .toLowerCase()
    .replace(/-/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

/** 判断模型名是否匹配搜索词（忽略大小写与空格/连字符差异） */
export function modelMatchesQuery(model: string, query: string): boolean {
  return normalizeModelText(model).includes(normalizeModelText(query))
}

export type Plan = {
  id: string
  company: string
  product: string
  category: PlanCategory
  links: {
    official: string
    affiliate?: string
  }
  logo?: {
    src: string
    alt: string
  }
  models: string[]
  tiers: Tier[]
  billingUnit: "API请求" | "请求次数" | "按量计费" | "积分制" | "Token计费"
  tools: string[]
  toolCount: number
  tags: string[]
  /** 重要说明（展示在卡片内，如停售公告） */
  notice?: string
  yearlyPrice?: number      // 年付价格 (e.g., Kimi ¥468/年)
  quarterlyPrice?: number   // 季付价格
}

export type Tier = {
  name: string
  price: number
  firstMonthPrice?: number
  secondMonthPrice?: number  // 次月价格 (e.g., 次月半价)
  /** 包 = 一次性按量包（非连续月付） */
  period: "月" | "季" | "年" | "包"
  limit5h: string
  limitWeek?: string
  limitMonth?: string
  limit5hCount?: number      // 结构化：5小时配额（次）
  limitWeekCount?: number    // 结构化：7天配额（次）
  limitMonthCount?: number   // 结构化：30天配额（次）
  /** 月度 Token 配额（含官方公布的积分→Token 折算），用于跨计费单位比价 */
  limitMonthTokens?: number
  /** 直接给定的月等效模型调用次数（官方按积分/美元规则折算所得） */
  requestEqMonth?: number
  /** 配额按「对话/提问」计数（一次提问 ≈ 多次模型调用），而非按模型调用计数 */
  countsPrompts?: boolean
  isFirstMonthOnly?: boolean // 新人专享一次性，不计入最低月付
  /** 已停止接受新购（仍展示供参考，UI 删除线） */
  discontinuedForNewSales?: boolean
  notes?: string
}

/** 参与比价、卡片主价格的常规档位（排除停售新购；若全部停售则回退为全部常规档） */
export function purchasableRegularTiers(plan: Plan): Tier[] {
  const regular = plan.tiers.filter((t) => !t.isFirstMonthOnly)
  const active = regular.filter((t) => !t.discontinuedForNewSales)
  return active.length ? active : regular
}

/** 全套餐（含新人专享）中最低首月价；不停售档才计入 */
export function lowestFirstMonthInPlan(plan: Plan): number | undefined {
  let best: number | undefined
  for (const t of plan.tiers) {
    if (t.discontinuedForNewSales) continue
    if (t.firstMonthPrice === undefined) continue
    if (best === undefined || t.firstMonthPrice < best) best = t.firstMonthPrice
  }
  return best
}

/** 用于排序、入门价等：按量包按标价比较；月季年按折算月价 */
export function tierComparableMonthly(t: Tier): number {
  if (t.period === "季") return Math.round(t.price / 3)
  if (t.period === "年") return Math.round(t.price / 12)
  return t.price
}

/**
 * 跨计费单位比价的折算系数（均取自官方公开口径）：
 * - TOKENS_PER_REQUEST：一次 Agent 模型调用约消耗的 Token 数。
 *   OpenCode Go 官方观测均值约 5.3万–8.7万/次；腾讯 Hy 官方「35M tokens ≈ 70 轮问答」
 *   配合「简单任务约 5-10 次调用/轮」≈ 6.6万/次。两个独立来源收敛于 ~6万。
 * - CALLS_PER_PROMPT：一次对话/提问触发的模型调用次数。
 *   火山方舟/京东云官方口径「简单 Agent 任务约消耗 5-10 次调用」，取中值 7.5。
 * - 周→月、5小时→月：方舟/讯飞/京东官方档位均满足 月配额 = 2×周配额 = 15×5小时配额。
 */
export const TOKENS_PER_REQUEST = 60_000
export const CALLS_PER_PROMPT = 7.5
const WEEKS_PER_MONTH = 4
const FIVE_HOUR_WINDOWS_PER_MONTH = 15

/** 单档位月等效模型调用次数；无可信折算依据时返回 undefined */
export function tierMonthlyRequestEq(t: Tier): number | undefined {
  if (t.requestEqMonth !== undefined) return t.requestEqMonth
  if (t.limitMonthTokens !== undefined) return Math.round(t.limitMonthTokens / TOKENS_PER_REQUEST)
  const counted =
    t.limitMonthCount ??
    (t.limitWeekCount !== undefined
      ? t.limitWeekCount * WEEKS_PER_MONTH
      : t.limit5hCount !== undefined
        ? t.limit5hCount * FIVE_HOUR_WINDOWS_PER_MONTH
        : undefined)
  if (counted === undefined) return undefined
  return t.countsPrompts ? Math.round(counted * CALLS_PER_PROMPT) : counted
}

/** 可购档位中最低正价档（常规月价，不含首月优惠） */
export function lowestPaidRegularTier(plan: Plan): Tier | undefined {
  let best: Tier | undefined
  let minPrice = Infinity
  for (const t of purchasableRegularTiers(plan)) {
    const monthly = tierComparableMonthly(t)
    if (!Number.isFinite(monthly) || monthly <= 0) continue
    if (monthly < minPrice) {
      minPrice = monthly
      best = t
    }
  }
  return best
}

/** 对比基准档：最低付费档；无付费档时回退首档 */
export function basicRegularTier(plan: Plan): Tier | undefined {
  return lowestPaidRegularTier(plan) ?? purchasableRegularTiers(plan)[0]
}

/** 对比/排序用的常规月价：最低付费档正价；无付费档时回退首档（如全免费） */
export function planComparableMonthlyPrice(plan: Plan): number | undefined {
  const basic = basicRegularTier(plan)
  if (!basic) return undefined
  const monthly = tierComparableMonthly(basic)
  return Number.isFinite(monthly) ? monthly : undefined
}

/** 全平台月等效调用配额（最低付费档），用于「请求频次」排序 */
export function planMonthlyRequestEq(plan: Plan): number | undefined {
  const basic = lowestPaidRegularTier(plan)
  return basic ? tierMonthlyRequestEq(basic) : undefined
}

function tierMonthlyRateLimitEq(t: Tier | undefined): number | undefined {
  if (!t) return undefined
  if (t.limitMonthCount !== undefined) return t.limitMonthCount
  return tierMonthlyRequestEq(t)
}

/** 请求频次排序：先比 5 小时，再比每周，最后比每月（高者优先，无数据排后） */
export function comparePlanRateLimits(a: Plan, b: Plan): number {
  const ta = basicRegularTier(a)
  const tb = basicRegularTier(b)
  const cols: [number | undefined, number | undefined][] = [
    [ta?.limit5hCount, tb?.limit5hCount],
    [ta?.limitWeekCount, tb?.limitWeekCount],
    [tierMonthlyRateLimitEq(ta), tierMonthlyRateLimitEq(tb)],
  ]
  for (const [va, vb] of cols) {
    if (va === undefined && vb === undefined) continue
    if (va === undefined) return 1
    if (vb === undefined) return -1
    if (va !== vb) return vb - va
  }
  return 0
}

/** 性价比：每元每月可得的等效调用次数（最低付费档，常规月价，不含首月优惠） */
export function planRequestsPerYuan(plan: Plan): number | undefined {
  const basic = lowestPaidRegularTier(plan)
  if (!basic) return undefined
  const monthly = tierComparableMonthly(basic)
  if (!Number.isFinite(monthly) || monthly <= 0) return undefined
  const eq = tierMonthlyRequestEq(basic)
  if (eq === undefined) return undefined
  return eq / monthly
}

export const plans: Plan[] = [
  {
    id: "tuanjie-codely",
    company: "Unity团结引擎",
    product: "团结 Codely Plan",
    category: "国内大厂",
    links: {
      official: "https://codely.tuanjie.cn/pricing",
    },
    logo: { src: "/logos/unity-cn.png", alt: "Unity团结引擎" },
    notice:
      "2026年8月19日 Tuanjie Cowork 2.0.5：新增 Kimi K3 模型支持，Unity Insight 自动启用与四步索引进度。2026年8月11日 2.0.4：上线「套餐与用量」页与额度耗尽升级引导。新用户前 2 个月享 2 折优惠（月付恢复原价、季付 8 折、年付 7 折）；闲时积分消耗减半。",
    models: ["Kimi K3", "GLM 5.2", "Qwen 3.8 Max", "DeepSeek V4 Flash"],
    tiers: [
      {
        name: "Lite",
        price: 98,
        firstMonthPrice: 19.6,
        secondMonthPrice: 19.6,
        period: "月",
        limit5h: "800 积分",
        limitWeek: "4,000 积分",
        limitMonth: "16,000 积分",
        limit5hCount: 800,
        limitWeekCount: 4000,
        limitMonthCount: 16000,
        limitMonthTokens: 640_000_000,
        notes:
          "适合个人学习与轻量开发；主流热门编程模型集合；不支持视频生成。编码场景（Core/GLM-5.2、约 95% cache）约 160M Token/周（高峰）/ 320M（闲时）。",
      },
      {
        name: "Pro",
        price: 328,
        firstMonthPrice: 65.6,
        secondMonthPrice: 65.6,
        period: "月",
        limit5h: "3,200 积分",
        limitWeek: "16,000 积分",
        limitMonth: "64,000 积分",
        limit5hCount: 3200,
        limitWeekCount: 16000,
        limitMonthCount: 64000,
        limitMonthTokens: 2_560_000_000,
        notes:
          "适合高频编码与持续迭代；支持高阶编程/多模态模型与视频生成；更快生成速度与多任务并行。编码场景约 640M Token/周（高峰）/ 1.28B（闲时）。",
      },
      {
        name: "Max",
        price: 648,
        firstMonthPrice: 129.6,
        secondMonthPrice: 129.6,
        period: "月",
        limit5h: "8,000 积分",
        limitWeek: "40,000 积分",
        limitMonth: "160,000 积分",
        limit5hCount: 8000,
        limitWeekCount: 40000,
        limitMonthCount: 160000,
        limitMonthTokens: 6_400_000_000,
        notes:
          "适合重度开发与复杂任务、大型 Repo 长上下文分析；支持高阶多模态与旗舰编程模型，高峰期专属资源优先保障。编码场景约 1.6B Token/周（高峰）/ 3.2B（闲时）。",
      },
    ],
    billingUnit: "积分制",
    tools: ["Codely CLI", "Tuanjie AI IDE", "Tuanjie Cowork", "Unity Bridge", "VS Code", "JetBrains"],
    toolCount: 6,
    tags: ["闲时半价", "游戏开发"],
  },
  {
    id: "aliyun-token",
    company: "阿里云",
    product: "百炼 Token Plan",
    category: "国内大厂",
    links: {
      official: "https://cn.aliyun.com/benefit/scene/tokenplan",
      affiliate: "https://www.aliyun.com/benefit/client/cross?userCode=y44p2mtf",
    },
    logo: { src: "/logos/qwen.png", alt: "通义千问" },
    notice:
      "仅支持华北2（北京）。个人版与团队版可同时持有、各自计费。个人版按订阅月累计 Credits，用尽暂停，未用额度不结转，可购用量包补充。与 Coding Plan 独立、不可迁移；Coding Plan Lite 已于 2026-03-20 停新购、2026-04-13 停续费升级。",
    models: [
      "Qwen Auto",
      "Qwen3.8 Max",
      "Qwen3.8 Flash",
      "Qwen3.7 Max",
      "Qwen3.7 Plus",
      "Qwen3.6 Flash",
      "Qwen Image 3.0 Pro",
      "Qwen Audio 3.0 TTS Plus",
      "Qwen Audio 3.0 Realtime Plus",
      "Qwen Audio 3.0 ASR Flash",
      "Wan2.7 Image",
      "Wan2.7 Image Pro",
      "DeepSeek V4.1 Flash",
      "DeepSeek V4 Pro",
      "DeepSeek V4 Pro 0813",
      "DeepSeek V4 Flash 0731",
      "GLM 5.3",
      "GLM 5.2",
      "HappyHorse 1.1 I2V",
      "HappyHorse 1.1 T2V",
      "HappyHorse 1.1 R2V",
    ],
    tiers: [
      {
        name: "Lite 个人",
        price: 60,
        firstMonthPrice: 39,
        secondMonthPrice: 39,
        period: "月",
        limit5h: "-",
        limitMonth: "11,500 积分",
        notes: "限时 ¥39/月（原价 ¥60）；11,500 Credits/月；并发 Agent 1–2",
      },
      {
        name: "Essential 个人",
        price: 120,
        firstMonthPrice: 9.9,
        secondMonthPrice: 79,
        period: "月",
        limit5h: "-",
        limitMonth: "25,500 积分",
        notes: "首月 ¥9.9，次月起限时 ¥79/月（原价 ¥120）；25,500 Credits/月；并发 Agent 2–3",
      },
      {
        name: "Standard 个人",
        price: 180,
        firstMonthPrice: 139,
        secondMonthPrice: 139,
        period: "月",
        limit5h: "-",
        limitMonth: "45,000 积分",
        notes: "限时 ¥139/月（原价 ¥180）；45,000 Credits/月；并发 Agent 3–4；附赠 AgentStudio 工具免费额度与折扣，不占 Credits",
      },
      {
        name: "Pro 个人",
        price: 600,
        firstMonthPrice: 499,
        secondMonthPrice: 499,
        period: "月",
        limit5h: "-",
        limitMonth: "180,000 积分",
        notes: "限时 ¥499/月（原价 ¥600）；180,000 Credits/月；并发 Agent 6–8；附赠 AgentStudio 工具免费额度与折扣，不占 Credits",
      },
      {
        name: "个人用量包",
        price: 100,
        period: "月",
        limit5h: "-",
        limitMonth: "20,000 积分/个",
        notes: "¥100/个/月；需持有有效个人版订阅，最多 5 个；月额度用尽后补充，订阅月内未用 Credits 不结转",
      },
      {
        name: "标准座席",
        price: 198,
        firstMonthPrice: 150,
        secondMonthPrice: 150,
        period: "月",
        limit5h: "-",
        limitMonth: "25,000 积分/座席",
        notes: "限时 ¥150/座席/月（原价 ¥198）；25,000 Credits/座席/月；支持多席位管理与用量分析；到期未用额度不结转",
      },
      {
        name: "高级座席",
        price: 698,
        firstMonthPrice: 550,
        secondMonthPrice: 550,
        period: "月",
        limit5h: "-",
        limitMonth: "100,000 积分/座席",
        notes: "限时 ¥550/座席/月（原价 ¥698）；100,000 Credits/座席/月；承诺不使用数据训练模型；到期未用额度不结转",
      },
      {
        name: "尊享座席",
        price: 1398,
        period: "月",
        limit5h: "-",
        limitMonth: "250,000 积分/座席",
        notes: "¥1,398/座席/月；250,000 Credits/座席/月；到期未用额度不结转",
      },
      {
        name: "共享用量包",
        price: 5000,
        period: "包",
        limit5h: "-",
        limitMonth: "625,000 积分（有效期1个月）",
        notes: "¥5,000/个/月，625,000 Credits/个；座席月额度用尽后抵扣；到期未用额度不结转",
      },
    ],
    billingUnit: "积分制",
    tools: ["Claude Code", "Cursor", "Qwen Code", "Codex", "Qoder", "Qoder CN", "OpenClaw"],
    toolCount: 7,
    tags: [],
  },
  {
    id: "ark",
    company: "字节跳动",
    product: "火山方舟 Coding Plan",
    category: "国内大厂",
    links: {
      official: "https://www.volcengine.com/activity/codingplan?utm_campaign=CG&utm_content=CG&utm_medium=CakeGrowth&utm_source=OWO&utm_term=CG&utm=cg&cgv=p3kqx4gnol",
      affiliate: "https://www.volcengine.com/activity/codingplan?utm_campaign=CG&utm_content=CG&utm_medium=CakeGrowth&utm_source=OWO&utm_term=CG&utm=cg&cgv=p3kqx4gnol",
    },
    logo: { src: "/logos/volcengine.png", alt: "火山引擎" },
    notice:
      "2026年6月8日至8月8日，Lite/Pro 新购、续费、升配享首两个月 2.5 折（¥9.9/¥49.9），第三个月起恢复原价；优惠资格共享且名额有限，先到先得。",
    models: [
      "Auto",
      "Doubao Seed 2.0",
      "Doubao Seed",
      "GLM 5.2",
      "Kimi K2.7 Code",
      "MiniMax M3",
      "DeepSeek V4 Flash",
      "DeepSeek V4 Pro",
      "MiniMax M2.7",
      "Kimi K2.6",
    ],
    tiers: [
      {
        name: "Lite",
        price: 40,
        firstMonthPrice: 9.4,
        secondMonthPrice: 9.9,
        period: "月",
        limit5h: "~1,200 次",
        limitWeek: "9,000 次",
        limitMonth: "18,000 次",
        limit5hCount: 1200,
        limitWeekCount: 9000,
        limitMonthCount: 18000,
        notes: "满足个人开发者轻量化需求；邀请码 RZ3TQMRE",
      },
      {
        name: "Pro",
        price: 200,
        firstMonthPrice: 47.4,
        secondMonthPrice: 49.9,
        period: "月",
        limit5h: "~6,000 次",
        limitWeek: "45,000 次",
        limitMonth: "90,000 次",
        limit5hCount: 6000,
        limitWeekCount: 45000,
        limitMonthCount: 90000,
        notes: "5倍于 Lite 套餐用量；邀请码 RZ3TQMRE",
      },
    ],
    billingUnit: "API请求",
    tools: ["Claude Code", "Cursor", "Cline", "Codex CLI", "Kilo Code", "Roo Code", "OpenCode", "Moltbot"],
    toolCount: 11,
    tags: ["Auto模式"],
  },
  {
    id: "ark-agent",
    company: "字节跳动",
    product: "火山方舟 Agent Plan",
    category: "国内大厂",
    links: {
      official: "https://www.volcengine.com/activity/agentplan?utm_campaign=CG&utm_content=CG&utm_medium=CakeGrowth&utm_source=OWO&utm_term=CG&utm=cg&cgv=ogewxv7kp2",
      affiliate: "https://www.volcengine.com/activity/agentplan?utm_campaign=CG&utm_content=CG&utm_medium=CakeGrowth&utm_source=OWO&utm_term=CG&utm=cg&cgv=ogewxv7kp2",
    },
    logo: { src: "/logos/volcengine.png", alt: "火山引擎" },
    models: [
      "Doubao Seed 2.0 Mini",
      "Doubao Seed 2.0 Lite",
      "DeepSeek V4 Flash",
      "Doubao Seed Evolving",
      "Doubao Seed 2.0 Code",
      "Doubao Seed 2.0 Pro",
      "MiniMax M2.7",
      "MiniMax M3",
      "GLM 5.2",
      "Kimi K2.6",
      "Kimi K2.7 Code",
      "DeepSeek V4 Pro",
      "Kimi K3",
      "Doubao Embedding Vision",
      "Doubao Seedream 5.0 Lite",
      "Doubao Seedance 2.0",
      "Doubao Seed TTS 2.0",
      "Doubao Seed ASR 2.0",
    ],
    tiers: [
      {
        name: "Small",
        price: 40,
        firstMonthPrice: 9.9,
        secondMonthPrice: 9.9,
        period: "月",
        limit5h: "2,000 AFP",
        limitWeek: "7,000 AFP",
        limitMonth: "20,000 AFP",
        limit5hCount: 2000,
        limitWeekCount: 7000,
        limitMonthCount: 20000,
        notes: "限时 ¥9.9/月（刊例价 ¥40）；体验版本，仅供测试；不支持视频生成；视觉模型日额度 10,000 AFP（仅图片）；建议 1 个项目",
      },
      {
        name: "Medium",
        price: 200,
        firstMonthPrice: 49.9,
        secondMonthPrice: 49.9,
        period: "月",
        limit5h: "10,000 AFP",
        limitWeek: "35,000 AFP",
        limitMonth: "100,000 AFP",
        limit5hCount: 10000,
        limitWeekCount: 35000,
        limitMonthCount: 100000,
        notes: "限时 ¥49.9/月（刊例价 ¥200）；免费赠送 ArkClaw 轻量版；5× Small 用量；支持 Kimi K3 及视频生成；豆包搜索 500 次/月；视觉日额度 50,000 AFP；建议 1–2 个项目",
      },
      {
        name: "Large",
        price: 500,
        period: "月",
        limit5h: "25,000 AFP",
        limitWeek: "87,500 AFP",
        limitMonth: "250,000 AFP",
        limit5hCount: 25000,
        limitWeekCount: 87500,
        limitMonthCount: 250000,
        notes: "免费赠送 ArkClaw 轻量版；12.5× Small 用量；支持 Seedance 2.0 及 Kimi K3；豆包搜索 500 次/月；视觉日额度 125,000 AFP；建议 2+ 个项目",
      },
      {
        name: "Max",
        price: 1000,
        period: "月",
        limit5h: "50,000 AFP",
        limitWeek: "175,000 AFP",
        limitMonth: "500,000 AFP",
        limit5hCount: 50000,
        limitWeekCount: 175000,
        limitMonthCount: 500000,
        notes: "免费赠送 ArkClaw 轻量版；25× Small 用量；支持 Seedance 2.0 及 Kimi K3；豆包搜索 500 次/月；视觉日额度 250,000 AFP",
      },
    ],
    billingUnit: "积分制",
    tools: [
      "Claude Code",
      "TRAE",
      "Roo Code",
      "Codex CLI",
      "OpenCode",
      "Cline",
      "Kilo Code",
      "OpenClaw",
      "Cursor",
      "Hermes Agent",
    ],
    toolCount: 10,
    tags: ["AFP积分", "豆包搜索"],
  },
  {
    id: "huawei",
    company: "华为云",
    product: "码道（CodeArts Agent）",
    category: "国内大厂",
    links: { official: "https://codearts.huaweicloud.com/" },
    logo: { src: "/logos/huawei.png", alt: "华为云" },
    models: [
      "GLM-5.2",
      "GLM-5.2-ArkTS-SPARK",
      "OpenPangu-2.0-Flash",
      "OpenPangu-2.0-Pro",
    ],
    tiers: [
      {
        name: "体验版",
        price: 0,
        period: "月",
        limit5h: "-",
        limitMonth: "500 积分",
        limitMonthCount: 500,
        requestEqMonth: 714,
        notes:
          "入门体验；3 会话并发、3 Agent Space 并行任务；500MB 知识空间、5,000 代码库索引文件；限时每日签到 1,000 积分；积分用尽不可购积分包",
      },
      {
        name: "标准版",
        price: 98,
        period: "月",
        limit5h: "-",
        limitMonth: "2,000 积分",
        limitMonthCount: 2000,
        requestEqMonth: 2857,
        notes:
          "轻量辅助；5 会话并发、5 Agent Space 并行任务；5GB 知识空间、50,000 代码库索引文件；高峰期优先响应；可叠加积分包；包年 ¥823.2",
      },
      {
        name: "高级版",
        price: 198,
        period: "月",
        limit5h: "-",
        limitMonth: "4,000 积分",
        limitMonthCount: 4000,
        requestEqMonth: 5714,
        notes:
          "高频多项目办公（推荐）；5 会话并发、5 Agent Space 并行任务；5GB 知识空间、50,000 代码库索引文件；高峰期优先响应；可叠加积分包；包年 ¥1,663.2",
      },
      {
        name: "旗舰版",
        price: 498,
        period: "月",
        limit5h: "-",
        limitMonth: "10,000 积分",
        limitMonthCount: 10000,
        requestEqMonth: 14286,
        notes:
          "复杂项目高强度调用；5 会话并发、5 Agent Space 并行任务；5GB 知识空间、50,000 代码库索引文件；高峰期优先响应；可叠加积分包；包年 ¥4,183.2",
      },
    ],
    billingUnit: "积分制",
    tools: ["CodeArts Agent IDE", "码道 CLI", "JetBrains 插件", "VS Code 插件"],
    toolCount: 4,
    tags: ["积分制", "每日签到", "Agent Space"],
  },
  {
    id: "glm",
    company: "智谱华章",
    product: "GLM Coding Plan",
    category: "其他",
    links: {
      official: "https://www.bigmodel.cn/glm-coding",
      affiliate:
        "https://www.bigmodel.cn/invite?icode=Rb3Rtu6x3MJBF5gs2N%2BB2gZ3c5owLmCCcMQXWcJRS8E%3D",
    },
    logo: { src: "/logos/bigmodel.png", alt: "智谱AI" },
    notice:
      "官方公告（2026-07-30）：GLM Coding Plan 已更新为按 Token 消耗的积分制；新个人版 Lite/Pro/Max 为 ¥118/538/1,078/月。现有套餐权益不受影响，周末全天按非高峰规则抵扣。V1 用户到期前可按历史 V2 价 ¥49/149/469/月续订或升级（包季 9 折、包年 8 折，入口预计 8 月中旬开放）；团队套餐到期后可订阅新版。详情：https://docs.bigmodel.cn/cn/coding-plan/notice/usage-revision",
    models: ["GLM 5.3", "GLM 5.3 Flash"],
    tiers: [
      {
        name: "Lite",
        price: 118,
        period: "月",
        limit5h: "2,000 积分",
        limitWeek: "10,000 积分/周",
        limitMonth: "40,000 积分",
        limitMonthTokens: 1_200_000_000,
        notes:
          "适合小型 Repo 轻量级迭代；逐步开放最新旗舰模型及功能；支持 ZCode、Claude Code 等 20+ 编程工具。以 GLM-5.3-Flash、96% 缓存命中率估算，约 150–300M Token/周（高峰至非高峰）。",
      },
      {
        name: "Pro",
        price: 538,
        period: "月",
        limit5h: "12,000 积分",
        limitWeek: "60,000 积分/周",
        limitMonth: "240,000 积分",
        limitMonthTokens: 7_204_000_000,
        notes:
          "适合中型 Repo 日常开发；6 倍 Lite 用量额度，含 Lite 全部权益；优先体验最新旗舰模型及功能，覆盖多款精选 MCP 工具，生成速度更快。以 GLM-5.3-Flash、96% 缓存命中率估算，约 900M–1.8B Token/周（高峰至非高峰）。",
      },
      {
        name: "Max",
        price: 1078,
        period: "月",
        limit5h: "28,000 积分",
        limitWeek: "140,000 积分/周",
        limitMonth: "560,000 积分",
        limitMonthTokens: 16_808_000_000,
        notes:
          "适合高阶用户中大型 Repo 深度开发；14 倍 Lite 用量额度，含 Pro 全部权益；首发接入最新旗舰模型及功能，高峰期专属资源优先保障。以 GLM-5.3-Flash、96% 缓存命中率估算，约 2.1–4.2B Token/周（高峰至非高峰）。",
      },
      {
        name: "标准席位",
        price: 598,
        period: "月",
        limit5h: "15,000 积分",
        limitWeek: "66,000 积分/周",
        limitMonth: "264,000 积分",
        limitMonthTokens: 7_924_000_000,
        notes:
          "适合中型 Repo 日常开发；2 席起购，年付 9 折，低至 ¥538.2/月。支持组织席位与权限统一管理、团队用量与研发效能看板、超额按量付费及预算控制、指定固定 IP 地址访问、集中式账单与发票管理；数据默认不用于模型训练。以 GLM-5.3-Flash、96% 缓存命中率估算，约 990M–2.0B Token/周（高峰至非高峰）。",
      },
      {
        name: "高级席位",
        price: 1198,
        period: "月",
        limit5h: "35,000 积分",
        limitWeek: "155,000 积分/周",
        limitMonth: "620,000 积分",
        limitMonthTokens: 18_608_000_000,
        notes:
          "适合中大型 Repo 深度开发；2 席起购，年付 9 折，低至 ¥1,078.2/月。含标准席位全部权益；首发接入最新旗舰模型及功能，高峰期专属资源优先保障。以 GLM-5.3-Flash、96% 缓存命中率估算，约 2.3–4.7B Token/周（高峰至非高峰）。",
      },
    ],
    billingUnit: "积分制",
    tools: ["ZCode", "Claude Code", "Kilo Code", "OpenClaw", "OpenCode", "TRAE", "CodeBuddy"],
    toolCount: 20,
    tags: ["GLM-5.3", "每周积分", "团队席位"],
  },
  {
    id: "zai-glm",
    company: "智谱华章",
    product: "GLM Plan（国际版）",
    category: "其他",
    links: {
      official: "https://z.ai/subscribe",
      affiliate: "https://z.ai/subscribe?ic=HA42AYOTXT",
    },
    logo: { src: "/logos/zai.svg", alt: "Z.ai" },
    models: ["GLM 5.3", "GLM 5.3 Flash"],
    tiers: [
      {
        name: "Lite",
        price: 120.6,
        period: "月",
        limit5h: "2,000 积分",
        limitWeek: "10,000 积分/周",
        limitMonth: "40,000 积分",
        limitMonthTokens: 1_200_000_000,
        notes:
          "$18/月；适合小型 Repo 轻量级迭代，逐步开放最新旗舰模型及功能；支持 ZCode、Claude Code 等 20+ Agent 工具。以 GLM-5.3-Flash、96% 缓存命中率估算，约 150–300M Token/周（高峰至非高峰）。",
      },
      {
        name: "Pro",
        price: 536,
        period: "月",
        limit5h: "12,000 积分",
        limitWeek: "60,000 积分/周",
        limitMonth: "240,000 积分",
        limitMonthTokens: 7_204_000_000,
        notes:
          "$80/月；6 倍 Lite 用量，含 Lite 全部权益；适合中型 Repo 日常开发，含 Vision、Web Search、Web Reader、Zread 等 MCP 工具。以 GLM-5.3-Flash、96% 缓存命中率估算，约 900M–1.8B Token/周（高峰至非高峰）。",
      },
      {
        name: "Max",
        price: 1125.6,
        period: "月",
        limit5h: "28,000 积分",
        limitWeek: "140,000 积分/周",
        limitMonth: "560,000 积分",
        limitMonthTokens: 16_808_000_000,
        notes:
          "$168/月；14 倍 Lite 用量，含 Pro 全部权益；适合中大型 Repo 深度开发，首发接入最新旗舰模型及功能，高峰期资源优先保障。以 GLM-5.3-Flash、96% 缓存命中率估算，约 2.1–4.2B Token/周（高峰至非高峰）。",
      },
      {
        name: "Standard Seat",
        price: 589.6,
        period: "月",
        limit5h: "15,000 积分",
        limitWeek: "66,000 积分/周",
        limitMonth: "264,000 积分",
        limitMonthTokens: 7_924_000_000,
        notes:
          "$88/席/月；年付 9 折低至 $79.2/月（约 ¥530.6）。含席位与权限管理、团队分析看板、灵活用量计费、集中账单与发票及默认数据隐私。以 GLM-5.3-Flash、96% 缓存命中率估算，约 990M–2.0B Token/周（高峰至非高峰）。",
      },
      {
        name: "Premium Seat",
        price: 1259.6,
        period: "月",
        limit5h: "35,000 积分",
        limitWeek: "155,000 积分/周",
        limitMonth: "620,000 积分",
        limitMonthTokens: 18_608_000_000,
        notes:
          "$188/席/月；年付 9 折低至 $169.2/月（约 ¥1133.6）。含 Standard Seat 全部权益，并优先接入新模型与功能、高峰期资源优先保障。以 GLM-5.3-Flash、96% 缓存命中率估算，约 2.3–4.7B Token/周（高峰至非高峰）。",
      },
    ],
    billingUnit: "积分制",
    tools: ["ZCode", "Claude Code", "Kilo Code", "OpenClaw", "OpenCode", "TRAE", "CodeBuddy"],
    toolCount: 20,
    tags: ["GLM-5.3", "每周积分", "团队席位"],
  },
  {
    id: "kimi",
    company: "月之暗面",
    product: "Kimi Code Plan",
    category: "其他",
    links: {
      official: "https://www.kimi.com/membership/pricing",
      affiliate:
        "https://kimi-bot.com/activities/viral-referral/share?scenario=subscribe&from=share_poster&invitation_code=F9YGD5",
    },
    logo: { src: "/logos/kimi.png", alt: "Kimi" },
    notice:
      "新套餐 Go/Plus/Pro/Max/Ultra；Go 不含 Kimi Code，Plus 起可用；新会员无周限额、保留 5h 滚动，共享月额度。Plus 起 K3.1 Pro 与 K3（Plus 限 K3 256K）；Pro 起 1M 与高速版（K3.1 Pro Highspeed、K2.7 Code Highspeed）。K3.1 Pro 初期可能排队或失败。旧档 Andante/Moderato/Allegretto/Allegro 可续费；可开加油包。",
    models: [
      "Kimi K3.1 Pro",
      "Kimi K3.1 Pro Highspeed",
      "Kimi K3",
      "Kimi K2.8 Preview",
      "Kimi K2.7 Code",
      "Kimi K2.7 Code Highspeed",
    ],
    tiers: [
      {
        name: "Go",
        price: 49,
        period: "月",
        limit5h: "-",
        limitMonth: "会员共享月额度",
        notes:
          "¥49/月；不含 Kimi Code；含文档/PPT/深度研究、网页部署等会员能力；共享月额度",
      },
      {
        name: "Plus",
        price: 99,
        period: "月",
        limit5h: "~6.4M Token",
        limitMonth: "~132M Token",
        limitMonthTokens: 132_000_000,
        notes:
          "¥99/月；Kimi Code；2× Agent、4× Code；K3.1 Pro、K3（256K）；5h 滚动；共享月额度",
      },
      {
        name: "Pro",
        price: 199,
        period: "月",
        limit5h: "~32M Token",
        limitMonth: "~660M Token",
        limitMonthTokens: 660_000_000,
        notes:
          "¥199/月；Kimi Code；4× Agent、20× Code；K3/K3.1 Pro 1M、高速版、K2.8 Preview；Goal、Kimi Claw",
      },
      {
        name: "Max",
        price: 699,
        period: "月",
        limit5h: "~96M Token",
        limitMonth: "~1.98B Token",
        limitMonthTokens: 1_980_000_000,
        notes:
          "¥699/月；Kimi Code；14× Agent、60× Code；4 并发；K3 超长上下文；共享月额度",
      },
      {
        name: "Ultra",
        price: 1399,
        period: "月",
        limit5h: "~192M Token",
        limitMonth: "~3.96B Token",
        limitMonthTokens: 3_960_000_000,
        notes:
          "¥1,399/月；Kimi Code；28× Agent；4 并发；定时/小组件各 25；100 项目、50GB 存储",
      },
    ],
    billingUnit: "Token计费",
    tools: ["Kimi Code CLI", "Kimi Code for VS Code", "Claude Code", "Roo Code"],
    toolCount: 4,
    tags: ["K3", "Agent 积分", "Kimi Code"],
    yearlyPrice: 948,
  },
  {
    id: "xfyun",
    company: "科大讯飞",
    product: "星辰 Astron Token Plan",
    category: "其他",
    links: {
      official: "https://maas.xfyun.cn/tokenPlan/subscription?ch=maas-cg-kol-120",
      affiliate: "https://maas.xfyun.cn/tokenPlan/subscription?ch=maas-cg-kol-120",
    },
    logo: { src: "/logos/xfyun.png", alt: "讯飞星辰" },
    notice:
      "Astron Coding Plan 已升级至 Token Plan 团队版。积分统一计量，按席订阅（上限 200 席）；错峰时段（工作日 22:00–08:00、周末全天）积分消耗 0.8 倍；附赠 AstronClaw 基础版会员及讯飞 Skills 能力。须使用 Token Plan 专属 API Key 与 Base URL（https://maas-token-api.cn-huabei-1.xf-yun.com/v2）。",
    models: [
      "Spark X2 Agent",
      "Spark X2",
      "Spark X2 Flash",
      "GLM 5.2",
      "GLM 5.1",
      "GLM 5",
      "DeepSeek V4 Pro",
      "DeepSeek V4 Flash",
      "DeepSeek V3.2",
      "Kimi K2.6",
      "Kimi K2.5",
      "MiniMax M2.5",
      "Qwen3.5 397B A17B",
      "Qwen3.6 35B A3B",
      "Qwen3.5 35B A3B",
      "Qwen3 Coder Next FP8",
      "GLM 4.7 Flash",
    ],
    tiers: [
      {
        name: "标准成员",
        price: 200,
        firstMonthPrice: 160,
        secondMonthPrice: 160,
        period: "月",
        limit5h: "无限制",
        limitWeek: "无限制",
        limitMonth: "20,000 积分",
        limitMonthCount: 20000,
        notes: "限时 ¥160/席/月（原价 ¥200）；轻量 AI 辅助；200万 TPM",
      },
      {
        name: "高级成员",
        price: 600,
        firstMonthPrice: 420,
        secondMonthPrice: 420,
        period: "月",
        limit5h: "无限制",
        limitWeek: "无限制",
        limitMonth: "60,000 积分",
        limitMonthCount: 60000,
        notes: "限时 ¥420/席/月（原价 ¥600）；高频编码；300万 TPM",
      },
      {
        name: "尊享成员",
        price: 2000,
        firstMonthPrice: 1200,
        secondMonthPrice: 1200,
        period: "月",
        limit5h: "无限制",
        limitWeek: "无限制",
        limitMonth: "200,000 积分",
        limitMonthCount: 200000,
        notes: "限时 ¥1,200/席/月（原价 ¥2,000）；重度开发；500万 TPM",
      },
    ],
    billingUnit: "积分制",
    tools: ["Claude Code", "Cursor", "OpenClaw", "OpenCode"],
    toolCount: 4,
    tags: ["Credits积分", "错峰0.8×", "AstronClaw"],
  },
  {
    id: "xiaomi-mimo",
    company: "小米",
    product: "MiMo Token Plan",
    category: "国内大厂",
    links: {
      official: "https://platform.xiaomimimo.com/token-plan",
      affiliate: "https://platform.xiaomimimo.com?ref=SRTY5N",
    },
    logo: { src: "/logos/xiaomi.png", alt: "小米" },
    notice:
      "mimo-v2.5 / mimo-v2.5-pro 将于北京时间 2026-10-21 10:00 正式下线，届时模型名称将失效，请及时迁移至 MiMo V2.6 Pro 或 MiMo V2.6 Flash。",
    models: [
      "MiMo V2.6 Pro",
      "MiMo V2.6 Flash",
    ],
    tiers: [
      {
        name: "Lite",
        price: 39,
        firstMonthPrice: 34.3,
        period: "月",
        limit5h: "-",
        limitMonth: "4.1B 积分",
        requestEqMonth: 14_400,
        notes: "定价不变，积分大幅提升",
      },
      {
        name: "Standard",
        price: 99,
        firstMonthPrice: 87.1,
        period: "月",
        limit5h: "-",
        limitMonth: "11B 积分",
        requestEqMonth: 38_600,
        notes: "定价不变，积分大幅提升",
      },
      {
        name: "Pro",
        price: 329,
        firstMonthPrice: 289.5,
        period: "月",
        limit5h: "-",
        limitMonth: "38B 积分",
        requestEqMonth: 133_300,
        notes: "定价不变，积分大幅提升",
      },
      {
        name: "Max",
        price: 659,
        firstMonthPrice: 579.9,
        period: "月",
        limit5h: "-",
        limitMonth: "82B 积分",
        requestEqMonth: 287_700,
        notes: "定价不变，积分大幅提升",
      },
    ],
    billingUnit: "积分制",
    tools: ["Claude Code", "OpenClaw", "OpenCode", "Kilo Code", "Cline"],
    toolCount: 5,
    tags: ["夜间0.8×"],
  },
  {
    id: "minimax",
    company: "MiniMax",
    product: "MiniMax M Plan",
    category: "其他",
    links: {
      official: "https://www.minimax.cn/m-plan",
    },
    logo: { src: "/logos/minimax.png", alt: "MiniMax" },
    notice:
      "M Plan 套餐额度按 API 目录价扣减（1,000 积分 = ¥7）；非视频受 5 小时与周窗口双限制，H3 仅周窗口。Go / Explore / Build 窗口上限为 1× / 3× / 12×（相对 Go）。站内各窗口「积分」为目录价折算参考：沿用 Token Plan 文本窗口口径（升级 M Plan 不变），按 FAQ 示例输入 ¥2.10/百万 tokens≈300 积分/百万 tokens 换算，多模态/输出/缓存实际扣减以控制台为准。另售积分包与订阅额度无关。订阅 Key 与按量 Key 独立。",
    models: [
      "MiniMax M3.1 Flash Preview",
      "MiniMax H3",
      "image-01",
      "image-01-live",
      "Speech 2.8 HD",
      "Speech 2.8 Turbo",
    ],
    tiers: [
      {
        name: "Go",
        price: 49,
        period: "月",
        limit5h: "1,500 积分",
        limitWeek: "45,000 积分",
        limitMonth: "180,000 积分",
        limit5hCount: 1_500,
        limitWeekCount: 45_000,
        limitMonthCount: 180_000,
        requestEqMonth: 10_000,
        notes:
          "1× 基准；5h/周窗口目录价折算积分（≈原 Token Plan Plus 文本窗口）；不含 H3",
      },
      {
        name: "Explore",
        price: 119,
        period: "月",
        limit5h: "4,500 积分",
        limitWeek: "135,000 积分",
        limitMonth: "540,000 积分",
        limit5hCount: 4_500,
        limitWeekCount: 135_000,
        limitMonthCount: 540_000,
        requestEqMonth: 30_000,
        notes: "3× Go 窗口额度；含 H3 视频（仅周窗口）",
      },
      {
        name: "Build",
        price: 469,
        period: "月",
        limit5h: "15,000 积分",
        limitWeek: "510,000 积分",
        limitMonth: "2,130,000 积分",
        limit5hCount: 15_000,
        limitWeekCount: 510_000,
        limitMonthCount: 2_130_000,
        requestEqMonth: 118_333,
        notes: "12× Go 窗口额度（5h 按 Ultra 口径）；含 H3",
      },
    ],
    billingUnit: "积分制",
    tools: [
      "MiniMax Code",
      "Claude Code",
      "Codex",
      "Cursor",
      "OpenCode",
      "Hermes Agent",
      "OpenClaw",
    ],
    toolCount: 7,
    tags: ["M3.1", "H3", "5h+周窗口"],
  },
  {
    id: "infini",
    company: "无问芯穹",
    product: "Infini Coding Plan",
    category: "其他",
    links: {
      official: "https://cloud.infini-ai.com/platform/ai",
      affiliate: "https://cloud.infini-ai.com/login?redirect=/genstudio/invitation&invite_code=BewkvUYk",
    },
    logo: { src: "/logos/infini.png", alt: "无问芯穹" },
    models: ["DeepSeek V3.2", "DeepSeek V3.2 Thinking", "Kimi K2.5", "MiniMax M2.1", "MiniMax M2.5", "GLM 4.7", "GLM 5"],
    tiers: [
      {
        name: "Lite",
        price: 40,
        firstMonthPrice: 19.9,
        secondMonthPrice: 40,
        period: "月",
        limit5h: "1,000 次",
        limitMonth: "12,000 次",
        limit5hCount: 1000,
        limitWeekCount: 6000,
        limitMonthCount: 12000,
        notes: "首次首月5折；邀请码 BewkvUYk",
      },
      {
        name: "Pro",
        price: 200,
        firstMonthPrice: 99.9,
        secondMonthPrice: 200,
        period: "月",
        limit5h: "5,000 次",
        limitMonth: "60,000 次",
        limit5hCount: 5000,
        limitWeekCount: 30000,
        limitMonthCount: 60000,
        notes: "首次首月5折；邀请码 BewkvUYk",
      },
    ],
    billingUnit: "API请求",
    tools: ["Claude Code", "Cursor", "Roo Code", "Cline", "VS Code 插件"],
    toolCount: 5,
    tags: ["滑动窗口"],
  },
  {
    id: "tencent",
    company: "腾讯云",
    product: "Hy Token Plan",
    category: "国内大厂",
    links: {
      official: "https://cloud.tencent.com/act/pro/tokenplan",
      affiliate: "https://cloud.tencent.com/act/pro/featured-202607?from=30161&cps_key=b1b782d9eb899c792b44ce3dccf79759#hytokenplan",
    },
    logo: { src: "/logos/tencentcloud.png", alt: "腾讯云" },
    notice:
      "2026年8月31日 17:00（北京时间）起 Hy Token Plan 调整为积分抵扣模式，按（未命中缓存输入×输入价 + 输出×输出价 + 缓存命中输入×命中价）/1,000,000 扣减。Hy3（hy3/hy3-preview）按档位差异化积分价（Lite 16 / Standard 15.6 / Pro 14.875 / Max 14.4 积分/百万 tokens）；Hy4 preview、hy3-202608 按模型统一价且与档位无关。hy3-preview 自动路由至 Hy3。通用 Token Plan 与 Hy Token Plan 共用 API Key，同 Model ID 优先扣较早到期套餐。2026年9月限时优惠：hy3-202608 5折、hy4-preview 最高83折。",
    models: ["Hy3", "hy3-preview", "hy3-202608", "Hy4 preview"],
    tiers: [
      {
        name: "Lite - 体验套餐",
        price: 28,
        period: "月",
        limit5h: "-",
        limitMonth: "560 积分",
        limitMonthCount: 560,
        limitMonthTokens: 35_000_000,
        notes:
          "新手尝鲜；按 Hy3 刊例价预估约 3,500 万 tokens、约 70 轮问答式交互；网页操作、文件处理、数据分析、定时任务",
      },
      {
        name: "Standard - 基础套餐",
        price: 78,
        period: "月",
        limit5h: "-",
        limitMonth: "1,560 积分",
        limitMonthCount: 1560,
        limitMonthTokens: 100_000_000,
        notes:
          "日常办公与轻量开发；按 Hy3 刊例价预估约 1 亿 tokens、约 200 轮问答式交互；批量文件处理、Demo 制作、自动化工作流",
      },
      {
        name: "Pro - 进阶套餐",
        price: 238,
        period: "月",
        limit5h: "-",
        limitMonth: "4,760 积分",
        limitMonthCount: 4760,
        limitMonthTokens: 320_000_000,
        notes:
          "高频 AI 开发，额度约为基础版 3 倍；按 Hy3 刊例价预估约 3.2 亿 tokens；多仓库并行、复杂逻辑生成、代码重构、Agent 编排",
      },
      {
        name: "Max - 专业套餐",
        price: 468,
        period: "月",
        limit5h: "-",
        limitMonth: "9,360 积分",
        limitMonthCount: 9360,
        limitMonthTokens: 650_000_000,
        notes:
          "重度 AI 开发首选；按 Hy3 刊例价预估约 6.5 亿 tokens；全栈 AI 生成、多 Agent 协同、CI 自动化；并发速率 Max > Pro > Standard > Lite",
      },
    ],
    billingUnit: "积分制",
    tools: [
      "OpenClaw",
      "Claude Code",
      "OpenCode",
      "Cline",
      "Cursor",
      "Kilo Code",
      "Codex CLI",
    ],
    toolCount: 7,
    tags: ["Hy3", "混元模型", "积分抵扣"],
  },
  {
    id: "scnet",
    company: "中科曙光",
    product: "超算互联网 Plan",
    category: "其他",
    links: { official: "https://www.scnet.cn/ui/console/index.html#/llm/token-plan" },
    logo: { src: "/logos/scnet.png", alt: "超算互联网" },
    models: [
      "GLM 5.2",
      "GLM 5.1",
      "GLM 5",
      "Kimi K3",
      "Kimi K2.7 Code",
      "Kimi K2.6",
      "Kimi K2.5",
      "DeepSeek V4 Flash",
      "DeepSeek V3.2",
      "MiniMax M3",
      "MiniMax M2.7",
      "MiniMax M2.5",
      "MiMo V2.5 Pro",
    ],
    tiers: [
      {
        name: "基础版",
        price: 50,
        firstMonthPrice: 30,
        period: "月",
        limit5h: "-",
        limitMonth: "60,000 积分",
        limitMonthTokens: 13_039_939,
        notes: "入门优选，适合个人项目集成与 AI 助手；含 OpenClaw 2核4G 实例免费使用。",
      },
      {
        name: "标准版",
        price: 185,
        firstMonthPrice: 110,
        period: "月",
        limit5h: "-",
        limitMonth: "240,000 积分",
        limitMonthTokens: 52_159_757,
        notes: "适合日常 AI 办公和轻量开发，可用于批量文件处理、Demo 制作与自动化工作流。",
      },
      {
        name: "高级版",
        price: 440,
        firstMonthPrice: 265,
        period: "月",
        limit5h: "-",
        limitMonth: "600,000 积分",
        limitMonthTokens: 130_399_392,
        notes: "适合高频 AI 开发、多仓库并行、代码重构与 Agent 编排。",
      },
      {
        name: "旗舰版",
        price: 1274,
        firstMonthPrice: 764,
        period: "月",
        limit5h: "-",
        limitMonth: "1,800,000 积分",
        limitMonthTokens: 391_198_177,
        notes: "极致额度加持，适合深度 AI 开发。",
      },
    ],
    billingUnit: "积分制",
    tools: ["OpenClaw", "Claude Code", "OpenCode", "Cursor", "Codex", "Cline", "Roo Code"],
    toolCount: 7,
    tags: ["独立 API Key"],
  },
  {
    id: "jdcloud",
    company: "京东云",
    product: "京东云 Token Plan",
    category: "其他",
    links: { official: "https://www.jdcloud.com/cn/products/tokenplan" },
    logo: { src: "/logos/jd.png", alt: "京东" },
    models: [
      "GLM 5.2",
      "GLM 5.1",
      "Kimi K2.6",
      "MiniMax M3",
      "DeepSeek V4 Flash",
      "DeepSeek V4 Pro",
    ],
    tiers: [
      {
        name: "Lite 个人",
        price: 69,
        firstMonthPrice: 55.2,
        secondMonthPrice: 55.2,
        period: "月",
        limit5h: "-",
        limitMonth: "17,250 Credits",
        requestEqMonth: 3_920,
        notes: "限时 8 折 ¥55.2/月（原价 ¥69）；个人版每日限量发售；17,250 Credits/月",
      },
      {
        name: "Standard 个人",
        price: 199,
        firstMonthPrice: 159.2,
        secondMonthPrice: 159.2,
        period: "月",
        limit5h: "-",
        limitMonth: "49,750 Credits",
        requestEqMonth: 11_307,
        notes: "限时 8 折 ¥159.2/月（原价 ¥199）；个人版每日限量发售；49,750 Credits/月",
      },
      {
        name: "Pro 个人",
        price: 599,
        firstMonthPrice: 479.2,
        secondMonthPrice: 479.2,
        period: "月",
        limit5h: "-",
        limitMonth: "149,750 Credits",
        requestEqMonth: 34_034,
        notes: "限时 8 折 ¥479.2/月（原价 ¥599）；个人版每日限量发售；149,750 Credits/月",
      },
      {
        name: "Max 个人",
        price: 999,
        firstMonthPrice: 799.2,
        secondMonthPrice: 799.2,
        period: "月",
        limit5h: "-",
        limitMonth: "249,750 Credits",
        requestEqMonth: 56_761,
        notes: "限时 8 折 ¥799.2/月（原价 ¥999）；个人版每日限量发售；249,750 Credits/月",
      },
      {
        name: "Lite 企业",
        price: 207,
        firstMonthPrice: 124.2,
        secondMonthPrice: 124.2,
        period: "月",
        limit5h: "-",
        limitMonth: "34,500 Credits/席",
        requestEqMonth: 7_841,
        notes: "限时 6 折 ¥124.2/席/月（原价 ¥207）；灰度开放，申请后约 3 个工作日开通；34,500 Credits/席/月",
      },
      {
        name: "Standard 企业",
        price: 597,
        firstMonthPrice: 358.2,
        secondMonthPrice: 358.2,
        period: "月",
        limit5h: "-",
        limitMonth: "99,500 Credits/席",
        requestEqMonth: 22_614,
        notes: "限时 6 折 ¥358.2/席/月（原价 ¥597）；灰度开放；99,500 Credits/席/月",
      },
      {
        name: "Pro 企业",
        price: 1_797,
        firstMonthPrice: 1_078.2,
        secondMonthPrice: 1_078.2,
        period: "月",
        limit5h: "-",
        limitMonth: "299,500 Credits/席",
        requestEqMonth: 68_068,
        notes: "限时 6 折 ¥1,078.2/席/月（原价 ¥1,797）；灰度开放；299,500 Credits/席/月",
      },
      {
        name: "Max 企业",
        price: 2_997,
        firstMonthPrice: 1_798.2,
        secondMonthPrice: 1_798.2,
        period: "月",
        limit5h: "-",
        limitMonth: "499,500 Credits/席",
        requestEqMonth: 113_523,
        notes: "限时 6 折 ¥1,798.2/席/月（原价 ¥2,997）；灰度开放；499,500 Credits/席/月",
      },
    ],
    billingUnit: "积分制",
    tools: ["Claude Code", "Cursor", "OpenCode", "OpenClaw", "Roo Code", "Cline"],
    toolCount: 6,
    tags: ["Credits积分", "双协议"],
  },
  {
    id: "baidu",
    company: "百度",
    product: "千帆 Token Plan",
    category: "国内大厂",
    links: { official: "https://cloud.baidu.com/product/codingplan.html" },
    logo: { src: "/logos/yiyan.png", alt: "文心一言" },
    models: [
      "DeepSeek V4 Pro",
      "DeepSeek V4 Flash",
      "GLM 5.2",
      "GLM 5.1",
      "Kimi K2.6",
      "ERNIE 5.1",
    ],
    tiers: [
      {
        name: "Mini",
        price: 9.9,
        firstMonthPrice: 4.9,
        period: "月",
        limit5h: "-",
        limitMonth: "10M Token",
        limitMonthTokens: 10_000_000,
        notes: "首月限时5折 ¥4.9；适合首次体验 AI Coding；约 166 次日常编程调用",
      },
      {
        name: "Lite",
        price: 40,
        firstMonthPrice: 19.9,
        period: "月",
        limit5h: "-",
        limitMonth: "42M Token",
        limitMonthTokens: 42_000_000,
        notes: "首月限时5折 ¥19.9；约 700 次日常编程调用",
      },
      {
        name: "Pro",
        price: 200,
        firstMonthPrice: 99.9,
        period: "月",
        limit5h: "-",
        limitMonth: "230M Token",
        limitMonthTokens: 230_000_000,
        notes: "首月限时5折 ¥99.9；适合高频 AI 开发",
      },
      {
        name: "Max",
        price: 600,
        firstMonthPrice: 299.9,
        period: "月",
        limit5h: "-",
        limitMonth: "700M Token",
        limitMonthTokens: 700_000_000,
        notes: "首月限时5折 ¥299.9；适合重度 AI 开发",
      },
    ],
    billingUnit: "Token计费",
    tools: [
      "OpenClaw",
      "Claude Code",
      "OpenCode",
      "Cursor",
      "Cline",
      "CodeX",
      "Qwen Code",
      "Cherry Studio",
      "Kilo CLI",
      "Kilo Code",
      "cc-switch",
    ],
    toolCount: 11,
    tags: [],
  },
  {
    id: "moorethreads",
    company: "摩尔线程",
    product: "AI Coding Plan",
    category: "其他",
    links: { official: "https://code.mthreads.com" },
    logo: { src: "/logos/moorethreads.png", alt: "摩尔线程" },
    models: ["GLM 4.7"],
    tiers: [
      {
        name: "Free Trial",
        price: 0,
        period: "月",
        limit5h: "~40 次对话",
        limit5hCount: 40,
        isFirstMonthOnly: true,
        notes: "约 Claude Pro 用量；领取日起 30 天内有效；高峰期可能排队",
      },
      {
        name: "Lite Plan",
        price: 120,
        period: "季",
        limit5h: "~120 次对话",
        limit5hCount: 120,
        countsPrompts: true,
        notes: "约 Claude Pro 3 倍；订阅期享最新模型更新；月均 ¥40",
      },
      {
        name: "Pro Plan",
        price: 600,
        period: "季",
        limit5h: "~600 次对话",
        limit5hCount: 600,
        countsPrompts: true,
        notes: "约 Claude Max(5x) 3 倍；生成更快、响应速度保障；月均 ¥200",
      },
      {
        name: "Max Plan",
        price: 1200,
        period: "季",
        limit5h: "~2,400 次对话",
        limit5hCount: 2400,
        countsPrompts: true,
        notes: "约 Claude Max(20x) 3 倍；峰值优先、可抢先体验新功能；月均 ¥400",
      },
    ],
    billingUnit: "按量计费",
    tools: ["Claude Code", "OpenCode", "Cursor", "Cline", "Roo Code", "Kilo Code"],
    toolCount: 6,
    tags: ["GLM-4.7", "5小时额度", "30天试用"],
  },
  {
    id: "ucloud",
    company: "UCloud 优刻得",
    product: "优云智算 Agent Plan",
    category: "国内大厂",
    links: {
      official: "https://www.compshare.cn/coding-plan",
      affiliate: "https://passport.compshare.cn/register?referral_code=7KuMSzfdofaEKUvaTYql35",
    },
    logo: { src: "/logos/ucloud.png", alt: "UCloud" },
    models: [
      "GLM 5.2",
      "GLM 5.1",
      "Kimi K2.6",
      "MiniMax M2.7",
      "DeepSeek V3.2",
      "DeepSeek V4 Flash",
    ],
    tiers: [
      {
        name: "Mini",
        price: 49,
        period: "月",
        limit5h: "~300 次",
        limitWeek: "~750 次",
        limitMonth: "~1,900 次",
        limit5hCount: 300,
        limitWeekCount: 750,
        limitMonthCount: 1900,
        notes: "适合初步接触 AI、低频体验；覆盖 MiniMax、GLM、Kimi 等主流模型，不同模型调用倍率不同",
      },
      {
        name: "Lite",
        price: 99,
        period: "月",
        limit5h: "~600 次",
        limitWeek: "~1,500 次",
        limitMonth: "~3,800 次",
        limit5hCount: 600,
        limitWeekCount: 1500,
        limitMonthCount: 3800,
        notes: "适合入门用户，每日少量任务；覆盖 MiniMax、GLM、Kimi 等主流模型，不同模型调用倍率不同",
      },
      {
        name: "Basic",
        price: 199,
        period: "月",
        limit5h: "~1,200 次",
        limitWeek: "~3,000 次",
        limitMonth: "~7,600 次",
        limit5hCount: 1200,
        limitWeekCount: 3000,
        limitMonthCount: 7600,
        notes: "适合日常使用，满足基础 Agent 需求；覆盖 MiniMax、GLM、Kimi 等主流模型，不同模型调用倍率不同",
      },
      {
        name: "Pro",
        price: 499,
        period: "月",
        limit5h: "~3,000 次",
        limitWeek: "~7,500 次",
        limitMonth: "~19,000 次",
        limit5hCount: 3000,
        limitWeekCount: 7500,
        limitMonthCount: 19000,
        notes: "适合高阶用户使用，满足复杂开发任务需求；覆盖 MiniMax、GLM、Kimi 等主流模型，不同模型调用倍率不同",
      },
      {
        name: "Max",
        price: 799,
        period: "月",
        limit5h: "~4,800 次",
        limitWeek: "~12,000 次",
        limitMonth: "~31,000 次",
        limit5hCount: 4800,
        limitWeekCount: 12000,
        limitMonthCount: 31000,
        notes: "适合高阶用户使用，满足复杂开发任务需求；覆盖 MiniMax、GLM、Kimi 等主流模型，不同模型调用倍率不同",
      },
      {
        name: "Ultra",
        price: 999,
        period: "月",
        limit5h: "~6,000 次",
        limitWeek: "~15,000 次",
        limitMonth: "~39,000 次",
        limit5hCount: 6000,
        limitWeekCount: 15000,
        limitMonthCount: 39000,
        notes: "适合高阶用户使用，满足复杂开发任务需求；覆盖 MiniMax、GLM、Kimi 等主流模型，不同模型调用倍率不同",
      },
    ],
    billingUnit: "请求次数",
    tools: ["Claude Code", "OpenClaw", "Hermes Agent", "主流 AI 编程工具"],
    toolCount: 4,
    tags: [],
  },
  {
    id: "opencode-go",
    company: "Anomaly",
    product: "OpenCode Go",
    category: "其他",
    links: {
      official: "https://opencode.ai/go",
      affiliate: "https://opencode.ai/go?ref=KZCWENKJQ4",
    },
    logo: { src: "/logos/opencode.png", alt: "OpenCode" },
    notice:
      "国际订阅 $10 Go / $40 Go Plus（约 ¥67 / ¥268/月）。各模型独立美元上限（5h=20%、周=50%、月=100%），非共享池。Personal 工作区不可邀成员；达限可用免费模型或开启 Extra Usage 扣余额。",
    models: [
      "Grok 4.7",
      "GLM-5.3-Flash",
      "GLM-5.3",
      "GLM-5.2",
      "GPT 6 Luna",
      "GPT 5.6 Luna",
      "Claude Haiku 5.5",
      "Gemini 4 Argon",
      "Kimi K3.1 Pro",
      "Kimi K3",
      "Kimi K2.7 Code",
      "LongCat-2.0",
      "Step 5 Preview",
      "Beam Free",
      "Iceman Contributor Free",
      "MiMo-V2.6-Flash",
      "MiMo-V2.6-Pro",
      "MiMo-V2.5",
      "MiMo-V2.5-Pro",
      "MiniMax M3.1 Flash",
      "MiniMax M3",
      "Muse Spark 1.3 Contributor",
      "Muse Spark 1.2 Contributor",
      "Qwen3.8 Max",
      "Qwen3.8 Flash",
      "Qwen3.7 Plus",
      "DeepSeek V4.1 Flash",
      "DeepSeek V4 Pro",
      "Hy4 preview",
      "Hy3",
    ],
    tiers: [
      {
        name: "Go",
        price: 67,
        period: "月",
        limit5h: "$12",
        limitWeek: "~518M Token",
        limitMonth: "$60",
        limitMonthTokens: 1_035_750_000,
        notes:
          "$10/月；GLM-5.3-Flash 示例 $12/$30/$60；四款主力 Token 均值约 208M/5h、518M/周、1.04B/月；Beam/Iceman 限时免费",
      },
      {
        name: "Go Plus",
        price: 268,
        period: "月",
        limit5h: "$36",
        limitWeek: "~1.69B Token",
        limitMonth: "$180",
        limitMonthTokens: 3_380_000_000,
        notes:
          "$40/月；Go 的 3× 美元上限；GLM-5.3-Flash 示例 $36/$90/$180；四款主力 Token 均值约 676M/5h、1.69B/周、3.38B/月",
      },
    ],
    billingUnit: "按量计费",
    tools: [
      "OpenCode",
      "Claude Code",
      "Codex",
      "Hermes",
      "ZCode",
      "Pi",
      "jcode",
      "Kilo Code CLI",
      "Cursor",
      "Cline",
      "Roo Code",
    ],
    toolCount: 11,
    tags: ["美元用量", "Go Plus", "开源模型"],
  },
  {
    id: "cucloud-token",
    company: "联通云",
    product: "元景 Token Plan",
    category: "其他",
    links: { official: "https://www.cucloud.cn/product/tokenplan.html" },
    logo: { src: "/logos/cucloud.png", alt: "联通云" },
    models: ["DeepSeek V4 Pro", "DeepSeek V4 Flash", "MiniMax M2.5"],
    tiers: [
      {
        name: "Lite 个人",
        price: 15,
        period: "月",
        limit5h: "-",
        limitMonth: "6M Token",
        limitMonthTokens: 6_000_000,
        notes: "适合首次体验龙虾的尝鲜用户",
      },
      {
        name: "Pro 个人",
        price: 30,
        period: "月",
        limit5h: "-",
        limitMonth: "12M Token",
        limitMonthTokens: 12_000_000,
        notes: "适合高频使用 AI 的效率达人；2倍于 Lite 额度",
      },
      {
        name: "Max 个人",
        price: 45,
        period: "月",
        limit5h: "-",
        limitMonth: "18M Token",
        limitMonthTokens: 18_000_000,
        notes: "适合重度依赖 AI 的核心开发者；3倍于 Lite 额度",
      },
      {
        name: "Lite 团队",
        price: 198,
        period: "月",
        limit5h: "-",
        limitMonth: "25,000 Credits",
        limitMonthTokens: 227_000_000,
        notes: "轻度使用 AI 辅助的企业团队",
      },
      {
        name: "Pro 团队",
        price: 698,
        period: "月",
        limit5h: "-",
        limitMonth: "100,000 Credits",
        limitMonthTokens: 909_000_000,
        notes: "高频使用 AI 编程的开发团队；4倍于 Lite 团队额度",
      },
      {
        name: "Max 团队",
        price: 1398,
        period: "月",
        limit5h: "-",
        limitMonth: "250,000 Credits",
        limitMonthTokens: 2_270_000_000,
        notes: "重度依赖 AI 编程的核心开发团队；10倍于 Lite 团队额度",
      },
    ],
    billingUnit: "Token计费",
    tools: ["Claude Code", "OpenClaw", "Cursor", "主流编程工具"],
    toolCount: 4,
    tags: ["元景MaaS"],
  },
  {
    id: "ctyun-coding",
    company: "中国电信",
    product: "天翼云 Coding Plan",
    category: "其他",
    links: {
      official: "https://eaichat.ctyun.cn/chat/#/aitoken",
    },
    logo: { src: "/logos/chinatelecom.png", alt: "中国电信" },
    notice:
      "请求方式与其他平台略有不同，实际 API 调用可正常使用；调用时请使用小写模型名并追加 -oc 后缀。订阅请通过「天翼云电脑」手机 App：进入「我的 Token」，下滑至 Coding Plan 区域完成订购。套餐开通后不支持退订，敬请知悉。示例：glm-5.3-oc",
    models: [
      "DeepSeek-V4-Flash-0731",
      "MiniMax-M2.5",
      "GLM-5",
      "GLM-5.1",
      "Kimi-k2.5",
      "DeepSeek-V4-Pro-0831",
      "GLM-5.3",
      "Qwen-3.6-Flash",
    ],
    tiers: [
      {
        name: "Lite",
        price: 40,
        period: "月",
        limit5h: "~1,200 次",
        limitWeek: "9,000 次",
        limitMonth: "18,000 次",
        limit5hCount: 1200,
        limitWeekCount: 9000,
        limitMonthCount: 18000,
        notes: "面向处理轻量工作的开发者；新模型/功能持续更新",
      },
      {
        name: "Pro",
        price: 200,
        period: "月",
        limit5h: "~6,000 次",
        limitWeek: "45,000 次",
        limitMonth: "90,000 次",
        limit5hCount: 6000,
        limitWeekCount: 45000,
        limitMonthCount: 90000,
        notes: "面向处理复杂工作的开发者；5倍于 Lite 套餐用量",
      },
    ],
    billingUnit: "API请求",
    tools: ["OpenClaw", "Claude Code", "Cursor", "Cline", "主流编程工具"],
    toolCount: 5,
    tags: ["天翼云"],
  },
  {
    id: "cursor",
    company: "Cursor",
    product: "Cursor Plan",
    category: "其他",
    links: {
      official: "https://cursor.com/cn/pricing",
    },
    logo: { src: "/logos/cursor.png", alt: "Cursor" },
    notice:
      "新购为 The X Subscription。自有模型（Grok/Composer）单一周额度池，与 Grok 应用/Bot 共享、每周重置；第三方不在任何档位含额，Premium 起按 API 刊例价从预付额度扣费，Plus/Free 不可用。旧档：Hobby→Free、Start→Plus、Pro→Premium、Pro+→Super、Ultra→Ultra、Teams Standard→Teams Premium 席位。老套餐仍可续费。https://cursor.com/docs/models-and-pricing",
    models: [
      "Auto",
      "Grok 4.7",
      "Grok 4.7 500k",
      "Grok 4.6",
      "Grok 4.5",
      "Composer 2.5",
      "Claude 4 Sonnet",
      "Claude 4 Sonnet 1M",
      "Claude 4.5 Haiku",
      "Claude 4.5 Opus",
      "Claude 4.5 Sonnet",
      "Claude 4.6 Opus",
      "Claude 4.6 Sonnet",
      "Claude 4.7 Opus",
      "Claude Fable 5",
      "Claude Fable 5.1",
      "Claude Haiku 5.5",
      "Claude Opus 4.8",
      "Claude Opus 5",
      "Claude Opus 5.5",
      "Claude Sonnet 5",
      "Claude Sonnet 5.5",
      "DeepSeek V4.1 Flash 1017",
      "Gemini 2.5 Flash",
      "Gemini 3 Flash",
      "Gemini 3 Pro",
      "Gemini 3 Pro Image Preview",
      "Gemini 3.1 Pro",
      "Gemini 3.5 Flash",
      "Gemini 3.5 Flash Lite",
      "Gemini 3.6 Flash",
      "Gemini 3.7 Flash",
      "Gemini 3.8 Flash",
      "Gemini 4 Argon",
      "GLM 5.2",
      "GLM 5.3",
      "GLM 5.3 Flash",
      "GPT-5",
      "GPT-5 Mini",
      "GPT-5-Codex",
      "GPT-5.1 Codex",
      "GPT-5.1 Codex Max",
      "GPT-5.1 Codex Mini",
      "GPT-5.2",
      "GPT-5.2 Codex",
      "GPT-5.3 Codex",
      "GPT-5.4",
      "GPT-5.4 Mini",
      "GPT-5.4 Nano",
      "GPT-5.5",
      "GPT-5.6 Luna",
      "GPT-5.6 Sol",
      "GPT-5.6 Terra",
      "Kimi K2.7 Code",
      "Kimi K3",
      "Muse Spark 1.3",
      "Muse Wonder",
    ],
    tiers: [
      {
        name: "Free",
        price: 0,
        period: "月",
        limit5h: "-",
        limitMonth: "有限的使用",
        notes:
          "$0/月；Agent/Chat 有限用量；含 Grok Chat/Imagine/Build 有限；无 Grok Bot；仅自有模型；第三方不可用",
      },
      {
        name: "Plus",
        price: 53.6,
        period: "月",
        limit5h: "-",
        limitMonth: "$20额度",
        requestEqMonth: 1330,
        notes:
          "$8/月（约 ¥53.6）；自有模型 + Grok Chat/Voice/Imagine/Build；无 Grok Bot、Cloud Agents、第三方",
      },
      {
        name: "Premium",
        price: 201,
        period: "月",
        limit5h: "-",
        limitMonth: "$80额度 包含第三方SOTA",
        requestEqMonth: 5320,
        notes:
          "$30/月（约 ¥201）；4× Plus 额度；含 Grok Bot、Cloud Agents、Bugbot、Origin；第三方按 API 刊例价预付扣费",
      },
      {
        name: "Super",
        price: 670,
        period: "月",
        limit5h: "-",
        limitMonth: "$300额度 包含第三方SOTA",
        requestEqMonth: 19950,
        notes:
          "$100/月（约 ¥670）；15× Plus 额度；含 Premium 全部能力与 Grok Bot；高峰优先",
      },
      {
        name: "Ultra",
        price: 1340,
        period: "月",
        limit5h: "-",
        limitMonth: "$1000额度 包含第三方SOTA",
        requestEqMonth: 66500,
        notes:
          "$200/月（约 ¥1340）；50× Plus 额度；含 Super 全部能力与 Grok Bot；优先体验新品与新模型",
      },
      {
        name: "Teams",
        price: 201,
        period: "月",
        limit5h: "-",
        limitMonth: "$80～$1000额度 包含第三方SOTA",
        requestEqMonth: 5320,
        notes:
          "席位 $30/$100/$200·月（约 ¥201/¥670/¥1340）；额度对齐个人档；含 Grok Bot；团队管理/SSO；第三方可能加 Cursor Token Rate",
      },
    ],
    billingUnit: "按量计费",
    tools: ["Cursor"],
    toolCount: 1,
    tags: ["周额度池", "X Subscription"],
  },
]
