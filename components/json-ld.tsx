import type { Plan } from "@/lib/plans-data"

function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data) }
}

function lowestRegularMonthlyPrice(plan: Plan): number | undefined {
  const regular = plan.tiers.filter((t) => !t.isFirstMonthOnly)
  let best: number | undefined
  for (const t of regular) {
    const monthly = t.period === "季" ? t.price / 3 : t.period === "年" ? t.price / 12 : t.price
    if (!Number.isFinite(monthly)) continue
    if (best === undefined || monthly < best) best = monthly
  }
  if (best === undefined) return undefined
  return Math.round(best)
}

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

export function WebSiteJsonLd() {
  const dateModified = new Date().toISOString().split("T")[0]
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "国内Coding Plan对比",
      url: siteUrl,
      description: "国内主流AI编程套餐全面横评，持续更新",
      inLanguage: "zh-CN",
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "国内 Coding Plan 性价比排行 2026",
      url: siteUrl,
      datePublished: "2026-01-01",
      dateModified,
      inLanguage: "zh-CN",
      author: {
        "@type": "Organization",
        name: "国内Coding Plan对比",
      },
    },
  ]

  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />
}

export function ItemListJsonLd({ plans }: { plans: Plan[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}#itemlist`,
    name: "国内AI Coding Plan套餐对比列表",
    description: "2026年国内主流AI编程订阅套餐价格对比",
    numberOfItems: plans.length,
    itemListElement: plans.map((plan, idx) => {
      const minPrice = lowestRegularMonthlyPrice(plan)
      const models = plan.models.slice(0, 3).join("、")
      const desc = `${plan.company}的${plan.product}，支持${models}等模型，最低¥${minPrice ?? "—"}/月`
      return {
        "@type": "ListItem",
        position: idx + 1,
        name: `${plan.product} — ${plan.company}`,
        description: desc,
        url: plan.links.official,
        ...(minPrice != null
          ? {
              offers: {
                "@type": "Offer",
                priceCurrency: "CNY",
                price: String(minPrice),
                priceValidUntil: "2026-12-31",
              },
            }
          : {}),
      }
    }),
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />
}

export function FAQPageJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "国内哪家AI Coding Plan性价比最高？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "综合首月优惠期看，部分平台首月低价更划算；长期订阅则应以续费价和用量上限为准，选择适合自己使用频率与模型需求的套餐。",
        },
      },
      {
        "@type": "Question",
        name: "API请求和请求次数有什么区别？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "API请求通常指底层模型调用次数；请求次数更接近用户侧的对话轮次。不同平台口径不同，应以官方说明为准，不宜直接用“次数”做跨平台对比。",
        },
      },
      {
        "@type": "Question",
        name: "国内Coding Plan支持Claude Code吗？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "不少平台提供OpenAI兼容接口或在工具列表中明确支持Claude Code等客户端工具；具体支持范围与配置方式以各平台文档为准。",
        },
      },
      {
        "@type": "Question",
        name: "5小时限额是什么意思？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "表示任意连续5小时窗口内的使用上限，用于衡量突发使用能力。不同平台可能按对话轮次、请求或Token计量。",
        },
      },
      {
        "@type": "Question",
        name: "哪家平台模型选择最多？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "模型数量会随时间变化。通常大型平台会提供更丰富的自研与第三方模型选择，建议查看各平台当前模型列表与上新频率。",
        },
      },
      {
        "@type": "Question",
        name: "Token计费和按请求次数计费哪个划算？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "取决于场景：Token计费对长上下文更透明；按请求次数计费对高频短对话更直观。建议结合自己的对话长度与调用频率评估。",
        },
      },
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />
}

