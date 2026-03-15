// ─────────────────────────────────────────────────────────
// Kalodata Types
// ─────────────────────────────────────────────────────────

export interface KalodataProduct {
  id: string
  title: string
  category: string
  subcategory: string
  price: number
  currency: string
  /** Estimated sold units last 30 days */
  soldCount30d: number
  /** Gross revenue last 30 days (USD) */
  revenue30d: number
  /** Number of shops selling this product */
  shopCount: number
  /** Number of videos featuring this product */
  videoCount: number
  /** Revenue growth rate vs prior 30 days (0.15 = +15%) */
  revenueGrowthRate: number
  /** Main product image URL */
  imageUrl: string
  /** TikTok Shop product URL */
  productUrl: string
  /** Top-performing video IDs for this product */
  topVideoIds: string[]
  /** Winning hooks extracted from top videos */
  winningHooks: string[]
  /** Average video engagement rate */
  avgEngagementRate: number
  /** Commission rate offered to creators */
  commissionRate: number
  tags: string[]
  /** Supplier/seller info */
  seller: {
    id: string
    name: string
    rating: number
    fulfillmentDays: number
  }
}

export interface KalodataVideo {
  id: string
  productId: string
  creatorHandle: string
  creatorFollowers: number
  views: number
  likes: number
  shares: number
  comments: number
  /** Engagement rate (likes+comments+shares / views) */
  engagementRate: number
  /** Revenue attributed to this video */
  attributedRevenue: number
  /** GMV conversion rate */
  conversionRate: number
  /** Cover image URL */
  coverUrl: string
  /** Hook (first 3 seconds of script) */
  hook: string
  /** Full video script/transcript if available */
  transcript: string
  /** Video duration in seconds */
  duration: number
  publishedAt: string
}

export interface KalodataSearchParams {
  category?: string
  minRevenue30d?: number
  minSoldCount30d?: number
  minGrowthRate?: number
  maxPrice?: number
  minPrice?: number
  sortBy?: 'revenue' | 'growth' | 'sold_count' | 'video_count'
  page?: number
  limit?: number
}

// ─────────────────────────────────────────────────────────
// Product Intelligence (post-processing)
// ─────────────────────────────────────────────────────────

export interface ProductIntelligence extends KalodataProduct {
  /** Our estimated landed cost (product + shipping) */
  estimatedLandedCost: number
  /** Our recommended sell price */
  recommendedSellPrice: number
  /** Gross margin % */
  grossMarginPct: number
  /** Estimated ad cost to acquire one customer (based on category benchmarks) */
  estimatedCPA: number
  /** Net margin after ads */
  netMarginPct: number
  /** Viability score 0-100 */
  viabilityScore: number
  /** Opportunity flag */
  opportunity: 'hot' | 'rising' | 'saturated' | 'watch'
  /** Generated winning angles for ad copy */
  adAngles: AdAngle[]
  /** Creative brief for UGC creators */
  creativeBrief: CreativeBrief
}

export interface AdAngle {
  hook: string
  painPoint: string
  solution: string
  cta: string
  format: 'before_after' | 'problem_solution' | 'social_proof' | 'ugc_review' | 'demo'
}

export interface CreativeBrief {
  productTitle: string
  targetAudience: string
  primaryPainPoint: string
  keyBenefits: string[]
  winningHooks: string[]
  toneOfVoice: string
  callToAction: string
  doList: string[]
  dontList: string[]
  exampleScripts: string[]
  visualDirections: string[]
}

// ─────────────────────────────────────────────────────────
// Shopify Types
// ─────────────────────────────────────────────────────────

export interface ShopifyProductInput {
  title: string
  body_html: string
  vendor: string
  product_type: string
  tags: string
  status: 'active' | 'draft' | 'archived'
  variants: ShopifyVariantInput[]
  images: ShopifyImageInput[]
  metafields?: ShopifyMetafield[]
  seo?: { title: string; description: string }
}

export interface ShopifyVariantInput {
  price: string
  compare_at_price?: string
  sku?: string
  inventory_quantity?: number
  fulfillment_service?: string
  inventory_management?: string
  requires_shipping: boolean
  weight?: number
  weight_unit?: 'kg' | 'g' | 'lb' | 'oz'
}

export interface ShopifyImageInput {
  src?: string
  alt?: string
}

export interface ShopifyMetafield {
  namespace: string
  key: string
  value: string
  type: string
}

export interface ShopifyProduct {
  id: number
  title: string
  handle: string
  status: string
  admin_url: string
  storefront_url: string
  variants: Array<{ id: number; price: string }>
  created_at: string
}

export interface ShopifySyncResult {
  productId: string
  shopifyId: number
  handle: string
  status: 'created' | 'updated' | 'skipped' | 'failed'
  reason?: string
  adminUrl: string
  storefrontUrl: string
}

// ─────────────────────────────────────────────────────────
// Meta Marketing Types
// ─────────────────────────────────────────────────────────

export type MetaObjective =
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_CONVERSIONS'
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS'

export type MetaOptimizationGoal =
  | 'LINK_CLICKS'
  | 'LANDING_PAGE_VIEWS'
  | 'PURCHASE'
  | 'ADD_TO_CART'
  | 'INITIATED_CHECKOUT'
  | 'REACH'
  | 'IMPRESSIONS'
  | 'VIDEO_VIEWS'

export type MetaBillingEvent = 'IMPRESSIONS' | 'LINK_CLICKS' | 'PAGE_LIKES'

export interface MetaCampaignInput {
  name: string
  objective: MetaObjective
  status: 'ACTIVE' | 'PAUSED'
  daily_budget?: number
  lifetime_budget?: number
  special_ad_categories?: string[]
}

export interface MetaAdSetInput {
  name: string
  campaign_id: string
  optimization_goal: MetaOptimizationGoal
  billing_event: MetaBillingEvent
  daily_budget?: number
  bid_amount?: number
  bid_strategy?: 'LOWEST_COST_WITHOUT_CAP' | 'COST_CAP' | 'LOWEST_COST_WITH_BID_CAP'
  targeting: MetaTargeting
  start_time?: string
  end_time?: string
  status: 'ACTIVE' | 'PAUSED'
  promoted_object?: {
    pixel_id?: string
    custom_event_type?: string
    page_id?: string
  }
}

export interface MetaTargeting {
  age_min?: number
  age_max?: number
  genders?: number[]
  geo_locations: { countries: string[] }
  interests?: Array<{ id: string; name: string }>
  behaviors?: Array<{ id: string; name: string }>
  /** Custom audiences / lookalikes */
  custom_audiences?: Array<{ id: string }>
  flexible_spec?: Array<Record<string, unknown>>
  publisher_platforms?: string[]
  facebook_positions?: string[]
  instagram_positions?: string[]
}

export interface MetaAdCreativeInput {
  name: string
  /** For video ads */
  video_id?: string
  /** For image ads */
  image_hash?: string
  title: string
  body: string
  link_url: string
  call_to_action_type:
    | 'SHOP_NOW'
    | 'LEARN_MORE'
    | 'GET_OFFER'
    | 'ORDER_NOW'
    | 'BUY_NOW'
  page_id: string
  instagram_actor_id?: string
}

export interface MetaCampaignBundle {
  product: ProductIntelligence
  shopifyProduct: ShopifyProduct
  campaignId: string
  /** TOF (top of funnel) ad set ID */
  tofAdSetId: string
  /** MOF (middle of funnel) retargeting ad set ID */
  mofAdSetId: string
  /** BOF (bottom of funnel) cart abandon ad set ID */
  bofAdSetId: string
  adIds: string[]
  dailyBudgetUSD: number
  status: 'active' | 'paused' | 'error'
  launchedAt: string
}

// ─────────────────────────────────────────────────────────
// Pipeline Types
// ─────────────────────────────────────────────────────────

export type PipelineStage =
  | 'idle'
  | 'researching'
  | 'filtering'
  | 'generating_copy'
  | 'syncing_shopify'
  | 'launching_ads'
  | 'complete'
  | 'error'

export interface PipelineRun {
  id: string
  startedAt: string
  completedAt?: string
  stage: PipelineStage
  config: PipelineConfig
  results: {
    productsResearched: number
    productsPassedFilter: number
    productsSyncedToShopify: number
    campaignsLaunched: number
    totalDailyBudgetUSD: number
  }
  products: ProductIntelligence[]
  shopifySyncResults: ShopifySyncResult[]
  metaCampaigns: MetaCampaignBundle[]
  errors: PipelineError[]
  logs: PipelineLog[]
}

export interface PipelineConfig {
  /** Product research filters */
  research: {
    categories: string[]
    minRevenue30d: number
    minGrowthRate: number
    maxPrice: number
    minPrice: number
    limit: number
  }
  /** Margin filter thresholds */
  margins: {
    minGrossMarginPct: number
    minNetMarginPct: number
    maxEstimatedCPA: number
  }
  /** Shopify sync settings */
  shopify: {
    markupMultiplier: number
    addCompareAtPrice: boolean
    publishImmediately: boolean
    defaultCollection: string
  }
  /** Meta ads settings */
  meta: {
    launchAds: boolean
    dailyBudgetPerProductUSD: number
    countries: string[]
    ageMin: number
    ageMax: number
    pixelId: string
    funnelStages: ('TOF' | 'MOF' | 'BOF')[]
  }
}

export interface PipelineError {
  stage: PipelineStage
  productId?: string
  message: string
  timestamp: string
}

export interface PipelineLog {
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  timestamp: string
  data?: Record<string, unknown>
}
