"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export function TopFloatingHeader() {
  const pathname = usePathname()
  const [hash, setHash] = useState("")

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash)
    syncHash()
    window.addEventListener("hashchange", syncHash)
    return () => window.removeEventListener("hashchange", syncHash)
  }, [])

  const navItemBase = "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
  const navItemInactive = "text-muted-foreground hover:text-foreground hover:bg-muted/60"
  const navItemActive = "bg-accent text-foreground"

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Logo - normal text link, no floating container */}
        <Link
          href="/"
          className="text-base font-semibold text-foreground hover:text-foreground/80 transition-colors"
        >
          国内 Coding Plan 性价比排行
        </Link>

        <nav aria-label="主导航" className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/"
            className={`${navItemBase} ${pathname === "/" && hash !== "#faq" ? navItemActive : navItemInactive}`}
          >
            套餐
          </Link>
          <Link
            href="/ping"
            className={`${navItemBase} ${pathname === "/ping" ? navItemActive : navItemInactive}`}
          >
            测速
          </Link>
          <Link
            href="#faq"
            className={`${navItemBase} ${pathname === "/" && hash === "#faq" ? navItemActive : navItemInactive}`}
          >
            说明
          </Link>
        </nav>
      </div>
    </header>
  )
}
