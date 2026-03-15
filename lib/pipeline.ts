/**
 * Pipeline Orchestrator
 *
 * Runs the full product-to-ads pipeline:
 *   1. Research trending products on Kalodata
 *   2. Analyze margins, viability, and ad angles
 *   3. Filter to only viable products
 *   4. Sync to Shopify with CRO-optimized copy
 *   5. Launch Meta ad funnels (optionally paused for review)
 *
 * Designed to be called from the API route or run on a schedule.
 */

import { nanoid } from 'crypto'
import {
  searchTrendingProducts,
  analyzeProducts,
  filterViableProducts,
} from './kalodata'
import {
  syncProductsToShopify,
  createOrGetCollection,
  addProductToCollection,
} from './shopify'
import { launchProductFunnel } from './meta'
import type {
  PipelineRun,
  PipelineConfig,
  PipelineLog,
  PipelineError,
  PipelineStage,
  MetaCampaignBundle,
  ShopifySyncResult,
} from './types'

// ─── Default Config ───────────────────────────────────────

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  research: {
    categories:    ['beauty', 'fashion', 'fitness', 'home', 'kitchen'],
    minRevenue30d: 50_000,
    minGrowthRate: 0.10,   // 10% month-over-month
    maxPrice:      80,
    minPrice:      10,
    limit:         50,
  },
  margins: {
    minGrossMarginPct: 60,
    minNetMarginPct:   15,
    maxEstimatedCPA:   30,
  },
  shopify: {
    markupMultiplier:   1.0,
    addCompareAtPrice:  true,
    publishImmediately: false,  // Start as draft — review before going live
    defaultCollection:  'Trending Products',
  },
  meta: {
    launchAds:              false,  // Off by default — enable after Shopify review
    dailyBudgetPerProductUSD: 50,
    countries:              ['US'],
    ageMin:                 18,
    ageMax:                 65,
    pixelId:                process.env.META_PIXEL_ID ?? '',
    funnelStages:           ['TOF', 'MOF', 'BOF'],
  },
}

// ─── Logging Helpers ──────────────────────────────────────

function makeLogger(logs: PipelineLog[], errors: PipelineError[]) {
  return {
    info: (msg: string, data?: Record<string, unknown>) =>
      logs.push({ level: 'info', message: msg, timestamp: new Date().toISOString(), data }),
    warn: (msg: string, data?: Record<string, unknown>) =>
      logs.push({ level: 'warn', message: msg, timestamp: new Date().toISOString(), data }),
    success: (msg: string, data?: Record<string, unknown>) =>
      logs.push({ level: 'success', message: msg, timestamp: new Date().toISOString(), data }),
    error: (stage: PipelineStage, msg: string, productId?: string) => {
      logs.push({ level: 'error', message: msg, timestamp: new Date().toISOString() })
      errors.push({ stage, message: msg, timestamp: new Date().toISOString(), productId })
    },
  }
}

// ─── Main Pipeline ────────────────────────────────────────

export async function runPipeline(
  config: Partial<PipelineConfig> = {},
): Promise<PipelineRun> {
  const cfg = deepMerge(DEFAULT_PIPELINE_CONFIG, config) as PipelineConfig

  const runId  = nanoid(12)
  const logs:   PipelineLog[]   = []
  const errors: PipelineError[] = []
  const log = makeLogger(logs, errors)

  const run: PipelineRun = {
    id:         runId,
    startedAt:  new Date().toISOString(),
    stage:      'idle',
    config:     cfg,
    results: {
      productsResearched:      0,
      productsPassedFilter:    0,
      productsSyncedToShopify: 0,
      campaignsLaunched:       0,
      totalDailyBudgetUSD:     0,
    },
    products:            [],
    shopifySyncResults:  [],
    metaCampaigns:       [],
    errors,
    logs,
  }

  try {
    // ── Stage 1: Research ─────────────────────────────────
    run.stage = 'researching'
    log.info(`Starting product research across ${cfg.research.categories.length} categories`)

    const rawProducts = await Promise.all(
      cfg.research.categories.map((category) =>
        searchTrendingProducts({
          category,
          minRevenue30d:  cfg.research.minRevenue30d,
          minGrowthRate:  cfg.research.minGrowthRate,
          maxPrice:       cfg.research.maxPrice,
          minPrice:       cfg.research.minPrice,
          sortBy:         'revenue',
          limit:          Math.ceil(cfg.research.limit / cfg.research.categories.length),
        }).catch((err) => {
          log.error('researching', `Failed to research category "${category}": ${err.message}`)
          return []
        }),
      ),
    ).then((results) => results.flat())

    run.results.productsResearched = rawProducts.length
    log.success(`Researched ${rawProducts.length} products from Kalodata`)

    // ── Stage 2: Analyze & Filter ────────────────────────
    run.stage = 'filtering'
    const enriched  = await analyzeProducts(rawProducts)
    const viable    = filterViableProducts(enriched, {
      minGrossMargin:      cfg.margins.minGrossMarginPct,
      minNetMargin:        cfg.margins.minNetMarginPct,
      excludeOpportunities: ['saturated'],
    })

    run.products                  = viable
    run.results.productsPassedFilter = viable.length

    log.info(
      `${viable.length}/${rawProducts.length} products passed viability filter ` +
      `(>${cfg.margins.minGrossMarginPct}% gross margin, >${cfg.margins.minNetMarginPct}% net margin)`,
    )

    if (viable.length === 0) {
      log.warn('No viable products found. Try loosening filters in config.')
      run.stage = 'complete'
      run.completedAt = new Date().toISOString()
      return run
    }

    // Log top 5 opportunities
    viable.slice(0, 5).forEach((p, i) => {
      log.info(`#${i + 1}: ${p.title} — Score: ${p.viabilityScore}/100 | Margin: ${p.grossMarginPct}% | ${p.opportunity.toUpperCase()}`)
    })

    // ── Stage 3: Copy Generation (embedded in shopify sync) ─
    run.stage = 'generating_copy'
    log.info('Generating CRO-optimized product descriptions and ad angles...')

    // ── Stage 4: Shopify Sync ────────────────────────────
    run.stage = 'syncing_shopify'
    log.info(`Syncing ${viable.length} products to Shopify (status: ${cfg.shopify.publishImmediately ? 'ACTIVE' : 'DRAFT'})`)

    const syncResults = await syncProductsToShopify(viable, {
      markupMultiplier:   cfg.shopify.markupMultiplier,
      addCompareAtPrice:  cfg.shopify.addCompareAtPrice,
      publishImmediately: cfg.shopify.publishImmediately,
    })

    run.shopifySyncResults = syncResults
    const synced = syncResults.filter((r) => r.status === 'created')
    run.results.productsSyncedToShopify = synced.length

    // Create collection and add products
    if (synced.length > 0) {
      try {
        const collectionId = await createOrGetCollection(cfg.shopify.defaultCollection)
        for (const result of synced) {
          await addProductToCollection(collectionId, result.shopifyId)
        }
        log.success(`Added ${synced.length} products to "${cfg.shopify.defaultCollection}" collection`)
      } catch (err) {
        log.warn(`Could not add to collection: ${(err as Error).message}`)
      }
    }

    syncResults.forEach((r) => {
      if (r.status === 'created') {
        log.success(`Synced: ${r.handle} → ${r.adminUrl}`)
      } else if (r.status === 'skipped') {
        log.info(`Skipped (already exists): ${r.handle}`)
      } else if (r.status === 'failed') {
        log.error('syncing_shopify', `Failed to sync product ${r.productId}: ${r.reason}`, r.productId)
      }
    })

    // ── Stage 5: Meta Ads ────────────────────────────────
    if (cfg.meta.launchAds) {
      run.stage = 'launching_ads'
      log.info('Launching Meta ad funnels...')

      const campaigns: MetaCampaignBundle[] = []

      for (const syncResult of synced) {
        const product = viable.find((p) => p.id === syncResult.productId)
        if (!product) continue

        try {
          const shopifyProductMock = {
            id:            syncResult.shopifyId,
            title:         product.title,
            handle:        syncResult.handle,
            status:        'active',
            admin_url:     syncResult.adminUrl,
            storefront_url: syncResult.storefrontUrl,
            variants:      [{ id: 0, price: String(product.recommendedSellPrice) }],
            created_at:    new Date().toISOString(),
          }

          const campaign = await launchProductFunnel(product, shopifyProductMock, {
            totalDailyBudgetUSD: cfg.meta.dailyBudgetPerProductUSD,
            countries:           cfg.meta.countries,
            ageMin:              cfg.meta.ageMin,
            ageMax:              cfg.meta.ageMax,
            launchStatus:        'PAUSED',  // Always start paused for safety
            funnelStages:        cfg.meta.funnelStages,
          })

          campaigns.push(campaign)
          run.results.totalDailyBudgetUSD += cfg.meta.dailyBudgetPerProductUSD

          log.success(
            `Launched campaign for "${product.title}" — ` +
            `$${cfg.meta.dailyBudgetPerProductUSD}/day — PAUSED (review before activating)`,
          )

          // Meta rate limit: ~200 calls/hour
          await new Promise((r) => setTimeout(r, 1500))

        } catch (err) {
          log.error('launching_ads', `Failed to launch ads for ${product.title}: ${(err as Error).message}`, syncResult.productId)
        }
      }

      run.metaCampaigns = campaigns
      run.results.campaignsLaunched = campaigns.length

    } else {
      log.info('Meta ads skipped (meta.launchAds = false). Enable in config to launch campaigns.')
    }

    run.stage = 'complete'
    run.completedAt = new Date().toISOString()

    log.success(
      `Pipeline complete! ` +
      `${run.results.productsPassedFilter} products filtered → ` +
      `${run.results.productsSyncedToShopify} synced to Shopify → ` +
      `${run.results.campaignsLaunched} campaigns launched`,
    )

  } catch (err) {
    run.stage = 'error'
    run.completedAt = new Date().toISOString()
    log.error(run.stage, `Pipeline failed: ${(err as Error).message}`)
  }

  return run
}

// ─── Utilities ───────────────────────────────────────────

function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...base }
  for (const key in override) {
    if (
      override[key] !== null &&
      typeof override[key] === 'object' &&
      !Array.isArray(override[key])
    ) {
      result[key] = deepMerge(
        (base[key] as Record<string, unknown>) ?? {},
        override[key] as Record<string, unknown>,
      )
    } else {
      result[key] = override[key]
    }
  }
  return result
}
