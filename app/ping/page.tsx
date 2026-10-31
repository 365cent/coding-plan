import type { Metadata } from "next"
import { PingContent } from "./ping-content"

const title = "AI Coding Plan API 测速"
const description =
  "在线测试国内外 AI 大模型 API 接口延迟：覆盖火山方舟、阿里云百炼、腾讯云、智谱、Kimi、MiniMax、中国电信天翼云、Unity团结引擎 等 23 个国内与海外平台接口，浏览器免登录一键测速，实时展示平均延迟、最快响应、抖动与连通率。结果反映网络连通性与初步响应速度，可供选购 AI Coding Plan 参考，不代表模型实际生成速度。"

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "大模型 API 测速",
    "AI Coding Plan 测速",
    "HTTP 延迟",
    "TTFT",
    "Token 速度",
    "火山方舟",
    "阿里云百炼",
    "腾讯云",
    "智谱 GLM",
    "Kimi",
    "MiniMax",
    "团结 Codely",
  ],
  alternates: { canonical: "/ping" },
  openGraph: {
    title: `${title} | 国内 Coding Plan 对比`,
    description,
    url: "/ping",
    siteName: "国内Coding Plan对比",
    locale: "zh_CN",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "AI Coding Plan API 测速" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | 国内 Coding Plan 对比`,
    description: "浏览器免登录一键测试 23 个国内外 AI Coding Plan 接口延迟、最快响应、抖动与连通率",
    images: ["/og-image.png"],
  },
}

export default function PingPage() {
  return <PingContent />
}
