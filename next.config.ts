import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // next/image 최적화 품질 허용값 (기본 75 + 랜딩 이미지용 100)
    qualities: [75, 100],
  },
};

export default nextConfig;
