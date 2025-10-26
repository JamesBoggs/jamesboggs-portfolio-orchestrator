/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',               // required for S3/CloudFront
  images: { unoptimized: true },  // no image optimizer on S3
  eslint: { ignoreDuringBuilds: true }
};
module.exports = nextConfig;
