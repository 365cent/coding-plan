import { plans } from "@/lib/plans-data"
import { Hero } from "@/components/hero"
import { StatsBar } from "@/components/stats-bar"
import { ClientShell } from "@/app/client-shell"
import { FaqSection } from "@/components/faq-section"
import { Notice } from "@/components/notice"

export default function Page() {
  return (
    <main id="main-content" aria-label="AI Coding Plan 对比列表" className="min-h-screen bg-background text-foreground">
      <Hero />
      <ClientShell plans={plans} />


      <StatsBar plans={plans} />

      <div className="max-w-7xl mx-auto px-6 pb-6 mt-2">
        <Notice>
          <p>
            各平台采用不同计量单位（API请求 vs 请求次数 vs Token），直接比较数字无意义。
            1次请求约等于15-20次API请求。5小时/周/月限额可能存在陷阱，例如5小时100次不等于一天500次，请以各平台官方最新公告为准。
            更多详情请查看下方的 <a href="#faq" className="text-primary hover:underline font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm">常见问题</a>。
          </p>
        </Notice>
      </div>

      <FaqSection />

      <section id="about" className="max-w-7xl mx-auto px-6 mt-8">
        <h2 className="text-base font-semibold mb-2">关于本站</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          本站持续更新国内主流AI Coding Plan（AI编程订阅套餐）的最新定价与功能变化，覆盖阿里云百炼、字节跳动火山方舟、京东云JoyBuilder、腾讯云、百度千帆、华为云、智谱AI、月之暗面Kimi、MiniMax、无问芯穹、摩尔线程、快手、UCloud、科大讯飞、联通云等平台。数据会随平台公告更新，购买前请以官网为准。
        </p>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          <strong>最后更新：</strong>{" "}
          <time dateTime={new Date().toISOString().split("T")[0]}>
            {new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
          </time>
        </p>
      </section>
    </main>
  )
}
