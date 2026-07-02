export type PlanCategory = "国内大厂" | "其他"

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
 * - 周→月、5小时→月：方舟/讯飞/京东/百度官方档位均满足 月配额 = 2×周配额 = 15×5小时配额。
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

/** 请求频次排序：先比 5 小时，再比每周，最后比每月（高者优先，无数据排后） */
export function comparePlanRateLimits(a: Plan, b: Plan): number {
  const ta = basicRegularTier(a)
  const tb = basicRegularTier(b)
  // 月维度兜底 requestEqMonth，保证纯月配额平台（如 Cursor）可参与比较
  const cols: [number | undefined, number | undefined][] = [
    [ta?.limit5hCount, tb?.limit5hCount],
    [ta?.limitWeekCount, tb?.limitWeekCount],
    [ta?.limitMonthCount ?? ta?.requestEqMonth, tb?.limitMonthCount ?? tb?.requestEqMonth],
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
    id: "bailian",
    company: "阿里云",
    product: "百炼 Coding Plan",
    category: "国内大厂",
    links: {
      official: "https://www.aliyun.com/benefit/scene/codingplan",
      affiliate: "https://www.aliyun.com/benefit/scene/codingplan?source=5176.29345612&userCode=y44p2mtf",
    },
    logo: { src: "/logos/qwen.png", alt: "通义千问" },
    notice:
      "公告时间 2026-04-11：因产品策略调整，百炼 Coding Plan Lite 将于北京时间 2026-04-13 18:00 起停止续费和升级。已购用户可继续使用至到期；已开通自动续费的 Lite 将于公告 30 日后自动失效，不影响当前有效期内使用。",
    models: [
      "qwen3.6-plus",
      "kimi-k2.5",
      "glm-5",
      "MiniMax-M2.5",
      "qwen3.5-plus",
      "qwen3-max-2026-01-23",
      "qwen3-coder-next",
      "qwen3-coder-plus",
      "glm-4.7",
    ],
    tiers: [
      {
        name: "Pro",
        price: 200,
        period: "月",
        limit5h: "6,000 次",
        limitWeek: "45,000 次",
        limitMonth: "90,000 次",
        limit5hCount: 6000,
        limitWeekCount: 45000,
        limitMonthCount: 90000,
        notes: "高级套餐：复杂项目及大规模开发任务；推荐模型含 qwen3.6-plus、kimi-k2.5、glm-5、MiniMax-M2.5",
      },
    ],
    billingUnit: "API请求",
    tools: ["Claude Code", "Cline", "OpenClaw", "Qwen Code"],
    toolCount: 4,
    tags: ["多模型", "固定月费", "Lite停止续费升级"],
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
    models: [
      "qwen3.6-plus",
      "glm-5",
      "MiniMax-M2.5",
      "DeepSeek-V3.2",
      "qwen-image-2.0",
      "qwen-image-2.0-pro",
      "wan2.7-image",
      "wan2.7-image-pro",
    ],
    tiers: [
      {
        name: "标准坐席",
        price: 198,
        period: "月",
        limit5h: "-",
        limitMonth: "25,000 积分",
        notes: "轻度使用 AI 辅助的团队成员",
      },
      {
        name: "高级坐席",
        price: 698,
        period: "月",
        limit5h: "-",
        limitMonth: "100,000 积分",
        notes: "日常高频使用 AI 编码的团队成员",
      },
      {
        name: "尊享坐席",
        price: 1398,
        period: "月",
        limit5h: "-",
        limitMonth: "250,000 积分",
        notes: "重度依赖 AI 编码的核心开发者",
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
    billingUnit: "Token计费",
    tools: ["OpenClaw", "Hermes Agent", "Qwen Code", "Qoder", "Claude Code", "OpenCode"],
    toolCount: 6,
    tags: ["Credits计量", "文本+图像模型", "团队版", "多坐席"],
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
      "Doubao-Seed-2.0",
      "Doubao-Seed",
      "GLM-5.2",
      "Kimi-K2.7-Code",
      "MiniMax-M3",
      "DeepSeek-V4-Flash",
      "DeepSeek-V4-Pro",
      "MiniMax-M2.7",
      "Kimi-K2.6"
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
    tags: ["多模型", "Auto模式", "2.5折活动"],
  },
  {
    id: "ark-agent",
    company: "字节跳动",
    product: "火山方舟 Agent Plan",
    category: "国内大厂",
    links: {
      official: "https://www.volcengine.com/activity/agentplan?utm_campaign=20260611&utm_content=agentplan&utm_medium=agentplan-koc&utm_source=agentplan-koc&utm_term=01",
      affiliate: "https://www.volcengine.com/activity/agentplan?utm_campaign=20260611&utm_content=agentplan&utm_medium=agentplan-koc&utm_source=agentplan-koc&utm_term=01",
    },
    logo: { src: "/logos/volcengine.png", alt: "火山引擎" },
    notice:
      "方舟 Agent Plan 面向个人用户，采用 Agent 燃料值（AFP）统一计量；文本/向量/视频按原始 token 抵扣，图片按张抵扣。套餐额度仅在 AI 工具中生效，不可用于普通 API 调用；误用普通 API 可能导致订阅停用或账号封禁。",
    models: [
      "Auto",
      "Doubao-Seed-2.0",
      "Doubao-Seedance-2.0",
      "Doubao-Seedream-5.0",
      "Doubao-embedding-vision",
      "GLM-5.2",
      "Kimi-K2.7-Code",
      "DeepSeek-V4-Pro",
      "DeepSeek-V4-Flash",
      "MiniMax-M3",
      "Doubao-Seed-TTS-2.0",
      "Doubao-Seed-ASR-2.0",
      "MiniMax-M2.7",
      "Kimi-K2.6",
      "DeepSeek-V3.2"
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
        notes: "体验版本，仅供测试；每月 20,000 Agent 燃料值",
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
        notes: "日常高频额度 5× Small 用量；免费赠送 ArkClaw 轻量版",
      },
      {
        name: "Large",
        price: 500,
        period: "月",
        limit5h: "25,000 AFP",
        limitWeek: "87,500 AFP",
        limitMonth: "250,000 AFP",
        notes: "复杂重度开发 12.5× Small 用量；领先支持 Seedance 2.0 系列",
      },
      {
        name: "Max",
        price: 1000,
        period: "月",
        limit5h: "50,000 AFP",
        limitWeek: "175,000 AFP",
        limitMonth: "500,000 AFP",
        notes: "顶配旗舰额度 25× Small 用量；领先支持 Seedance 2.0 系列",
      },
    ],
    billingUnit: "积分制",
    tools: ["Claude Code", "OpenCode", "OpenClaw", "Hermes Agent", "Roo Code", "Cline", "Kilo Code", "Cursor"],
    toolCount: 8,
    tags: ["Agent Plan", "AFP积分", "全模态", "联网搜索"],
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
    models: ["GLM-5.2", "GLM-5.1", "GLM-5-Turbo", "GLM-4.7", "GLM-4.6", "GLM-4.5-Air", "GLM-5（Max/Pro）"],
    tiers: [
      {
        name: "Lite",
        price: 49,
        period: "月",
        limit5h: "~80 次对话",
        limitWeek: "~400 次对话",
        limit5hCount: 80,
        limitWeekCount: 400,
        countsPrompts: true,
        notes: "MCP 100次/月；基础模型全支持",
      },
      {
        name: "Pro",
        price: 149,
        period: "月",
        limit5h: "~400 次对话",
        limitWeek: "~2,000 次对话",
        limit5hCount: 400,
        limitWeekCount: 2000,
        countsPrompts: true,
        notes: "MCP 1,000次/月；含 GLM-5.2",
      },
      {
        name: "Max",
        price: 469,
        period: "月",
        limit5h: "~1,600 次对话",
        limitWeek: "~8,000 次对话",
        limit5hCount: 1600,
        limitWeekCount: 8000,
        countsPrompts: true,
        notes: "MCP 4,000次/月，高峰优先；含 GLM-5.2",
      },
    ],
    billingUnit: "按量计费",
    tools: ["Claude Code", "Roo Code", "Kilo Code", "Cline", "OpenCode", "Cursor", "CodeGeeX"],
    toolCount: 20,
    tags: ["开源SOTA", "自研模型", "MCP工具"],
    yearlyPrice: 411,
    quarterlyPrice: 132,
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
    models: ["GLM-5.2", "GLM-5-Turbo", "GLM-5"],
    tiers: [
      {
        name: "Lite",
        price: 122.4,
        firstMonthPrice: 110.16,
        secondMonthPrice: 110.16,
        period: "月",
        limit5h: "~80 次对话",
        limitWeek: "~400 次对话",
        limit5hCount: 80,
        limitWeekCount: 400,
        countsPrompts: true,
        notes: "$18/月，当前 $16.2/月；轻量小仓库迭代，含基础用量与最新旗舰模型滚动访问",
      },
      {
        name: "Pro",
        price: 489.6,
        firstMonthPrice: 440.64,
        secondMonthPrice: 440.64,
        period: "月",
        limit5h: "~400 次对话",
        limitWeek: "~2,000 次对话",
        limit5hCount: 400,
        limitWeekCount: 2000,
        countsPrompts: true,
        notes: "$72/月，当前 $64.8/月；5x Lite 用量，含精选 MCP 工具、优先模型访问与更快生成速度",
      },
      {
        name: "Max",
        price: 1088,
        firstMonthPrice: 979.2,
        secondMonthPrice: 979.2,
        period: "月",
        limit5h: "~1,600 次对话",
        limitWeek: "~8,000 次对话",
        limit5hCount: 1600,
        limitWeekCount: 8000,
        countsPrompts: true,
        notes: "$160/月，当前 $144/月；20x Lite 用量，峰值时段专用资源，优先尝鲜最新旗舰模型",
      },
    ],
    billingUnit: "按量计费",
    tools: ["Claude Code", "Roo Code", "Kilo Code", "Cline", "OpenCode", "Cursor", "CodeGeeX"],
    toolCount: 20,
    tags: ["持续有货", "开源SOTA", "自研模型"],
  },
  {
    id: "kimi",
    company: "月之暗面",
    product: "Kimi Code Plan",
    category: "其他",
    links: { official: "https://www.kimi.com/membership/pricing" },
    logo: { src: "/logos/kimi.png", alt: "Kimi" },
    models: ["Kimi K2.7 Code", "Kimi K2.6", "Kimi K2.5", "Kimi K2 Thinking"],
    tiers: [
      {
        name: "Andante",
        price: 49,
        period: "月",
        limit5h: "300–1,200 次",
        limitMonth: "~17M Token",
        limitMonthTokens: 17_000_000,
        notes: "基础使用：含 Deep Research、网页部署、专业数据与 Kimi Code",
      },
      {
        name: "Moderato",
        price: 99,
        period: "月",
        limit5h: "1,200–4,800 次",
        limitMonth: "~69M Token",
        limitMonthTokens: 69_000_000,
        notes: "进阶效率：2x Agent 积分 + Kimi Code 4x 配额，多设备登录",
      },
      {
        name: "Allegretto",
        price: 199,
        period: "月",
        limit5h: "6,000–24,000 次",
        limitMonth: "~343M Token",
        limitMonthTokens: 343_000_000,
        notes: "专业创作：4x Agent 积分，支持多任务、Kimi Claw 与 Agent Swarm",
      },
      {
        name: "Allegro",
        price: 699,
        period: "月",
        limit5h: "18,000–72,000 次",
        limitMonth: "~1B Token",
        limitMonthTokens: 1_000_000_000,
        notes: "旗舰模式：10x Agent 积分 + Kimi Code 60x，含 Claw 与 Agent Swarm",
      },
    ],
    billingUnit: "Token计费",
    tools: ["Kimi Code CLI", "Kimi Code for VS Code", "Claude Code", "Roo Code"],
    toolCount: 4,
    tags: ["K2.7 Code / K2.6", "7天滚动刷新", "256K上下文"],
    yearlyPrice: 468,
  },
  {
    id: "xfyun",
    company: "科大讯飞",
    product: "讯飞星辰 Astron Coding Plan",
    category: "其他",
    links: {
      official: "https://maas.xfyun.cn/packageSubscription?ch=maas-cg-kol-120",
      affiliate: "https://maas.xfyun.cn/packageSubscription?ch=maas-cg-kol-120",
    },
    logo: { src: "/logos/xfyun.png", alt: "讯飞星辰" },
    models: [
      "Spark X2",
      "GLM-5",
      "GLM-5.2",
      "DeepSeek-V4-Pro",
      "DeepSeek-V4-Flash",
      "Kimi-K2.6",
      "GLM-5.1",
      "MiniMax-M2.5",
      "Kimi-K2.5",
      "DeepSeek-V3.2",
      "Spark-X2-Flash",
      "Qwen3.6-35B-A3B",
      "GLM-4.7-Flash",
      "Qwen3.5-35B-A3B",
      "Qwen3-Coder-Next-FP8",
      "Qwen3.5-397B-A17B",
    ],
    tiers: [
      {
        name: "无忧版",
        price: 19,
        firstMonthPrice: 3.9,
        secondMonthPrice: 19,
        period: "月",
        limit5h: "1,200 次",
        limitWeek: "9,000 次",
        limitMonth: "18,000 次",
        limit5hCount: 1200,
        limitWeekCount: 9000,
        limitMonthCount: 18000,
        notes:
          "首购 ¥3.90/月，后续 ¥19/月；请求次数不限；Spark-X2-Flash / Qwen3.6-35B-A3B / Qwen3.5-35B-A3B / Qwen3-Coder-Next-FP8 / GLM-4.7-Flash",
      },
      {
        name: "专业版",
        price: 39,
        period: "月",
        limit5h: "1,200 次",
        limitWeek: "9,000 次",
        limitMonth: "18,000 次",
        limit5hCount: 1200,
        limitWeekCount: 9000,
        limitMonthCount: 18000,
        notes:
          "高性价比；Spark X2 / GLM-5 / Kimi-K2.6 / GLM-5.1 / MiniMax-M2.5 / Kimi-K2.5 / DeepSeek-V3.2 / Spark-X2-Flash / Qwen3.6-35B-A3B / GLM-4.7-Flash / Qwen3.5-35B-A3B / Qwen3-Coder-Next-FP8 / Qwen3.5-397B-A17B",
      },
      {
        name: "高效版",
        price: 199,
        period: "月",
        limit5h: "6,000 次",
        limitWeek: "45,000 次",
        limitMonth: "90,000 次",
        limit5hCount: 6000,
        limitWeekCount: 45000,
        limitMonthCount: 90000,
        notes:
          "极致性能；Spark X2 / GLM-5 / GLM-5.2 / DeepSeek-V4-Pro / DeepSeek-V4-Flash / Kimi-K2.6 / GLM-5.1 / MiniMax-M2.5 / Kimi-K2.5 / DeepSeek-V3.2 / Spark-X2-Flash / Qwen3.6-35B-A3B / GLM-4.7-Flash / Qwen3.5-35B-A3B / Qwen3-Coder-Next-FP8 / Qwen3.5-397B-A17B",
      },
    ],
    billingUnit: "API请求",
    tools: ["Claude Code", "Cline", "Cursor", "OpenClaw"],
    toolCount: 4,
    tags: ["首购特惠", "请求次数", "多模型"],
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
      "MiMo-V2.5-Pro",
      "MiMo-V2.5",
      "MiMo-V2.5-TTS-VoiceClone",
      "MiMo-V2.5-TTS-VoiceDesign",
      "MiMo-V2.5-TTS",
      "MiMo-V2-TTS",
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
    tags: ["夜间0.8×", "首购88折"],
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
      "MiniMax-M3",
      "MiniMax-M2.7",
      "MiniMax-M2.5",
      "MiniMax-M2.1",
      "MiniMax-M2",
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
    tags: ["M3", "全模态", "1M上下文"],
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
    models: ["DeepSeek-V3.2", "DeepSeek-V3.2-Thinking", "Kimi-2.5", "MiniMax-M2.1", "MiniMax-M2.5", "GLM-4.7", "GLM-5"],
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
    tags: ["多模型", "滑动窗口"],
  },
  {
    id: "tencent",
    company: "腾讯云",
    product: "Hy Token Plan",
    category: "国内大厂",
    links: {
      official: "https://cloud.tencent.com/act/pro/tokenplan",
      affiliate: "https://cloud.tencent.com/act/cps/redirect?redirect=38205&cps_key=b1b782d9eb899c792b44ce3dccf79759",
    },
    logo: { src: "/logos/tencentcloud.png", alt: "腾讯云" },
    notice:
      "Hy Token Plan 限时优惠：Lite 和 Standard 套餐享 5 折优惠，活动时间 2026.04.30-05.06，限购 1 个，以官网活动规则为准。",
    models: [
      "GLM-5.1",
      "GLM-5",
      "kimi-k2.5",
      "MiniMax-M2.7",
      "MiniMax-M2.5",
      "Tencent HY 2.0 Think",
      "Tencent HY 2.0 Instruct",
    ],
    tiers: [
      {
        name: "Lite - 体验套餐",
        price: 28,
        firstMonthPrice: 14,
        secondMonthPrice: 28,
        period: "月",
        limit5h: "-",
        limitMonth: "35M Token",
        limitMonthTokens: 35_000_000,
        notes: "Hy 个人版体验套餐；0.4元/百万tokens；约 70 轮问答；限时 5 折活动价 14 元（2026.04.30-05.06，限 1 个）",
      },
      {
        name: "Standard - 基础套餐",
        price: 78,
        firstMonthPrice: 39,
        secondMonthPrice: 78,
        period: "月",
        limit5h: "-",
        limitMonth: "100M Token",
        limitMonthTokens: 100_000_000,
        notes: "Hy 个人版基础套餐；0.39元/百万tokens；约 200 轮问答；限时 5 折活动价 39 元（2026.04.30-05.06，限 1 个）",
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
    tags: ["Hy Token Plan", "Hy3 preview", "限时5折", "混元模型"],
  },
  {
    id: "jdcloud",
    company: "京东云",
    product: "京东云 Coding Plan",
    category: "其他",
    links: { official: "https://www.jdcloud.com/cn/pages/codingplan" },
    logo: { src: "/logos/jd.png", alt: "京东" },
    models: [
      "DeepSeek-V3.2",
      "GLM-5",
      "GLM-4.7",
      "MiniMax-M2.5",
      "Kimi-K2.5",
      "Kimi-K2-Turbo",
      "Qwen3-Coder",
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
    tags: ["多模型", "工具共享额度", "首月优惠"],
  },
  {
    id: "baidu",
    company: "百度",
    product: "千帆 Coding Plan",
    category: "国内大厂",
    links: { official: "https://cloud.baidu.com/product/codingplan.html" },
    logo: { src: "/logos/yiyan.png", alt: "文心一言" },
    models: ["DeepSeek-V3.2", "GLM-4.7", "GLM-5", "Kimi-K2.5", "MiniMax-M2.1", "MiniMax-M2.5"],
    tiers: [
      {
        name: "Lite",
        price: 40,
        firstMonthPrice: 7.9,
        secondMonthPrice: 20,
        period: "月",
        limit5h: "1,200 次",
        limitWeek: "9,000 次",
        limitMonth: "18,000 次",
        limit5hCount: 1200,
        limitWeekCount: 9000,
        limitMonthCount: 18000,
        notes: "第三月起¥40/月, 控制台一键切换模型",
      },
      {
        name: "Pro",
        price: 200,
        firstMonthPrice: 39.9,
        secondMonthPrice: 100,
        period: "月",
        limit5h: "6,000 次",
        limitWeek: "45,000 次",
        limitMonth: "90,000 次",
        limit5hCount: 6000,
        limitWeekCount: 45000,
        limitMonthCount: 90000,
        notes: "第三月起¥200/月, 控制台一键切换模型",
      },
    ],
    billingUnit: "API请求",
    tools: ["Claude Code", "Cline", "Cursor", "OpenClaw"],
    toolCount: 4,
    tags: ["多模型", "首月优惠", "次月半价"],
  },
  {
    id: "moorethreads",
    company: "摩尔线程",
    product: "AI Coding Plan",
    category: "其他",
    links: { official: "https://code.mthreads.com" },
    logo: { src: "/logos/moorethreads.png", alt: "摩尔线程" },
    models: ["GLM-4.7"],
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
      "KAT-Coder-Pro-V1",
      "DeepSeek-V3.2",
      "GLM-5",
      "GLM-4.7-Flash",
      "GLM-4.7",
      "MiniMax-M2.5",
      "MiniMax-M2.1-Lightning",
      "MiniMax-M2.1",
      "Kimi-K2.5",
      "Kimi-K2-Thinking",
      "Qwen3-Coder-Next",
      "Qwen3.5-Plus",
      "Qwen3.5-397B-A17B",
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
    tags: ["多模型", "首月优惠", "限时特惠"],
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
      "GLM-5.2",
      "GLM-5.1",
      "Kimi-K2.6",
      "MiniMax-M2.7",
      "DeepSeek-V3.2",
      "DeepSeek-V4-Flash",
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
    tags: ["Agent Plan", "多模型"],
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
      "GLM-5.2",
      "GLM-5",
      "GLM-5.1",
      "Kimi K2.7 Code",
      "Kimi K2.5",
      "Kimi K2.6",
      "MiMo-V2.5",
      "MiMo-V2.5-Pro",
      "MiniMax M2.5",
      "MiniMax M2.7",
      "MiniMax M3",
      "Qwen3.6 Plus",
      "Qwen3.7 Plus",
      "Qwen3.7 Max",
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
        notes: "按美元额度滚动计费；约 3,275 次/5h、16,300 次/月（16 款模型官方估算中位数）；可充值",
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
    models: ["DeepSeek-V4-Pro", "DeepSeek-V4-Flash", "MiniMax-M2.5"],
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
    tags: ["元景MaaS", "Credits计量"],
  },
  {
    id: "cursor",
    company: "Cursor",
    product: "Cursor Plan",
    category: "其他",
    links: {
      official: "https://cursor.com/cn/pricing",
      affiliate: "https://cursor.com/referral?code=VLP89PWOTBJG",
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
        firstMonthPrice: 67,
        secondMonthPrice: 135,
        period: "月",
        limit5h: "-",
        limitMonth: "$20 用量",
        requestEqMonth: 1330,
        notes: "$20/月（约 ¥135）；按统一 6万 Token/次折算约 1,330 次（Sonnet ~850 / Gemini Flash ~4,900）；另含 Auto+Composer 大额池；推广首月 $10",
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
    tags: ["IDE", "用量预算计费", "首月5折"],
  },
]
