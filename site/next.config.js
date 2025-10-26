/** @type {import('next').NextConfig} */
module.exports = {
  output: 'export',               // required for S3/CloudFront
  images: { unoptimized: true },  // no server image optimizer
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true } // optional: unblock CI if using TS
};
