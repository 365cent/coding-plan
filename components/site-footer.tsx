export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-12 py-6 px-6 text-center space-y-1.5 bg-background">
      <p className="text-xs text-muted-foreground">
        数据来源于各平台官网及社区整理，仅供参考。购买前请前往官网确认最新套餐详情。
      </p>
      <p className="text-[11px] text-muted-foreground/70">
        <span>&copy;</span> {new Date().getFullYear()} <a href=" " className="text-primary hover:underline font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm">MCP Planet</a>
      </p>
    </footer>
  )
}
