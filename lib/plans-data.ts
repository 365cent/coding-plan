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
  billingUnit: "API请求" | "请求次数" | "Token" | "按量计费"
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

export const plans: Plan[] = [
  {
    id: "bailian",
    company: "阿里云",
    product: "百炼 Coding Plan",
    category: "国内大厂",
    links: {
      official: "https://www.aliyun.com/benefit/scene/codingplan",
      affiliate: "https://www.aliyun.com/benefit/ai/aistar?clubBiz=subTask..12440021..10263..",
    },
    logo: { src: "/logos/qwen.png", alt: "通义千问" },
    notice:
      "自 2026-03-20 00:00:00（UTC+8）起，Lite 基础套餐停止接受新购；已购用户的使用、续费及套餐升级权益不变。",
    models: [
      "qwen3.5-plus",
      "kimi-k2.5",
      "glm-5",
      "MiniMax-M2.5",
      "qwen3-max-2026-01-23",
      "qwen3-coder-next",
      "qwen3-coder-plus",
      "glm-4.7",
    ],
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
        discontinuedForNewSales: true,
        notes: "已停售新购（仅已购用户续费/升级）",
      },
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
      },
    ],
    billingUnit: "API请求",
    tools: ["Claude Code", "Cline", "OpenClaw", "OpenCode", "Cursor"],
    toolCount: 5,
    tags: ["多模型", "固定月费", "Lite停售新购"],
  },
  {
    id: "ark",
    company: "字节跳动",
    product: "火山方舟 Coding Plan",
    category: "国内大厂",
    links: {
      official: "https://www.volcengine.com/activity/codingplan",
      affiliate: "https://volcengine.com/L/htePBo7G28s/",
    },
    logo: { src: "/logos/volcengine.png", alt: "火山引擎" },
    models: ["Doubao-Seed-2.0-Code", "Doubao-Seed-Code", "Kimi-K2.5", "Kimi-K2", "GLM-4.7", "DeepSeek-V3.2"],
    tiers: [
      {
        name: "Lite",
        price: 40,
        firstMonthPrice: 8.9,
        period: "月",
        limit5h: "~1,200 次",
        limitWeek: "9,000 次",
        limitMonth: "18,000 次",
        limit5hCount: 1200,
        limitWeekCount: 9000,
        limitMonthCount: 18000,
        notes: "新用户首购每日10:30限量开放；邀请码 RZ3TQMRE",
      },
      {
        name: "Pro",
        price: 200,
        firstMonthPrice: 44.91,
        period: "月",
        limit5h: "~6,000 次",
        limitWeek: "45,000 次",
        limitMonth: "90,000 次",
        limit5hCount: 6000,
        limitWeekCount: 45000,
        limitMonthCount: 90000,
        notes: "支持Auto模式智能调度；邀请码 RZ3TQMRE",
      },
    ],
    billingUnit: "API请求",
    tools: ["Claude Code", "Cursor", "Cline", "Codex CLI", "Kilo Code", "Roo Code", "OpenCode", "Moltbot"],
    toolCount: 11,
    tags: ["多模型", "Auto模式", "首月优惠"],
  },
  {
    id: "huawei",
    company: "华为云",
    product: "CodeArts 码道",
    category: "国内大厂",
    links: { official: "https://www.huaweicloud.com/product/codearts/ai.html" },
    logo: { src: "/logos/huawei.png", alt: "华为云" },
    models: ["盘古", "多模型接入"],
    tiers: [
      {
        name: "个人版（公测）",
        price: 0,
        period: "月",
        limit5h: "公测免费",
        notes: "公测版临时免费（后续可能调整）",
      },
    ],
    billingUnit: "按量计费",
    tools: ["CodeArts IDE", "VS Code", "主流开发工具"],
    toolCount: 5,
    tags: ["公测免费", "临时", "码道", "盘古"],
  },
  {
    id: "glm",
    company: "智谱AI",
    product: "GLM Coding Plan",
    category: "其他",
    links: {
      official: "https://www.bigmodel.cn/glm-coding",
      affiliate: "https://www.bigmodel.cn/glm-coding?ic=R8RQ6LQCRJ",
    },
    logo: { src: "/logos/bigmodel.png", alt: "智谱AI" },
    models: ["GLM-5.1", "GLM-5-Turbo", "GLM-4.7", "GLM-4.6", "GLM-4.5-Air", "GLM-5（Max/Pro）"],
    tiers: [
      {
        name: "Lite",
        price: 49,
        period: "月",
        limit5h: "~80 次对话",
        limitWeek: "~400 次对话",
        notes: "MCP 100次/月；基础模型全支持",
      },
      {
        name: "Pro",
        price: 149,
        period: "月",
        limit5h: "~400 次对话",
        limitWeek: "~2,000 次对话",
        notes: "MCP 1,000次/月；含 GLM-5",
      },
      {
        name: "Max",
        price: 469,
        period: "月",
        limit5h: "~1,600 次对话",
        limitWeek: "~8,000 次对话",
        notes: "MCP 4,000次/月，高峰优先；含 GLM-5",
      },
    ],
    billingUnit: "请求次数",
    tools: ["Claude Code", "Roo Code", "Kilo Code", "Cline", "OpenCode", "Cursor", "CodeGeeX"],
    toolCount: 20,
    tags: ["自研模型", "MCP工具"],
    yearlyPrice: 411,  // Lite年费 ¥411 (7折)
    quarterlyPrice: 132, // Lite季费 ¥132 (9折)
  },
  {
    id: "kimi",
    company: "月之暗面",
    product: "Kimi Code Plan",
    category: "其他",
    links: { official: "https://www.kimi.com/membership/pricing" },
    logo: { src: "/logos/kimi.png", alt: "Kimi" },
    models: ["Kimi K2.5"],
    tiers: [
      {
        name: "Andante",
        price: 49,
        period: "月",
        limit5h: "300-1,200 次",
        limitMonth: "4M token",
        notes: "额度每7天滚动刷新（以订阅日为起点）, 最大并发30, 年付¥468(¥39/月)",
      },
      {
        name: "Moderato",
        price: 99,
        period: "月",
        limit5h: "Andante×4",
        limitMonth: "16M token",
        notes: "多设备登录, 额度每7天滚动刷新（以订阅日为起点）, 年付¥948(¥79/月)",
      },
      {
        name: "Allegretto",
        price: 199,
        period: "月",
        limit5h: "Andante×20",
        limitMonth: "80M token",
        notes: "额度每7天滚动刷新（以订阅日为起点）",
      },
      {
        name: "Allegro",
        price: 699,
        period: "月",
        limit5h: "Andante×60",
        limitMonth: "240M token",
        notes: "高端套餐, 额度每7天滚动刷新（以订阅日为起点）",
      },
    ],
    billingUnit: "Token",
    tools: ["Kimi Code CLI", "Kimi Code for VS Code", "Claude Code", "Roo Code"],
    toolCount: 4,
    tags: ["256K上下文", "含会员权益", "7天滚动刷新", "仅K2.5"],
    yearlyPrice: 468, // Andante年付价格
  },
  {
    id: "minimax",
    company: "MiniMax",
    product: "MiniMax Token Plan",
    category: "其他",
    links: {
      official: "https://platform.minimaxi.com/subscribe/token-plan",
      affiliate: "https://platform.minimaxi.com/subscribe/token-plan?code=uQkm#YTxQ#SGio4O&source=link",
    },
    logo: { src: "/logos/minimax.png", alt: "MiniMax" },
    models: ["MiniMax-M2.7", "MiniMax-M2.7-highspeed", "MiniMax-M2.5", "MiniMax-M2.1", "MiniMax-M2"],
    tiers: [
      {
        name: "Starter",
        price: 29,
        period: "月",
        limit5h: "600 次对话",
        limit5hCount: 600,
        notes: "年付¥290（省2月）",
      },
      {
        name: "Plus",
        price: 49,
        period: "月",
        limit5h: "1,500 次对话",
        limit5hCount: 1500,
        notes: "年付¥490（省2月）",
      },
      {
        name: "Max",
        price: 119,
        period: "月",
        limit5h: "4,500 次对话",
        limit5hCount: 4500,
        notes: "年付¥1,190（省2月）",
      },
      {
        name: "Plus-极速版",
        price: 98,
        period: "月",
        limit5h: "1,500 次对话",
        limit5hCount: 1500,
        notes: "M2.7-highspeed；年付¥980（省2月）",
      },
      {
        name: "Max-极速版",
        price: 199,
        period: "月",
        limit5h: "4,500 次对话",
        limit5hCount: 4500,
        notes: "M2.7-highspeed；年付¥1,990（省2月）",
      },
      {
        name: "Ultra-极速版",
        price: 899,
        period: "月",
        limit5h: "30,000 次对话",
        limit5hCount: 30000,
        notes: "M2.7-highspeed；年付¥8,990（省2月）",
      },
    ],
    billingUnit: "请求次数",
    tools: ["Claude Code", "Roo Code", "Kilo Code", "Cline", "Codex CLI", "OpenCode", "Droid", "TRAE", "Grok CLI", "Cursor"],
    toolCount: 10,
    tags: ["Token Plan", "M2.7", "100+ TPS"],
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
    product: "腾讯云 Coding Plan",
    category: "其他",
    links: { official: "https://cloud.tencent.com/act/pro/codingplan" },
    logo: { src: "/logos/tencentcloud.png", alt: "腾讯云" },
    models: ["Tencent HY 2.0", "GLM-5", "Kimi-K2.5", "MiniMax-M2.5"],
    tiers: [
      {
        name: "Lite",
        price: 40,
        firstMonthPrice: 7.9,
        secondMonthPrice: 20,
        period: "月",
        limit5h: "~1,200 次",
        limitWeek: "~9,000 次",
        limitMonth: "~18,000 次",
        limit5hCount: 1200,
        limitWeekCount: 9000,
        limitMonthCount: 18000,
        notes: "次月起¥40/月, 活动至2026.4.19",
      },
      {
        name: "Pro",
        price: 200,
        firstMonthPrice: 39.9,
        secondMonthPrice: 100,
        period: "月",
        limit5h: "~6,000 次",
        limitWeek: "~45,000 次",
        limitMonth: "~90,000 次",
        limit5hCount: 6000,
        limitWeekCount: 45000,
        limitMonthCount: 90000,
        notes: "次月起¥200/月, 活动至2026.4.19",
      },
    ],
    billingUnit: "API请求",
    tools: ["OpenClaw", "Codebuddy", "Claude Code", "Cline", "Cursor"],
    toolCount: 5,
    tags: ["多模型", "首月优惠", "次月半价"],
  },
  {
    id: "jdcloud",
    company: "京东云",
    product: "JoyBuilder Coding Plan",
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
        firstMonthPrice: 7.9,
        period: "月",
        limit5h: "~1,200 次",
        limitWeek: "~9,000 次",
        limitMonth: "~18,000 次",
        limit5hCount: 1200,
        limitWeekCount: 9000,
        limitMonthCount: 18000,
        notes:
          "新客首月7.9元；每次提问可能触发多次模型调用，实际消耗与项目复杂度/是否开启深度思考有关（以控制台为准）",
      },
      {
        name: "Pro",
        price: 200,
        firstMonthPrice: 39.9,
        period: "月",
        limit5h: "~6,000 次",
        limitWeek: "~45,000 次",
        limitMonth: "~90,000 次",
        limit5hCount: 6000,
        limitWeekCount: 45000,
        limitMonthCount: 90000,
        notes: "Lite 用量的 5 倍；新客首月39.9元（以控制台活动页面为准）",
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
        limit5h: "与 Lite 相当",
        isFirstMonthOnly: true,
        notes: "30天免费体验",
      },
      {
        name: "Lite（季付）",
        price: 120,
        period: "季",
        limit5h: "Claude Pro 3倍用量",
        notes: "月均¥40",
      },
      {
        name: "Pro（季付）",
        price: 600,
        period: "季",
        limit5h: "Lite 5倍",
        notes: "月均¥200",
      },
      {
        name: "Max（季付）",
        price: 1200,
        period: "季",
        limit5h: "Pro 4倍, 峰值优先",
        notes: "月均¥400",
      },
    ],
    billingUnit: "API请求",
    tools: ["Claude Code"],
    toolCount: 1,
    tags: ["季度付费", "免费体验"],
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
        notes: "首月优惠仅限1次；限时特惠期：2026-01-05~2026-03-22",
      },
      {
        name: "Starter",
        price: 70,
        firstMonthPrice: 48,
        secondMonthPrice: 70,
        period: "月",
        limit5h: "100 次对话",
        notes: "首月优惠仅限1次；限时特惠期：2026-01-05~2026-03-22",
      },
      {
        name: "Pro",
        price: 140,
        firstMonthPrice: 96,
        secondMonthPrice: 140,
        period: "月",
        limit5h: "300 次对话",
        notes: "首月优惠仅限1次；限时特惠期：2026-01-05~2026-03-22",
      },
      {
        name: "Max",
        price: 350,
        firstMonthPrice: 240,
        secondMonthPrice: 350,
        period: "月",
        limit5h: "1,000 次对话",
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
    product: "优云智算 Coding Plan",
    category: "其他",
    links: {
      official: "https://www.compshare.cn/coding-plan",
      affiliate: "https://passport.compshare.cn/register?referral_code=7KuMSzfdofaEKUvaTYql35",
    },
    logo: { src: "/logos/ucloud.png", alt: "UCloud" },
    models: [
      "MiniMax-M2.1", "MiniMax-M2.5",
      "claude-haiku-4-5", "claude-sonnet-4-5", "claude-sonnet-4-6", "claude-opus-4-5", "claude-opus-4-6",
      "DeepSeek-V3.2",
      "gpt-5.1", "gpt-5.1-codex-mini", "gpt-5.1-codex-max", "gpt-5.2", "gpt-5.2-codex", "gpt-5.3-codex", "gpt-5.4",
      "Kimi-K2.5", "GLM-5",
    ],
    tiers: [
      {
        name: "超值体验包",
        price: 6.9,
        firstMonthPrice: 6.9,
        period: "包",
        limit5h: "2900万积分",
        isFirstMonthOnly: true,
        notes: "新人专享；面向模型体验及个人日常使用；按量计费，有效期30天（限购一份）",
      },
      {
        name: "标准按量包 Lite",
        price: 19.9,
        period: "包",
        limit5h: "5900万积分",
        notes: "面向个人日常使用；按量计费，有效期180天",
      },
      {
        name: "标准按量包 Plus",
        price: 199,
        period: "包",
        limit5h: "5.9亿积分",
        notes: "面向管理轻量级工作负载的入门级开发人员；按量计费，有效期180天",
      },
      {
        name: "包月畅享包 Lite",
        price: 49.9,
        period: "月",
        limit5h: "每日700万积分",
        limitMonth: "约2.1亿积分",
        notes: "面向日常低频使用；包月，有效期30天；每日0点刷新额度",
      },
      {
        name: "包月畅享包 Plus",
        price: 199,
        period: "月",
        limit5h: "每日2800万积分",
        limitMonth: "约8.4亿积分",
        notes: "面向管理轻量级工作负载的入门级开发人员；包月，有效期30天；每日0点刷新额度",
      },
      {
        name: "包月畅享包 Pro",
        price: 499,
        period: "月",
        limit5h: "每日7000万积分",
        limitMonth: "约21亿积分",
        notes: "面向管理复杂工作负载的专业开发人员；包月，有效期30天；每日0点刷新额度",
      },
    ],
    billingUnit: "按量计费",
    tools: ["Claude Code", "OpenClaw", "主流编程工具兼容"],
    toolCount: 5,
    tags: ["最低价", "积分制", "多模型", "按量+包月", "新人专享"],
  },
  {
    id: "xfyun",
    company: "科大讯飞",
    product: "讯飞星辰 Astron Coding Plan",
    category: "国内大厂",
    links: { official: "https://www.xfyun.cn/doc/spark/CodingPlan.html" },
    logo: { src: "/logos/xfyun.png", alt: "讯飞星辰" },
    models: ["Spark X2", "GLM-5", "MiniMax-M2.5", "Kimi-K2.5", "DeepSeek-V3.2", "GLM-4.7-Flash"],
    tiers: [
      {
        name: "入门版",
        price: 19,
        firstMonthPrice: 3.9,
        secondMonthPrice: 19,
        period: "月",
        limit5h: "20M token/天",
        notes: "QPS：20；支持 DeepSeek-V3.2 / GLM-4.7-Flash",
      },
      {
        name: "专业版",
        price: 39,
        firstMonthPrice: 7.9,
        secondMonthPrice: 39,
        period: "月",
        limit5h: "10M token/天",
        notes: "QPS：5；支持 Spark X2 / GLM-5 / MiniMax / Kimi / DeepSeek / GLM-4.7-Flash",
      },
      {
        name: "高效版",
        price: 199,
        firstMonthPrice: 39.9,
        secondMonthPrice: 199,
        period: "月",
        limit5h: "50M token/天",
        notes: "QPS：20；支持 Spark X2 / GLM-5 / MiniMax / Kimi / DeepSeek / GLM-4.7-Flash",
      },
    ],
    billingUnit: "Token",
    tools: ["Claude Code", "Cline", "Cursor", "OpenClaw"],
    toolCount: 4,
    tags: ["首购特惠", "Token计量", "多模型"],
  },
  {
    id: "cucloud",
    company: "联通云",
    product: "Coding Plan",
    category: "国内大厂",
    links: { official: "https://www.cucloud.cn/activity/kickoffseason.html" },
    logo: { src: "/logos/cucloud.png", alt: "联通云" },
    models: ["GLM-5", "MiniMax-M2.5", "Qwen3.5", "DeepSeek-V3.x"],
    tiers: [
      {
        name: "Lite",
        price: 40,
        firstMonthPrice: 0,
        period: "月",
        limit5h: "18,000 次",
        limitMonth: "18,000 次",
        limitMonthCount: 18000,
        notes: "公测限量免费",
      },
      {
        name: "Pro",
        price: 200,
        firstMonthPrice: 0,
        period: "月",
        limit5h: "90,000 次",
        limitMonth: "90,000 次",
        limitMonthCount: 90000,
        notes: "公测限量免费",
      },
    ],
    billingUnit: "API请求",
    tools: ["Claude Code", "Cursor", "主流编程工具"],
    toolCount: 5,
    tags: ["公测免费", "多模型"],
  },
]
