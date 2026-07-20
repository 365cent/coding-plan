import type { Metadata } from "next"
import { PingContent } from "./ping-content"

export const metadata: Metadata = {
  title: "AI Coding Plan API 测速",
  description: "基于浏览器 HTTP 请求时延测量国内与海外各大平台 AI API 的连接延迟。网络连通性和初步响应速度仅作参考，不完全代表模型输出速度。",
  keywords: "大模型 API, AI 测速, HTTP 延迟, TTFT, Token 速度, 百炼, 火山方舟, 智谱, Kimi, 腾讯云",
  alternates: { canonical: "/ping" },
}

export default function PingPage() {
  return <PingContent />
}
