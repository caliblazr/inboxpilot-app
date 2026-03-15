/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: [
      'cdn.shopify.com',
      'kalodata.com',
      'p16-sign-va.tiktokcdn.com',
      'p77-sign-va.tiktokcdn.com',
      'graph.facebook.com',
    ],
  },
  env: {
    KALODATA_API_KEY: process.env.KALODATA_API_KEY,
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_ADMIN_TOKEN: process.env.SHOPIFY_ADMIN_TOKEN,
    META_APP_ID: process.env.META_APP_ID,
    META_APP_SECRET: process.env.META_APP_SECRET,
    META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
    META_AD_ACCOUNT_ID: process.env.META_AD_ACCOUNT_ID,
    META_PAGE_ID: process.env.META_PAGE_ID,
    META_INSTAGRAM_ACCOUNT_ID: process.env.META_INSTAGRAM_ACCOUNT_ID,
    META_PIXEL_ID: process.env.META_PIXEL_ID,
  },
}

module.exports = nextConfig
