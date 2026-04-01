export type FaqItem = {
  q: string
  a: string
}

const defaultFaqItems: FaqItem[] = [
  {
    q: "国内哪家AI Coding Plan性价比最高？",
    a: "没有单一“最划算”。建议用续费价（标准价）做基准，再结合你的使用强度（5小时/周/月限额）和模型/工具需求选择；首月优惠只适合短期体验，不适合长期对比。",
  },
  {
    q: "API请求和请求次数有什么区别？",
    a: "不同平台口径不同。API请求通常更接近底层模型调用次数；请求次数更接近用户侧对话轮次。跨平台比较时应优先对齐计量单位，再比较价格与限额。",
  },
  {
    q: "国内Coding Plan支持Claude Code吗？",
    a: "不少平台通过OpenAI兼容接口或明确列出工具支持，从而可在Claude Code等客户端中使用。具体是否支持、如何配置，以各平台文档与控制台为准。",
  },
  {
    q: "5小时限额是什么意思？",
    a: "表示任意连续5小时窗口内的最大可用额度，用于衡量突发使用能力。注意它不等于“每天上限”，也不代表能线性折算到周/月。",
  },
  {
    q: "哪家平台模型选择最多？",
    a: "模型数量会随时间变化。通常大型平台与聚合型平台会提供更丰富的自研与第三方模型选择，建议以各平台当前模型列表为准。",
  },
  {
    q: "Token计费和按请求次数计费哪个划算？",
    a: "取决于场景：Token计费对长上下文更透明；按请求次数计费对高频短对话更直观。建议结合平均对话长度与调用频率评估。",
  },
]

export function FaqSection({ items = defaultFaqItems }: { items?: FaqItem[] }) {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="max-w-7xl mx-auto px-6 mt-10"
    >
      <h2 id="faq-heading" className="text-base font-semibold text-foreground mb-3 scroll-mt-24">
        常见问题
      </h2>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {items.map(({ q, a }) => (
          <details key={q} className="p-4 group">
            <summary className="cursor-pointer list-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md">
              <h3 className="text-sm font-medium text-foreground inline group-hover:text-primary transition-colors">{q}</h3>
            </summary>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-1">{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

