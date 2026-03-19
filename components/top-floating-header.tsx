"use client"

import Link from "next/link"

export function TopFloatingHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo - normal text link, no floating container */}
        <Link
          href="/"
          className="text-base font-semibold text-foreground hover:text-foreground/80 transition-colors"
        >
          国内 Coding Plan 性价比排行
        </Link>

        <nav aria-label="主导航" className="flex items-center gap-2">
          <a
            href="#faq"
            className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            说明
          </a>
        </nav>
      </div>
    </header>
  )
}
