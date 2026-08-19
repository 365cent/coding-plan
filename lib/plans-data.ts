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
      "新用户前 2 个月享 2 折优惠，之后恢复对应周期的常态折扣（月付恢复原价、季付 8 折、年付 7 折）。每日 11:00–12:00、14:00–18:00 为高峰时段，其余闲时积分消耗减半（可用 Token 翻倍）。团队版套餐即将上线；企业版支持私有化部署与专属解决方案架构师 1:1 陪跑。",
    models: ["GLM 5.2", "Qwen 3.8 Max", "DeepSeek V4 Flash"],
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
    id: "bailian-token-team",
    company: "阿里云",
    product: "百炼 Token Plan",
    category: "国内大厂",
    links: {
      official: "https://cn.aliyun.com/benefit/scene/tokenplan",
      affiliate: "https://www.aliyun.com/benefit/client/cross?userCode=y44p2mtf",
    },
    logo: { src: "/logos/qwen.png", alt: "通义千问" },
    notice:
      "Token Plan 目前仅支持华北2（北京）。采用积分统一抵扣，一份订阅可用于 Claude Code、Cursor、Qwen Code、OpenClaw 等工具。与 Coding Plan 独立，不可迁移；Coding Plan Lite 已停新购/续费。qwen3.8-max-preview 预览期间积分消耗 1 折（约 10 倍用量）；个人版每晚 22:00–08:00 再享 2 折。",
    models: [
      "Qwen3.8 Max Preview",
      "Qwen3.7 Max",
      "Qwen3.7 Plus",
      "Qwen3.6 Plus",
      "Qwen3.6 Flash",
      "Qwen Image 2.0",
      "Qwen Image 2.0 Pro",
      "Wan2.7 Image",
      "Wan2.7 Image Pro",
      "DeepSeek V4 Pro",
      "DeepSeek V4 Flash",
      "DeepSeek V3.2",
      "Kimi K2.7 Code",
      "Kimi K2.6",
      "Kimi K2.5",
      "GLM 5.2",
      "GLM 5.1",
      "GLM 5",
      "MiniMax M2.5",
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
        limit5h: "700 积分",
        limitWeek: "2,500 积分",
        limit5hCount: 700,
        limitWeekCount: 2500,
        notes: "限时 ¥39/月（原价 ¥60）；5h/7d 滑动窗口；并发 Agent 1–2；含 Harness 工具",
      },
      {
        name: "Standard 个人",
        price: 180,
        firstMonthPrice: 139,
        secondMonthPrice: 139,
        period: "月",
        limit5h: "3,000 积分",
        limitWeek: "10,000 积分",
        limit5hCount: 3000,
        limitWeekCount: 10000,
        notes: "限时 ¥139/月（原价 ¥180）；5h/7d 滑动窗口；并发 Agent 3–4；含 Harness 工具",
      },
      {
        name: "Pro 个人",
        price: 600,
        firstMonthPrice: 499,
        secondMonthPrice: 499,
        period: "月",
        limit5h: "12,000 积分",
        limitWeek: "40,000 积分",
        limit5hCount: 12000,
        limitWeekCount: 40000,
        notes: "限时 ¥499/月（原价 ¥600）；5h/7d 滑动窗口；并发 Agent 6–8；含 Harness 工具",
      },
      {
        name: "标准座席",
        price: 198,
        firstMonthPrice: 150,
        secondMonthPrice: 150,
        period: "月",
        limit5h: "无限制",
        limitWeek: "无限制",
        limitMonth: "25,000 积分/座席",
        notes: "限时 ¥150/座席/月（原价 ¥198）；月度总额度制，无 5h/7d 滑动窗口；支持多席位管理与用量分析",
      },
      {
        name: "高级座席",
        price: 698,
        firstMonthPrice: 550,
        secondMonthPrice: 550,
        period: "月",
        limit5h: "无限制",
        limitWeek: "无限制",
        limitMonth: "100,000 积分/座席",
        notes: "限时 ¥550/座席/月（原价 ¥698）；月度总额度制；承诺不使用数据训练模型",
      },
      {
        name: "尊享座席",
        price: 1398,
        period: "月",
        limit5h: "无限制",
        limitWeek: "无限制",
        limitMonth: "250,000 积分/座席",
        notes: "¥1,398/座席/月；月度总额度制；到期未用额度不结转",
      },
      {
        name: "共享用量包",
        price: 5000,
        period: "包",
        limit5h: "-",
        limitMonth: "625,000 积分（有效期1个月）",
        notes: "跨坐席共享，坐席额度用尽后抵扣；多个用量包按最近到期优先抵扣",
      },
    ],
    billingUnit: "积分制",
    tools: [
      "Claude Code",
      "Cursor",
      "Qwen Code",
      "OpenClaw",
      "Hermes Agent",
      "OpenCode",
      "Codex",
      "Cline",
      "Qoder",
    ],
    toolCount: 9,
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
    product: "码道（CodeArts）",
    category: "国内大厂",
    links: { official: "https://www.huaweicloud.com/product/codearts/ai.html" },
    logo: { src: "/logos/huawei.png", alt: "华为云" },
    notice:
      "2026年5月30日 00:00（北京时间）正式商用。原公测免费版自动转入体验版，仍可免费使用；基础版、专业版开始收费。不再使用请停止调用并删除资源，以免产生费用。",
    models: ["GLM", "鸿蒙增训模型"],
    tiers: [
      {
        name: "体验版",
        price: 0,
        period: "月",
        limit5h: "-",
        limitMonth: "5M Token",
        limitMonthTokens: 5_000_000,
        notes: "个人体验/企业测试；至高50席位；500MB 知识空间",
      },
      {
        name: "基础版",
        price: 39,
        period: "月",
        limit5h: "-",
        limitMonth: "20M Token",
        limitMonthTokens: 20_000_000,
        notes: "小型企业/团队；至高100席位；含 Agent 中心、技能和规则中心",
      },
      {
        name: "专业版",
        price: 139,
        period: "月",
        limit5h: "-",
        limitMonth: "60M Token",
        limitMonthTokens: 60_000_000,
        notes: "中大型企业；至高1000席位；含审计日志、模型管理、企业自定义模型、用量管理",
      },
    ],
    billingUnit: "Token计费",
    tools: ["CodeArts IDE", "CLI/TUI", "JetBrains 插件", "VS Code 插件"],
    toolCount: 4,
    tags: ["按席位计费", "Agent Space", "CodeArts工具链"],
  },
  {
    id: "glm",
    company: "智谱华章",
    product: "GLM Coding Plan",
    category: "其他",
    links: {
      official: "https://www.bigmodel.cn/glm-coding",
      affiliate: "https://www.bigmodel.cn/glm-coding?ic=R8RQ6LQCRJ",
    },
    logo: { src: "/logos/bigmodel.png", alt: "智谱AI" },
    notice:
      "官方公告（2026-07-30）：GLM Coding Plan 已更新为按 Token 消耗的积分制；新个人版 Lite/Pro/Max 为 ¥118/538/1,078/月。现有套餐权益不受影响，周末全天按非高峰规则抵扣。V1 用户到期前可按历史 V2 价 ¥49/149/469/月续订或升级（包季 9 折、包年 8 折，入口预计 8 月中旬开放）；团队套餐到期后可订阅新版。详情：https://docs.bigmodel.cn/cn/coding-plan/notice/usage-revision",
    models: ["GLM 5.2", "GLM 5 Turbo", "GLM 4.7"],
    tiers: [
      {
        name: "Lite",
        price: 118,
        period: "月",
        limit5h: "2,000 积分",
        limitWeek: "10,000 积分/周",
        limitMonth: "40,000 积分",
        limitMonthTokens: 348_000_000,
        notes:
          "适合小型 Repo 轻量级迭代；逐步开放最新旗舰模型及功能；支持 ZCode、Claude Code 等 20+ 编程工具。以 GLM-5.2、90.9% 缓存命中率估算，约 43–87M Token/周（高峰至非高峰）。",
      },
      {
        name: "Pro",
        price: 538,
        period: "月",
        limit5h: "12,000 积分",
        limitWeek: "60,000 积分/周",
        limitMonth: "240,000 积分",
        limitMonthTokens: 2_104_000_000,
        notes:
          "适合中型 Repo 日常开发；6 倍 Lite 用量额度，含 Lite 全部权益；优先体验最新旗舰模型及功能，覆盖多款精选 MCP 工具，生成速度更快。以 GLM-5.2、90.9% 缓存命中率估算，约 263–526M Token/周（高峰至非高峰）。",
      },
      {
        name: "Max",
        price: 1078,
        period: "月",
        limit5h: "28,000 积分",
        limitWeek: "140,000 积分/周",
        limitMonth: "560,000 积分",
        limitMonthTokens: 4_904_000_000,
        notes:
          "适合高阶用户中大型 Repo 深度开发；14 倍 Lite 用量额度，含 Pro 全部权益；首发接入最新旗舰模型及功能，高峰期专属资源优先保障。以 GLM-5.2、90.9% 缓存命中率估算，约 613M–1.226B Token/周（高峰至非高峰）。",
      },
      {
        name: "标准席位",
        price: 598,
        period: "月",
        limit5h: "15,000 积分",
        limitWeek: "66,000 积分/周",
        limitMonth: "264,000 积分",
        limitMonthTokens: 2_312_000_000,
        notes:
          "适合中型 Repo 日常开发；2 席起购，年付 9 折，低至 ¥538.2/月。支持组织席位与权限统一管理、团队用量与研发效能看板、超额按量付费及预算控制、指定固定 IP 地址访问、集中式账单与发票管理；数据默认不用于模型训练。以 GLM-5.2、90.9% 缓存命中率估算，约 289–578M Token/周（高峰至非高峰）。",
      },
      {
        name: "高级席位",
        price: 1198,
        period: "月",
        limit5h: "35,000 积分",
        limitWeek: "155,000 积分/周",
        limitMonth: "620,000 积分",
        limitMonthTokens: 5_428_000_000,
        notes:
          "适合中大型 Repo 深度开发；2 席起购，年付 9 折，低至 ¥1,078.2/月。含标准席位全部权益；首发接入最新旗舰模型及功能，高峰期专属资源优先保障。以 GLM-5.2、90.9% 缓存命中率估算，约 679M–1.357B Token/周（高峰至非高峰）。",
      },
    ],
    billingUnit: "积分制",
    tools: ["ZCode", "Claude Code", "Kilo Code", "OpenClaw", "OpenCode", "TRAE", "CodeBuddy"],
    toolCount: 20,
    tags: ["GLM-5.2", "每周积分", "团队席位"],
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
    models: ["GLM 5.2", "GLM 5 Turbo", "GLM 4.7"],
    tiers: [
      {
        name: "Lite",
        price: 121.46,
        period: "月",
        limit5h: "-",
        limitWeek: "10,000 积分/周",
        limitMonth: "40,000 积分",
        limitMonthTokens: 348_000_000,
        notes: "$18/月；适合小型 Repo 轻量级迭代，逐步开放最新旗舰模型及功能；支持 ZCode、Claude Code 等 20+ Agent 工具。",
      },
      {
        name: "Pro",
        price: 539.81,
        period: "月",
        limit5h: "-",
        limitWeek: "60,000 积分/周",
        limitMonth: "240,000 积分",
        limitMonthTokens: 2_104_000_000,
        notes: "$80/月；6 倍 Lite 用量，含 Lite 全部权益；适合中型 Repo 日常开发，含精选 MCP 工具、优先模型访问与更快生成速度。",
      },
      {
        name: "Max",
        price: 1133.6,
        period: "月",
        limit5h: "-",
        limitWeek: "140,000 积分/周",
        limitMonth: "560,000 积分",
        limitMonthTokens: 4_904_000_000,
        notes: "$168/月；14 倍 Lite 用量，含 Pro 全部权益；适合中大型 Repo 深度开发，首发接入最新旗舰模型及功能，高峰期资源优先保障。",
      },
      {
        name: "Standard Seat",
        price: 593.79,
        period: "月",
        limit5h: "-",
        limitWeek: "66,000 积分/周",
        limitMonth: "264,000 积分",
        limitMonthTokens: 2_312_000_000,
        notes: "$88/席/月；年付 9 折低至 $79.2/月（约 ¥534.41）。含席位与权限管理、团队分析看板、灵活用量计费、集中账单与发票及默认数据隐私。",
      },
      {
        name: "Premium Seat",
        price: 1268.56,
        period: "月",
        limit5h: "-",
        limitWeek: "155,000 积分/周",
        limitMonth: "620,000 积分",
        limitMonthTokens: 5_428_000_000,
        notes: "$188/席/月；年付 9 折低至 $169.2/月（约 ¥1,141.70）。含 Standard Seat 全部权益，并优先接入新模型与功能、高峰期资源优先保障。",
      },
    ],
    billingUnit: "积分制",
    tools: ["ZCode", "Claude Code", "Kilo Code", "OpenClaw", "OpenCode", "TRAE", "CodeBuddy"],
    toolCount: 20,
    tags: ["每周积分", "团队席位"],
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
      "新会员计划即将上线，届时 Kimi 与 Kimi Code 权益将分离；现有订阅用户不受影响，仍可在新计划上线前购买当前套餐。",
    models: [
      "Kimi K3",
      "Kimi K2.7 Code",
      "Kimi K2.7 Code Highspeed",
      "Kimi K2.6",
      "Kimi K2.5",
    ],
    tiers: [
      {
        name: "Andante",
        price: 49,
        period: "月",
        limit5h: "~1.6M Token",
        limitWeek: "~8.2M Token",
        limitMonth: "~33M Token",
        limitMonthTokens: 33_000_000,
        notes:
          "基础使用：Kimi Code 1× 积分；含 Docs/Sheets/Slides、Deep Research、网页部署、Research Preview、任务看板、定时任务与插件",
      },
      {
        name: "Moderato",
        price: 99,
        period: "月",
        limit5h: "~6.4M Token",
        limitWeek: "~32.8M Token",
        limitMonth: "~132M Token",
        limitMonthTokens: 132_000_000,
        notes:
          "进阶流程：2× Agent 积分、Kimi Code 4× 积分；升级可退差价；含 Swarm、任务看板、定时任务与插件",
      },
      {
        name: "Allegretto",
        price: 199,
        period: "月",
        limit5h: "~32M Token",
        limitWeek: "~164M Token",
        limitMonth: "~660M Token",
        limitMonthTokens: 660_000_000,
        notes:
          "专业选择：4× Agent 积分、Kimi Code 20× 积分；支持多任务、Goal 模式、Kimi Claw 一键部署、Swarm 与定时任务",
      },
      {
        name: "Allegro",
        price: 699,
        period: "月",
        limit5h: "~96M Token",
        limitWeek: "~492M Token",
        limitMonth: "~1.98B Token",
        limitMonthTokens: 1_980_000_000,
        notes:
          "高级模式：10× Agent 积分、Kimi Code 60× 积分；Agent 并发 4、K3 超长上下文（最高 1M Token）、Goal 模式、Kimi Claw 与 Swarm",
      },
    ],
    billingUnit: "Token计费",
    tools: ["Kimi Code CLI", "Kimi Code for VS Code", "Claude Code", "Roo Code"],
    toolCount: 4,
    tags: ["K3", "Agent 积分", "Kimi Code"],
    yearlyPrice: 468,
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
      "MiMo-V2-Pro / Omni 将于北京时间 2026.6.1 00:00 自动转发至 V2.5 系列，并按 V2.5 系列的定价计费。最终于 2026.6.30 00:00 正式下线，届时原模型名称将失效，请及时核对并完成 V2.5 系列的切换。",
    models: [
      "MiMo V2.5 Pro",
      "MiMo V2.5",
      "MiMo V2.5 TTS VoiceClone",
      "MiMo V2.5 TTS VoiceDesign",
      "MiMo V2.5 TTS",
      "MiMo V2 TTS",
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
    product: "MiniMax Token Plan",
    category: "其他",
    links: {
      official: "https://platform.minimaxi.com/subscribe/token-plan?code=JRiikacsOL",
      affiliate: "https://platform.minimaxi.com/subscribe/token-plan?code=JRiikacsOL",
    },
    logo: { src: "/logos/minimax.png", alt: "MiniMax" },
    notice:
      "M3 上线后订阅用户说明（官方公告）：① 3 月 22 日前购买、此前无周限额的 Legacy 用户，升级后 M2.7 与 M3 仍无周限额；② 3 月 22 日至当周五 10:00 前购买 Token Plan 的用户，订阅有效期内 M3 周限额永久上调 50%；③ 6 月 1 日—6 月 7 日上线首 7 天，全体订阅用户 5 小时/周额度翻倍（发帖当夜已重置额度，以控制台为准）。",
    models: [
      "MiniMax M3",
      "MiniMax M2.7",
      "MiniMax M2.5",
      "MiniMax M2.1",
      "MiniMax M2",
    ],
    tiers: [
      {
        name: "Plus",
        price: 49,
        period: "月",
        limit5h: "~5M Token",
        limitWeek: "~150M Token",
        limitMonth: "~600M Token",
        limitMonthTokens: 600_000_000,
        notes: "3-4 个 Agent 并发；1M 长上下文；M3 原生多模态；全系模型共享额度",
      },
      {
        name: "Max",
        price: 119,
        period: "月",
        limit5h: "~15M Token",
        limitWeek: "~450M Token",
        limitMonth: "~1.8B Token",
        limitMonthTokens: 1_800_000_000,
        notes: "最受欢迎；4-5 个 Agent 并发；视频生成 3 条/日；1M 长上下文；全系模型共享额度",
      },
      {
        name: "Ultra",
        price: 469,
        period: "月",
        limit5h: "~50M Token",
        limitWeek: "~1.7B Token",
        limitMonth: "~7.1B Token",
        limitMonthTokens: 7_100_000_000,
        notes: "顶级配置；6-7 个 Agent 并发；视频生成 5 条/日；1M 长上下文；全系模型共享额度",
      },
    ],
    billingUnit: "Token计费",
    tools: [
      "Claude Code",
      "Cursor",
      "Cline",
      "OpenClaw",
      "TRAE",
      "Hermes Agent",
      "Roo Code",
      "Kilo Code",
      "OpenCode",
      "Codex CLI",
      "Droid",
      "Grok CLI",
    ],
    toolCount: 12,
    tags: ["M3", "1M上下文"],
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
    models: [
      "GLM 5.1",
      "GLM 5",
      "Kimi K2.5",
      "MiniMax M2.7",
      "MiniMax M2.5",
      "Tencent HY 2.0 Think",
      "Tencent HY 2.0 Instruct",
    ],
    tiers: [
      {
        name: "Lite - 体验套餐",
        price: 28,
        period: "月",
        limit5h: "-",
        limitMonth: "35M Token",
        limitMonthTokens: 35_000_000,
        notes: "Hy 个人版体验套餐；0.8元/百万tokens；约 70 轮问答",
      },
      {
        name: "Standard - 基础套餐",
        price: 78,
        period: "月",
        limit5h: "-",
        limitMonth: "100M Token",
        limitMonthTokens: 100_000_000,
        notes: "Hy 个人版基础套餐；0.78元/百万tokens；约 200 轮问答",
      },
      {
        name: "Pro - 进阶套餐",
        price: 238,
        period: "月",
        limit5h: "-",
        limitMonth: "320M Token",
        limitMonthTokens: 320_000_000,
        notes: "Hy 个人版进阶套餐；适合每天高频使用 AI 的开发者和效率达人",
      },
      {
        name: "Max - 专业套餐",
        price: 468,
        period: "月",
        limit5h: "-",
        limitMonth: "650M Token",
        limitMonthTokens: 650_000_000,
        notes: "Hy 个人版专业套餐；适合把 AI 当核心生产力工具的重度用户",
      },
    ],
    billingUnit: "Token计费",
    tools: [
      "OpenClaw",
      "CodeBuddy Code",
      "OpenCode",
      "Claude Code",
      "Codex",
      "Cline",
      "Cursor",
      "Kilo CLI",
      "Kilo Code",
    ],
    toolCount: 9,
    tags: ["Hy3 ", "混元模型"],
  },
  {
    id: "scnet",
    company: "中科曙光",
    product: "超算互联网 Plan",
    category: "其他",
    links: { official: "https://www.scnet.cn/ui/console/index.html#/llm/token-plan" },
    logo: { src: "/logos/scnet.png", alt: "超算互联网" },
    notice:
      "限时特惠价为首月价，续费按原价。采用积分统一计量；须使用 sk-tp- 开头专属 API Key；仅限 AI 工具交互使用；额度用尽不自动转按量、到期未用积分不结转；不支持升/降档与退款。积分抵扣规则自 2026-08-08 起生效。",
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
    product: "京东云 Coding Plan",
    category: "其他",
    links: { official: "https://www.jdcloud.com/cn/pages/codingplan" },
    logo: { src: "/logos/jd.png", alt: "京东" },
    models: [
      "DeepSeek V3.2",
      "GLM 5",
      "GLM 4.7",
      "MiniMax M2.5",
      "Kimi K2.5",
      "Kimi K2 Turbo",
      "Qwen3 Coder",
    ],
    tiers: [
      {
        name: "Lite",
        price: 40,
        firstMonthPrice: 19.9,
        period: "月",
        limit5h: "~1,200 次",
        limitWeek: "~9,000 次",
        limitMonth: "~18,000 次",
        limit5hCount: 1200,
        limitWeekCount: 9000,
        limitMonthCount: 18000,
        notes:
          "每天10:30限量开抢，每月最多18,000次请求；每次提问可能触发多次模型调用，实际消耗与项目复杂度/是否开启深度思考有关（以控制台为准）",
      },
      {
        name: "Pro",
        price: 200,
        firstMonthPrice: 99.9,
        period: "月",
        limit5h: "~6,000 次",
        limitWeek: "~45,000 次",
        limitMonth: "~90,000 次",
        limit5hCount: 6000,
        limitWeekCount: 45000,
        limitMonthCount: 90000,
        notes: "Lite 用量的 5 倍；每天10:30限量开抢（以控制台活动页面为准）",
      },
    ],
    billingUnit: "API请求",
    tools: ["Claude Code", "OpenCode", "OpenClaw", "Roo Code", "Cursor"],
    toolCount: 5,
    tags: [],
  },
  {
    id: "baidu",
    company: "百度",
    product: "千帆 Token Plan",
    category: "国内大厂",
    links: { official: "https://cloud.baidu.com/product/codingplan.html" },
    logo: { src: "/logos/yiyan.png", alt: "文心一言" },
    notice:
      "2026年7月千帆 Coding Plan 已升级迁移至 Token Plan 个人版（迁移协议发布于 2026-07-12）。新购统一按 Token 额度计费，取消原有三层限流；首购限时5折仅限首次购买，续费按标准价。原 Coding Plan 用户可在控制台一键升级：迁移为权益置换（非叠加），升级后立即获得所选 Token Plan 完整额度、已用 Coding Plan 额度清零，原剩余有效期顺延 1 个月；迁移后须使用 Token Plan 专属 API Key 与 Base URL（https://qianfan.baidubce.com/v2/tokenplan/personal），旧 Coding Plan 配置将无法调用。迁移不支持撤销、退款或回退。",
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
    id: "kuaishou",
    company: "快手",
    product: "KwaiKAT Coding Plan",
    category: "其他",
    links: {
      official: "https://www.streamlake.com/marketing/coding-plan",
      affiliate: "https://www.streamlake.com/marketing/cny-model-guess?inviteCode=PR4H9M",
    },
    logo: { src: "/logos/kuaishou.png", alt: "快手" },
    models: [
      "KAT Coder Pro V1",
      "DeepSeek V3.2",
      "GLM 5",
      "GLM 4.7 Flash",
      "GLM 4.7",
      "MiniMax M2.5",
      "MiniMax M2.1 Lightning",
      "MiniMax M2.1",
      "Kimi K2.5",
      "Kimi K2 Thinking",
      "Qwen3 Coder Next",
      "Qwen3.5 Plus",
      "Qwen3.5 397B A17B",
    ],
    tiers: [
      {
        name: "Mini",
        price: 29,
        firstMonthPrice: 8.8,
        secondMonthPrice: 29,
        period: "月",
        limit5h: "40 次对话",
        limit5hCount: 40,
        countsPrompts: true,
        notes: "首月优惠仅限1次；限时特惠期：2026-01-05~2026-03-22",
      },
      {
        name: "Starter",
        price: 70,
        firstMonthPrice: 48,
        secondMonthPrice: 70,
        period: "月",
        limit5h: "100 次对话",
        limit5hCount: 100,
        countsPrompts: true,
        notes: "首月优惠仅限1次；限时特惠期：2026-01-05~2026-03-22",
      },
      {
        name: "Pro",
        price: 140,
        firstMonthPrice: 96,
        secondMonthPrice: 140,
        period: "月",
        limit5h: "300 次对话",
        limit5hCount: 300,
        countsPrompts: true,
        notes: "首月优惠仅限1次；限时特惠期：2026-01-05~2026-03-22",
      },
      {
        name: "Max",
        price: 350,
        firstMonthPrice: 240,
        secondMonthPrice: 350,
        period: "月",
        limit5h: "1,000 次对话",
        limit5hCount: 1000,
        countsPrompts: true,
        notes: "首月优惠仅限1次；限时特惠期：2026-01-05~2026-03-22",
      },
    ],
    billingUnit: "请求次数",
    tools: ["Claude Code"],
    toolCount: 1,
    tags: [],
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
    models: [
      "Grok 4.5",
      "GLM 5.2",
      "GLM 5.1",
      "Kimi K3",
      "Kimi K2.7 Code",
      "Kimi K2.6",
      "MiMo V2.5",
      "MiMo V2.5 Pro",
      "MiniMax M3",
      "MiniMax M2.7",
      "Qwen3.7 Max",
      "Qwen3.7 Plus",
      "Qwen3.6 Plus",
      "DeepSeek V4 Pro",
      "DeepSeek V4 Flash",
    ],
    tiers: [
      {
        name: "Go",
        price: 70,
        firstMonthPrice: 35,
        secondMonthPrice: 70,
        period: "月",
        limit5h: "$12 用量",
        limitWeek: "$30",
        limitMonth: "$60 用量",
        limit5hCount: 3275,
        limitWeekCount: 8175,
        limitMonthCount: 16300,
        notes: "按美元额度滚动计费；约 3,275 次/5h、16,300 次/月（15 款模型官方估算中位数）；可充值",
      },
    ],
    billingUnit: "按量计费",
    tools: ["OpenCode", "Claude Code", "Cursor", "Cline", "Codex CLI", "Roo Code", "任意 Agent"],
    toolCount: 7,
    tags: [],
  },
  {
    id: "cucloud-token",
    company: "联通云",
    product: "元景 Token Plan",
    category: "其他",
    links: { official: "https://www.cucloud.cn/product/tokenplan.html" },
    logo: { src: "/logos/cucloud.png", alt: "联通云" },
    notice: "个人版与团队版不可互转，仅支持同版本内 Lite > Pro > Max 升级。",
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
    id: "cursor",
    company: "Cursor",
    product: "Cursor Plan",
    category: "其他",
    links: {
      official: "https://cursor.com/cn/pricing",
    },
    logo: { src: "/logos/cursor.png", alt: "Cursor" },
    models: [
      "Auto",
      "Premium",
      "Composer 2.5",
      "Composer 2",
      "Composer 1.5",
      "Composer 1",
      "Claude Opus 4.8",
      "Claude Fable 5",
      "Claude 4.6 Sonnet",
      "Claude 4.6 Opus",
      "Claude 4.7 Opus",
      "Claude 4.5 Sonnet",
      "Claude 4.5 Opus",
      "Claude 4.5 Haiku",
      "Claude 4 Sonnet",
      "Gemini 3.5 Flash",
      "Gemini 3.1 Pro",
      "Gemini 3 Pro",
      "Gemini 3 Flash",
      "Gemini 2.5 Flash",
      "GPT-5.5",
      "GPT-5.4",
      "GPT-5.3 Codex",
      "GPT-5.2 Codex",
      "GPT-5.2",
      "GPT-5.1 Codex",
      "GPT-5-Codex",
      "GPT-5",
      "Grok Build 0.1",
      "Grok 4.3",
      "Grok 4.20",
      "Kimi K2.5",
    ],
    tiers: [
      {
        name: "Hobby",
        price: 0,
        period: "月",
        limit5h: "-",
        limitMonth: "有限额度",
        notes: "免费；有限智能体与 Tab 补全",
      },
      {
        name: "Pro",
        price: 135,
        period: "月",
        limit5h: "-",
        limitMonth: "$20 用量",
        requestEqMonth: 1330,
        notes: "$20/月（约 ¥135）；按统一 6万 Token/次折算约 1,330 次（Sonnet ~850 / Gemini Flash ~4,900）；另含 Auto+Composer 大额池",
      },
      {
        name: "Pro+",
        price: 405,
        period: "月",
        limit5h: "-",
        limitMonth: "$70 用量",
        requestEqMonth: 4650,
        notes: "$60/月（约 ¥405）；含 $70 API 用量，按统一 6万 Token/次折算约 4,650 次",
      },
      {
        name: "Ultra",
        price: 1350,
        period: "月",
        limit5h: "-",
        limitMonth: "$400 用量",
        requestEqMonth: 26600,
        notes: "$200/月（约 ¥1350）；含 $400 API 用量，按统一 6万 Token/次折算约 26,600 次",
      },
      {
        name: "Teams",
        price: 270,
        period: "月",
        limit5h: "-",
        limitMonth: "500 次/席位",
        limitMonthCount: 500,
        notes: "多数模型 1 次/请求；Sonnet 思考模式 2 次；MAX Mode 按 Token 计费",
      },
    ],
    billingUnit: "按量计费",
    tools: ["Cursor"],
    toolCount: 1,
    tags: [],
  },
]
