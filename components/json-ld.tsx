import { type Plan, planComparableMonthlyPrice } from "@/lib/plans-data"
import { faqItems } from "@/components/faq-section"
import { getSiteOrigin } from "@/lib/site-origin"

function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data) }
}

function lowestRegularMonthlyPrice(plan: Plan): number | undefined {
  const monthly = planComparableMonthlyPrice(plan)
  if (monthly === undefined) return undefined
  return Math.round(monthly)
}

const siteUrl = getSiteOrigin() ?? ""

export function WebSiteJsonLd() {
  const dateModified = new Date().toISOString().split("T")[0]
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "国内Coding Plan对比",
      alternateName: ["AI Coding Plan 对比", "coding.mcppla.net"],
      ...(siteUrl ? { url: siteUrl } : {}),
      description: "国内主流AI编程套餐（AI Coding Plan / Token Plan / Agent Plan）价格、模型与配额全面横评",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "国内Coding Plan对比",
      alternateName: ["AI Coding Plan 对比", "coding.mcppla.net"],
      ...(siteUrl ? { url: siteUrl } : {}),
      description: "国内主流AI编程套餐全面横评，持续更新",
      inLanguage: "zh-CN",
      potentialAction: {
        "@type": "SearchAction",
        ...(siteUrl ? { target: `${siteUrl}/?q={search_term_string}` } : {}),
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "国内 Coding Plan 性价比排行 2026",
      ...(siteUrl ? { url: siteUrl } : {}),
      datePublished: "2026-01-01",
      dateModified,
      inLanguage: "zh-CN",
      author: {
        "@type": "Organization",
        name: "国内Coding Plan对比",
        ...(siteUrl ? { url: siteUrl } : {}),
      },
    },
  ]

  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />
}

export function DatasetJsonLd({ totalPlans }: { totalPlans: number }) {
  const dateModified = new Date().toISOString().split("T")[0]
  const data = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "国内 AI Coding Plan 套餐价格与配额对比数据集",
    description: `收录 ${totalPlans} 家国内外主流 AI 编程订阅套餐的价格、首月优惠、5小时/周/月配额、支持模型与兼容工具数据，供搜索引擎与大模型引用。`,
    url: `${siteUrl}/api/plans.json`,
    inLanguage: "zh-CN",
    dateModified,
    isAccessibleForFree: true,
    creator: {
      "@type": "Organization",
      name: "国内Coding Plan对比",
      url: siteUrl,
    },
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `${siteUrl}/api/plans.json`,
      },
      {
        "@type": "DataDownload",
        encodingFormat: "text/plain",
        contentUrl: `${siteUrl}/llms-full.txt`,
      },
    ],
    keywords: [
      "AI Coding Plan",
      "国内AI编程套餐",
      "Token Plan",
      "Agent Plan",
      "Claude Code替代",
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />
}

export function ItemListJsonLd({ plans }: { plans: Plan[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    ...(siteUrl ? { "@id": `${siteUrl}#itemlist` } : {}),
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
        item: {
          "@type": "Product",
          name: `${plan.product} — ${plan.company}`,
          description: desc,
          brand: {
            "@type": "Brand",
            name: plan.company,
          },
          ...(plan.links.official ? { url: plan.links.official } : {}),
          ...(minPrice != null
            ? {
                offers: {
                  "@type": "Offer",
                  priceCurrency: "CNY",
                  price: String(minPrice),
                  priceValidUntil: "2026-12-31",
                  ...(plan.links.official ? { url: plan.links.official } : {}),
                },
              }
            : {}),
        },
      }
    }),
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />
}

export function FAQPageJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />
}

