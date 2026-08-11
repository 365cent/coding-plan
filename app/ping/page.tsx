import type { Metadata } from "next"
import { PingContent } from "./ping-content"

export const metadata: Metadata = {
  title: "AI Coding Plan API 测速",
  description: "在线测试国内外 AI 大模型 API 接口延迟：覆盖阿里云百炼、火山方舟、腾讯云、智谱、Kimi、MiniMax 等 24 个国内与海外平台接口，浏览器免登录一键测速，实时展示平均延迟、最快响应、抖动与连通率。结果反映网络连通性与初步响应速度，可供选购 AI Coding Plan 参考，不代表模型实际生成速度。",
  keywords: "大模型 API, AI 测速, HTTP 延迟, TTFT, Token 速度, 百炼, 火山方舟, 智谱, Kimi, 腾讯云",
  alternates: { canonical: "/ping" },
}

export default function PingPage() {
  return <PingContent />
}
