import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return ["/verify-email", "/reset-password"].map(source => ({ source, headers: [{ key: "Referrer-Policy", value: "no-referrer" }] }));
  },
  outputFileTracingIncludes: { "/*": ["./messages/**/*.json", "./app/og-font-semibold.woff"] },
  images: {
    // next/image 최적화 품질 허용값 (기본 75 + 랜딩 이미지용 100)
    qualities: [75, 100],
  },
};

export default nextConfig;
