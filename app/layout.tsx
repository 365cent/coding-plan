import type { Metadata, Viewport } from "next"
import Script from "next/script"
import "./globals.css"
import { FAQPageJsonLd, ItemListJsonLd, WebSiteJsonLd } from "@/components/json-ld"
import { plans } from "@/lib/plans-data"
import { getMetadataBase } from "@/lib/site-origin"
import { TopFloatingHeader } from "@/components/top-floating-header"
import { SiteFooter } from "@/components/site-footer"

const siteName = "国内Coding Plan对比"
const titleDefault = "国内 Coding Plan 性价比排行 2026 | 价格·模型·用量对比"
const titleTemplate = "%s | Coding Plan 对比"
const description =
  "2026年最新国内AI编程套餐全面横评：阿里云百炼、字节火山方舟、智谱GLM、Kimi、MiniMax等平台价格、模型、用量限制、每元请求数一键对比，助你选出最划算AI Coding Plan。"

const metadataBase = getMetadataBase()

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  title: {
    default: titleDefault,
    template: titleTemplate,
  },
  description,
  keywords: [
    "AI Coding Plan",
    "国内AI编程套餐",
    "Coding Plan对比",
    "Claude Code替代",
    "百炼Coding Plan",
    "火山方舟Coding Plan",
    "GLM Coding Plan",
    "Kimi Code Plan",
    "MiniMax Token Plan",
    "Step Plan",
    "阶跃星辰",
    "AI编程工具价格",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "国内 Coding Plan 性价比排行 2026",
    description: "13+家平台价格·模型·用量全面对比，找出最划算的国内AI编程套餐",
    url: "/",
    siteName,
    locale: "zh_CN",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "国内 Coding Plan 性价比排行" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "国内 Coding Plan 性价比排行 2026",
    description: "13+家平台价格·模型·用量全面对比",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#252525" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
        >
          跳到主要内容
        </a>
        <Script
          defer
          data-domain="coding.mcppla.net"
          src="/script.js"
          strategy="afterInteractive"
        />
        <WebSiteJsonLd />
        <ItemListJsonLd plans={plans} />
        <FAQPageJsonLd />
        <TopFloatingHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
