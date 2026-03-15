/**
 * Meta Marketing API Client
 *
 * Builds and launches a 3-tier ad funnel (TOF → MOF → BOF) on
 * Facebook and Instagram for each product.
 *
 * Funnel structure that already-winning stores use:
 *   TOF: Broad targeting → awareness + traffic → event: ViewContent
 *   MOF: Retarget page visitors (1-30d) → event: AddToCart
 *   BOF: Retarget cart abandoners (1-7d) → event: Purchase
 *
 * Meta Graph API v19.0
 */

import type {
  MetaCampaignInput,
  MetaAdSetInput,
  MetaAdCreativeInput,
  MetaCampaignBundle,
  ProductIntelligence,
  ShopifyProduct,
} from './types'

const GRAPH_API_URL  = 'https://graph.facebook.com/v19.0'
const ACCESS_TOKEN   = process.env.META_ACCESS_TOKEN ?? ''
const AD_ACCOUNT_ID  = process.env.META_AD_ACCOUNT_ID ?? ''
const PAGE_ID        = process.env.META_PAGE_ID ?? ''
const IG_ACCOUNT_ID  = process.env.META_INSTAGRAM_ACCOUNT_ID ?? ''
const PIXEL_ID       = process.env.META_PIXEL_ID ?? ''

// ─── HTTP Client ─────────────────────────────────────────

async function metaFetch<T>(
  path: string,
  method: 'GET' | 'POST' = 'POST',
  body?: Record<string, unknown>,
): Promise<T> {
  if (!ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    throw new Error(
      'META_ACCESS_TOKEN and META_AD_ACCOUNT_ID must be set in your .env file.',
    )
  }

  const url = new URL(`${GRAPH_API_URL}${path}`)
  url.searchParams.set('access_token', ACCESS_TOKEN)

  const res = await fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = (await res.json()) as T & { error?: { message: string; code: number } }

  if (!res.ok || (data as { error?: { message: string } }).error) {
    const err = (data as { error?: { message: string } }).error
    throw new Error(`Meta API error on ${path}: ${err?.message ?? res.statusText}`)
  }

  return data
}

// ─── Campaign ────────────────────────────────────────────

async function createCampaign(input: MetaCampaignInput): Promise<string> {
  const res = await metaFetch<{ id: string }>(`/${AD_ACCOUNT_ID}/campaigns`, 'POST', {
    name:                   input.name,
    objective:              input.objective,
    status:                 input.status,
    special_ad_categories:  input.special_ad_categories ?? [],
    daily_budget:           input.daily_budget,
  })
  return res.id
}

// ─── Ad Set ──────────────────────────────────────────────

async function createAdSet(input: MetaAdSetInput): Promise<string> {
  const res = await metaFetch<{ id: string }>(`/${AD_ACCOUNT_ID}/adsets`, 'POST', {
    name:              input.name,
    campaign_id:       input.campaign_id,
    optimization_goal: input.optimization_goal,
    billing_event:     input.billing_event,
    daily_budget:      input.daily_budget,
    bid_strategy:      input.bid_strategy ?? 'LOWEST_COST_WITHOUT_CAP',
    targeting:         input.targeting,
    start_time:        input.start_time ?? new Date().toISOString(),
    status:            input.status,
    promoted_object:   input.promoted_object,
  })
  return res.id
}

// ─── Creative ────────────────────────────────────────────

async function createAdCreative(input: MetaAdCreativeInput): Promise<string> {
  const objectStorySpec = {
    page_id: input.page_id,
    link_data: {
      link:           input.link_url,
      message:        input.body,
      name:           input.title,
      call_to_action: {
        type:  input.call_to_action_type,
        value: { link: input.link_url },
      },
    },
  }

  // Instagram actor makes the ad show from your IG account
  const spec = input.instagram_actor_id
    ? { ...objectStorySpec, instagram_actor_id: input.instagram_actor_id }
    : objectStorySpec

  const res = await metaFetch<{ id: string }>(`/${AD_ACCOUNT_ID}/adcreatives`, 'POST', {
    name:               input.name,
    object_story_spec:  spec,
  })
  return res.id
}

// ─── Ad ──────────────────────────────────────────────────

async function createAd(
  name: string,
  adSetId: string,
  creativeId: string,
): Promise<string> {
  const res = await metaFetch<{ id: string }>(`/${AD_ACCOUNT_ID}/ads`, 'POST', {
    name,
    adset_id:  adSetId,
    creative:  { creative_id: creativeId },
    status:    'ACTIVE',
  })
  return res.id
}

// ─── Custom Audiences ────────────────────────────────────

/**
 * Build a lookalike audience from your Pixel's Purchase events.
 * Returns the audience ID to use in MOF/BOF targeting.
 */
async function createPixelLookalike(
  name: string,
  sourcePixelId: string,
  countries: string[],
): Promise<string> {
  const res = await metaFetch<{ id: string }>(`/${AD_ACCOUNT_ID}/customaudiences`, 'POST', {
    name,
    subtype:    'LOOKALIKE',
    lookalike_spec: {
      type:                'urn:facebook:ads:lookalike:spec:pixel_based',
      pixel_id:            sourcePixelId,
      conversion_type:     'PURCHASE',
      starting_ratio:      0.0,
      ratio:               0.01,  // 1% LAL — tightest match
      country_codes:       countries,
    },
  })
  return res.id
}

/**
 * Create a Website Custom Audience for retargeting.
 */
async function createWebsiteAudience(
  name: string,
  pixelId: string,
  retentionDays: number,
  event: 'ViewContent' | 'AddToCart' | 'InitiateCheckout',
): Promise<string> {
  const res = await metaFetch<{ id: string }>(`/${AD_ACCOUNT_ID}/customaudiences`, 'POST', {
    name,
    subtype: 'WEBSITE',
    retention_days: retentionDays,
    rule: {
      inclusions: {
        operator: 'or',
        rules: [{
          event_sources:  [{ id: pixelId, type: 'pixel' }],
          retention_seconds: retentionDays * 86400,
          filter: {
            operator: 'and',
            filters: [{
              field:    'event',
              operator: 'eq',
              value:    event,
            }],
          },
        }],
      },
    },
  })
  return res.id
}

// ─── Full Funnel Builder ─────────────────────────────────

/**
 * Launch a complete 3-tier Meta ad funnel for a product.
 *
 * Budget allocation (recommended split):
 *   TOF 60% | MOF 25% | BOF 15%
 *
 * @param product     Enriched product intelligence
 * @param shopify     The Shopify product (for URL)
 * @param totalDaily  Total daily budget in USD cents (e.g. 5000 = $50/day)
 * @param countries   Target country codes (e.g. ['US', 'CA'])
 * @param ageMin/Max  Audience age range
 * @param launchStatus  'ACTIVE' or 'PAUSED' — start paused for review
 */
export async function launchProductFunnel(
  product: ProductIntelligence,
  shopify: ShopifyProduct,
  opts: {
    totalDailyBudgetUSD: number
    countries: string[]
    ageMin: number
    ageMax: number
    launchStatus?: 'ACTIVE' | 'PAUSED'
    funnelStages?: ('TOF' | 'MOF' | 'BOF')[]
  },
): Promise<MetaCampaignBundle> {
  const {
    totalDailyBudgetUSD,
    countries,
    ageMin = 18,
    ageMax = 65,
    launchStatus = 'PAUSED',
    funnelStages = ['TOF', 'MOF', 'BOF'],
  } = opts

  const dailyCents      = totalDailyBudgetUSD * 100
  const tofBudget       = Math.round(dailyCents * 0.60)
  const mofBudget       = Math.round(dailyCents * 0.25)
  const bofBudget       = Math.round(dailyCents * 0.15)
  const productName     = product.title.slice(0, 50)
  const productUrl      = shopify.storefront_url
  const primaryAngle    = product.adAngles[0]
  const adIds: string[] = []

  // ── 1. Campaign (one per product for clean reporting) ──
  const campaignId = await createCampaign({
    name:      `[InboxPilot] ${productName}`,
    objective: 'OUTCOME_CONVERSIONS',
    status:    launchStatus,
  })

  let tofAdSetId = ''
  let mofAdSetId = ''
  let bofAdSetId = ''

  // ── 2. TOF: Broad + Lookalike ──────────────────────────
  if (funnelStages.includes('TOF')) {
    // Build a 1% lookalike from pixel purchase data
    let lookalikAudienceId: string | undefined
    try {
      lookalikAudienceId = await createPixelLookalike(
        `[InboxPilot] LAL 1% Purchasers — ${productName}`,
        PIXEL_ID,
        countries,
      )
    } catch {
      // If no purchase data yet, proceed with broad targeting
    }

    tofAdSetId = await createAdSet({
      name:              `TOF | Broad+LAL | ${productName}`,
      campaign_id:       campaignId,
      optimization_goal: 'PURCHASE',
      billing_event:     'IMPRESSIONS',
      daily_budget:      tofBudget,
      bid_strategy:      'LOWEST_COST_WITHOUT_CAP',
      status:            launchStatus,
      targeting: {
        age_min:  ageMin,
        age_max:  ageMax,
        geo_locations: { countries },
        custom_audiences: lookalikAudienceId
          ? [{ id: lookalikAudienceId }]
          : undefined,
        publisher_platforms:  ['facebook', 'instagram'],
        facebook_positions:   ['feed', 'video_feeds', 'reels'],
        instagram_positions:  ['stream', 'reels', 'explore'],
      },
      promoted_object: {
        pixel_id:          PIXEL_ID,
        custom_event_type: 'PURCHASE',
      },
    })

    // Create TOF creative for each angle (A/B test)
    for (let i = 0; i < Math.min(product.adAngles.length, 3); i++) {
      const angle    = product.adAngles[i]
      const creative = await createAdCreative({
        name:                 `TOF Creative ${i + 1} | ${angle.format} | ${productName}`,
        title:                angle.hook,
        body:                 `${angle.painPoint}\n\n${angle.solution}`,
        link_url:             productUrl,
        call_to_action_type:  'SHOP_NOW',
        page_id:              PAGE_ID,
        instagram_actor_id:   IG_ACCOUNT_ID || undefined,
      })

      const adId = await createAd(
        `TOF Ad ${i + 1} | ${productName}`,
        tofAdSetId,
        creative,
      )
      adIds.push(adId)
    }
  }

  // ── 3. MOF: Retarget Page Visitors (30 days) ──────────
  if (funnelStages.includes('MOF')) {
    let viewContentAudienceId: string | undefined
    try {
      viewContentAudienceId = await createWebsiteAudience(
        `[InboxPilot] ViewContent 30d — ${productName}`,
        PIXEL_ID,
        30,
        'ViewContent',
      )
    } catch {
      // Audience may not be ready yet on new pixels
    }

    mofAdSetId = await createAdSet({
      name:              `MOF | Retarget Viewers 30d | ${productName}`,
      campaign_id:       campaignId,
      optimization_goal: 'ADD_TO_CART',
      billing_event:     'IMPRESSIONS',
      daily_budget:      mofBudget,
      bid_strategy:      'LOWEST_COST_WITHOUT_CAP',
      status:            launchStatus,
      targeting: {
        age_min:  ageMin,
        age_max:  ageMax,
        geo_locations:    { countries },
        custom_audiences: viewContentAudienceId
          ? [{ id: viewContentAudienceId }]
          : undefined,
        publisher_platforms: ['facebook', 'instagram'],
        facebook_positions:  ['feed', 'video_feeds'],
        instagram_positions: ['stream', 'stories'],
      },
      promoted_object: {
        pixel_id:          PIXEL_ID,
        custom_event_type: 'ADD_TO_CART',
      },
    })

    const mofAngle   = product.adAngles[1] ?? product.adAngles[0]
    const mofCreative = await createAdCreative({
      name:                `MOF Creative | Social Proof | ${productName}`,
      title:               mofAngle.hook,
      body:                `${product.soldCount30d.toLocaleString()} people already got theirs. Don't miss out.\n\n${mofAngle.cta}`,
      link_url:            productUrl,
      call_to_action_type: 'SHOP_NOW',
      page_id:             PAGE_ID,
      instagram_actor_id:  IG_ACCOUNT_ID || undefined,
    })

    adIds.push(await createAd(`MOF Ad | ${productName}`, mofAdSetId, mofCreative))
  }

  // ── 4. BOF: Cart Abandoners (7 days) ──────────────────
  if (funnelStages.includes('BOF')) {
    let cartAbandonAudienceId: string | undefined
    try {
      cartAbandonAudienceId = await createWebsiteAudience(
        `[InboxPilot] AddToCart 7d — ${productName}`,
        PIXEL_ID,
        7,
        'AddToCart',
      )
    } catch {
      // Audience may not be ready on new pixels
    }

    bofAdSetId = await createAdSet({
      name:              `BOF | Cart Abandon 7d | ${productName}`,
      campaign_id:       campaignId,
      optimization_goal: 'PURCHASE',
      billing_event:     'IMPRESSIONS',
      daily_budget:      bofBudget,
      bid_strategy:      'LOWEST_COST_WITHOUT_CAP',
      status:            launchStatus,
      targeting: {
        age_min:  ageMin,
        age_max:  ageMax,
        geo_locations:    { countries },
        custom_audiences: cartAbandonAudienceId
          ? [{ id: cartAbandonAudienceId }]
          : undefined,
        publisher_platforms: ['facebook', 'instagram'],
        facebook_positions:  ['feed'],
        instagram_positions: ['stream', 'stories'],
      },
      promoted_object: {
        pixel_id:          PIXEL_ID,
        custom_event_type: 'PURCHASE',
      },
    })

    const bofAngle   = product.adAngles[2] ?? product.adAngles[0]
    const bofCreative = await createAdCreative({
      name:                `BOF Creative | Urgency | ${productName}`,
      title:               `Still thinking about ${product.title}?`,
      body:                `You left something in your cart. Stock is limited — don't let it sell out.\n\n${bofAngle.cta}`,
      link_url:            `${productUrl}?utm_source=meta&utm_medium=retargeting&utm_campaign=bof`,
      call_to_action_type: 'ORDER_NOW',
      page_id:             PAGE_ID,
      instagram_actor_id:  IG_ACCOUNT_ID || undefined,
    })

    adIds.push(await createAd(`BOF Ad | ${productName}`, bofAdSetId, bofCreative))
  }

  return {
    product,
    shopifyProduct:     shopify,
    campaignId,
    tofAdSetId,
    mofAdSetId,
    bofAdSetId,
    adIds,
    dailyBudgetUSD:     totalDailyBudgetUSD,
    status:             launchStatus === 'ACTIVE' ? 'active' : 'paused',
    launchedAt:         new Date().toISOString(),
  }
}
