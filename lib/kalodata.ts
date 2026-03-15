/**
 * Kalodata Intelligence Client
 *
 * Integrates with Kalodata's API to research trending TikTok Shop products,
 * extract winning video patterns, and generate actionable ad intelligence.
 *
 * Kalodata API docs: https://kalodata.com/account/api
 */

import type {
  KalodataProduct,
  KalodataVideo,
  KalodataSearchParams,
  ProductIntelligence,
  AdAngle,
  CreativeBrief,
} from './types'

const BASE_URL = process.env.KALODATA_BASE_URL ?? 'https://api.kalodata.com/v1'
const API_KEY  = process.env.KALODATA_API_KEY ?? ''

// ─── Category CPA benchmarks (USD) ──────────────────────
// Based on Meta industry averages for e-commerce verticals
const CATEGORY_CPA_BENCHMARKS: Record<string, number> = {
  beauty:        18,
  skincare:      22,
  haircare:      20,
  fashion:       25,
  accessories:   15,
  electronics:   35,
  fitness:       28,
  home:          30,
  kitchen:       24,
  pets:          22,
  toys:          20,
  health:        32,
  default:       25,
}

// ─── HTTP Client ─────────────────────────────────────────

async function kalodataFetch<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  if (!API_KEY) {
    throw new Error('KALODATA_API_KEY is not set. Add it to your .env file.')
  }

  const url = new URL(`${BASE_URL}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'InboxPilot/1.0',
    },
    // Next.js fetch caching — revalidate every 30 min
    next: { revalidate: 1800 },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Kalodata API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

// ─── Product Research ────────────────────────────────────

interface KalodataProductsResponse {
  data: KalodataProduct[]
  total: number
  page: number
  limit: number
}

/**
 * Fetch trending products from TikTok Shop via Kalodata.
 * Applies category, revenue, and growth filters.
 */
export async function searchTrendingProducts(
  params: KalodataSearchParams = {},
): Promise<KalodataProduct[]> {
  const queryParams: Record<string, string | number> = {
    page:  params.page  ?? 1,
    limit: params.limit ?? 50,
    sort:  params.sortBy ?? 'revenue',
  }

  if (params.category)       queryParams.category = params.category
  if (params.minRevenue30d)  queryParams.min_revenue_30d = params.minRevenue30d
  if (params.minSoldCount30d) queryParams.min_sold_30d = params.minSoldCount30d
  if (params.minGrowthRate)  queryParams.min_growth_rate = params.minGrowthRate
  if (params.maxPrice)       queryParams.max_price = params.maxPrice
  if (params.minPrice)       queryParams.min_price = params.minPrice

  const response = await kalodataFetch<KalodataProductsResponse>(
    '/products/trending',
    queryParams,
  )

  return response.data
}

/**
 * Get detailed product data including top video IDs and hooks.
 */
export async function getProductDetail(productId: string): Promise<KalodataProduct> {
  return kalodataFetch<KalodataProduct>(`/products/${productId}`)
}

/**
 * Get the top-performing videos for a specific product.
 * These are used to extract hooks and creative patterns — NOT downloaded.
 */
export async function getProductVideos(
  productId: string,
  limit = 10,
): Promise<KalodataVideo[]> {
  interface VideoResponse { data: KalodataVideo[] }
  const response = await kalodataFetch<VideoResponse>(`/products/${productId}/videos`, {
    limit,
    sort: 'revenue',
  })
  return response.data
}

// ─── Intelligence Layer ──────────────────────────────────

/**
 * Estimate the landed cost of a product based on Kalodata price and category.
 * This is an approximation: typically ~30-40% of sell price for dropship.
 */
function estimateLandedCost(product: KalodataProduct): number {
  // Suppliers typically price at 35-45% of the TikTok retail price
  const costRatio = product.category === 'electronics' ? 0.55 : 0.38
  return parseFloat((product.price * costRatio).toFixed(2))
}

/**
 * Calculate the recommended Shopify sell price with healthy margins.
 * Target: 65%+ gross margin after Meta ad spend.
 */
function recommendSellPrice(product: KalodataProduct, landedCost: number): number {
  // At least 2.8x markup for ad-supported products
  const markup = product.price < 20 ? 3.2 : 2.8
  const price = landedCost * markup

  // Round to .99 pricing psychology
  return parseFloat((Math.ceil(price) - 0.01).toFixed(2))
}

/**
 * Calculate a 0-100 viability score for the product.
 */
function calcViabilityScore(p: KalodataProduct, grossMargin: number, netMargin: number): number {
  let score = 0

  // Gross margin: 25pts max
  score += Math.min(25, grossMargin * 0.4)

  // Net margin: 25pts max
  score += Math.min(25, Math.max(0, netMargin) * 0.5)

  // Growth rate: 20pts max
  score += Math.min(20, p.revenueGrowthRate * 100)

  // Revenue size (validates market): 15pts max
  if (p.revenue30d > 1_000_000) score += 15
  else if (p.revenue30d > 500_000) score += 12
  else if (p.revenue30d > 100_000) score += 8
  else score += 4

  // Competition (fewer shops = less saturated): 15pts max
  if (p.shopCount < 5)   score += 15
  else if (p.shopCount < 20) score += 10
  else if (p.shopCount < 50) score += 5

  return Math.min(100, Math.round(score))
}

/**
 * Classify an opportunity based on growth rate, shop count, and margins.
 */
function classifyOpportunity(
  p: KalodataProduct,
  score: number,
): ProductIntelligence['opportunity'] {
  if (p.revenueGrowthRate > 0.3 && p.shopCount < 10) return 'hot'
  if (p.revenueGrowthRate > 0.1 && score > 60)       return 'rising'
  if (p.shopCount > 100)                              return 'saturated'
  return 'watch'
}

/**
 * Generate ad angles from product data and winning video hooks.
 * These become the creative briefs for UGC creators or your own ads.
 */
function generateAdAngles(product: KalodataProduct): AdAngle[] {
  const angles: AdAngle[] = []

  // Use real hooks from top-performing videos when available
  const hooks = product.winningHooks.length > 0
    ? product.winningHooks
    : [`This ${product.title} changed everything`, `POV: You finally found it`]

  // Problem/Solution angle
  angles.push({
    hook: hooks[0] ?? `Stop wasting money on products that don't work`,
    painPoint: `Struggling to find a reliable ${product.subcategory} solution`,
    solution: `${product.title} — ${product.soldCount30d.toLocaleString()} sold in 30 days`,
    cta: 'Shop Now — Limited Stock',
    format: 'problem_solution',
  })

  // Social proof angle
  angles.push({
    hook: hooks[1] ?? `${product.soldCount30d.toLocaleString()} people can't be wrong`,
    painPoint: `Skeptical about ${product.subcategory} products online?`,
    solution: `Real results, real customers. See why ${product.soldCount30d.toLocaleString()} bought this month.`,
    cta: 'See Reviews',
    format: 'social_proof',
  })

  // Demo/UGC angle
  angles.push({
    hook: hooks[2] ?? `Watch this before you buy any ${product.subcategory}`,
    painPoint: `Don't know which ${product.subcategory} to trust`,
    solution: `Honest demo: We tested ${product.title} so you don't have to`,
    cta: 'Get Yours',
    format: 'ugc_review',
  })

  return angles
}

/**
 * Generate a creative brief for UGC creators based on product intelligence.
 * This is the RIGHT way to get winning ad content — brief real creators
 * using the angles that are already proven to convert.
 */
function generateCreativeBrief(
  product: KalodataProduct,
  angles: AdAngle[],
): CreativeBrief {
  return {
    productTitle: product.title,
    targetAudience: deriveAudience(product.category),
    primaryPainPoint: angles[0].painPoint,
    keyBenefits: [
      `${product.soldCount30d.toLocaleString()} units sold in the last 30 days`,
      `${(product.avgEngagementRate * 100).toFixed(1)}% average engagement on product videos`,
      `Trending in ${product.category} — growing ${(product.revenueGrowthRate * 100).toFixed(0)}% month-over-month`,
    ],
    winningHooks: product.winningHooks.slice(0, 5),
    toneOfVoice: 'Authentic, conversational, relatable — NOT salesy. Talk like a friend recommending something.',
    callToAction: 'Shop Now — link in bio / swipe up',
    doList: [
      'Film in natural light, authentic setting (bedroom, bathroom, kitchen)',
      'Show the product being USED, not just held',
      'State the hook in the first 2 seconds — no intros',
      'Include a surprise or unexpected result',
      'End with clear CTA and urgency (stock running out, sale ending)',
    ],
    dontList: [
      'DON\'T use copyrighted music — use TikTok/Instagram Reels licensed audio only',
      'DON\'T make claims you can\'t prove (medical, weight loss without disclosure)',
      'DON\'T include competitor brand names',
      'DON\'T use heavy filters that make the product look different than reality',
      'DON\'T add text overlays that cover the product in use',
    ],
    exampleScripts: angles.map((a) =>
      `[HOOK - 2s] "${a.hook}"\n[PROBLEM - 5s] "${a.painPoint}"\n[SOLUTION - 10s] "${a.solution}"\n[CTA - 3s] "${a.cta}"`,
    ),
    visualDirections: [
      'Unboxing: Clean surface, good lighting, satisfying reveal',
      'Before/After: Same angle, same lighting for maximum impact',
      'Close-up texture/detail shots for credibility',
      'Lifestyle shot showing the transformation or result',
    ],
  }
}

function deriveAudience(category: string): string {
  const audiences: Record<string, string> = {
    beauty:      'Women 18-44 interested in skincare, beauty routines, and self-care',
    skincare:    'Women 25-44 interested in anti-aging, skin health, and clean beauty',
    fashion:     'Women 18-35 interested in style, trends, and affordable fashion',
    electronics: 'Men and women 25-45 interested in tech gadgets and productivity',
    fitness:     'Men and women 22-40 interested in working out, health, and wellness',
    home:        'Homeowners 28-50 interested in home improvement and organization',
    kitchen:     'Adults 25-55 interested in cooking, meal prep, and kitchen gadgets',
    pets:        'Pet owners 25-50 who treat their pets like family',
    default:     'Adults 25-45 with disposable income and online shopping habits',
  }
  return audiences[category.toLowerCase()] ?? audiences.default
}

// ─── Main Export: Analyze Products ──────────────────────

/**
 * Takes raw Kalodata products and enriches them with margin analysis,
 * viability scores, ad angles, and creative briefs.
 *
 * This is the "intelligence layer" — turns raw data into actionable strategy.
 */
export async function analyzeProducts(
  products: KalodataProduct[],
): Promise<ProductIntelligence[]> {
  return products.map((product) => {
    const landedCost      = estimateLandedCost(product)
    const sellPrice       = recommendSellPrice(product, landedCost)
    const grossMarginPct  = ((sellPrice - landedCost) / sellPrice) * 100
    const category        = product.category.toLowerCase()
    const estimatedCPA    = CATEGORY_CPA_BENCHMARKS[category] ?? CATEGORY_CPA_BENCHMARKS.default
    const netMarginPct    = ((sellPrice - landedCost - estimatedCPA) / sellPrice) * 100
    const viabilityScore  = calcViabilityScore(product, grossMarginPct, netMarginPct)
    const opportunity     = classifyOpportunity(product, viabilityScore)
    const adAngles        = generateAdAngles(product)
    const creativeBrief   = generateCreativeBrief(product, adAngles)

    return {
      ...product,
      estimatedLandedCost:    landedCost,
      recommendedSellPrice:   sellPrice,
      grossMarginPct:         parseFloat(grossMarginPct.toFixed(1)),
      estimatedCPA,
      netMarginPct:           parseFloat(netMarginPct.toFixed(1)),
      viabilityScore,
      opportunity,
      adAngles,
      creativeBrief,
    }
  })
}

/**
 * Filter products by viability thresholds.
 */
export function filterViableProducts(
  products: ProductIntelligence[],
  opts: {
    minGrossMargin?: number
    minNetMargin?: number
    minViabilityScore?: number
    excludeOpportunities?: Array<ProductIntelligence['opportunity']>
  } = {},
): ProductIntelligence[] {
  const {
    minGrossMargin    = 60,
    minNetMargin      = 15,
    minViabilityScore = 50,
    excludeOpportunities = ['saturated'],
  } = opts

  return products.filter((p) => {
    if (p.grossMarginPct < minGrossMargin)                      return false
    if (p.netMarginPct < minNetMargin)                          return false
    if (p.viabilityScore < minViabilityScore)                   return false
    if (excludeOpportunities.includes(p.opportunity))           return false
    if (p.seller.fulfillmentDays > 7)                           return false
    return true
  })
}
