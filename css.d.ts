// Plain CSS side-effect imports (e.g. `import "./globals.css"`) have no type
// declarations in Next.js <= 16.1.6, which triggers TS2882 under TypeScript 6+.
// Mirrors the upstream fix in vercel/next.js#88199; remove once Next ships it.
declare module '*.css' {}
