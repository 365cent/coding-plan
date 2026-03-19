/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
