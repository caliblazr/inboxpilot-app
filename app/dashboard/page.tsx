'use client'

import { useState, useCallback } from 'react'
import ProductCard from '@/components/ProductCard'
import PipelineStatus from '@/components/PipelineStatus'
import CreativeBriefModal from '@/components/CreativeBriefModal'
import type { ProductIntelligence, PipelineRun, PipelineConfig } from '@/lib/types'

// ─── Config Panel ─────────────────────────────────────────

const CATEGORIES = ['beauty', 'skincare', 'fashion', 'accessories', 'fitness', 'home', 'kitchen', 'pets', 'electronics']

interface ConfigState {
  categories: string[]
  minRevenue30d: number
  minGrowthRate: number
  maxPrice: number
  publishImmediately: boolean
  launchAds: boolean
  dailyBudgetPerProductUSD: number
  countries: string
}

const DEFAULT_CONFIG: ConfigState = {
  categories:              ['beauty', 'fashion', 'fitness', 'home'],
  minRevenue30d:           50000,
  minGrowthRate:           0.10,
  maxPrice:                80,
  publishImmediately:      false,
  launchAds:               false,
  dailyBudgetPerProductUSD: 50,
  countries:               'US',
}

// ─── Dashboard ────────────────────────────────────────────

export default function Dashboard() {
  const [config, setConfig]               = useState<ConfigState>(DEFAULT_CONFIG)
  const [run, setRun]                     = useState<PipelineRun | null>(null)
  const [isRunning, setIsRunning]         = useState(false)
  const [syncedIds, setSyncedIds]         = useState<Set<string>>(new Set())
  const [launchingIds, setLaunchingIds]   = useState<Set<string>>(new Set())
  const [briefProduct, setBriefProduct]   = useState<ProductIntelligence | null>(null)
  const [filter, setFilter]               = useState<'all' | 'hot' | 'rising'>('all')
  const [error, setError]                 = useState<string | null>(null)

  const products = run?.products ?? []
  const filtered = products.filter((p) => filter === 'all' || p.opportunity === filter)

  // ── Run Pipeline ────────────────────────────────────────
  const handleRun = useCallback(async () => {
    setIsRunning(true)
    setError(null)
    setRun(null)

    const pipelineConfig: Partial<PipelineConfig> = {
      research: {
        categories:    config.categories,
        minRevenue30d: config.minRevenue30d,
        minGrowthRate: config.minGrowthRate,
        maxPrice:      config.maxPrice,
        minPrice:      10,
        limit:         50,
      },
      shopify: {
        markupMultiplier:   1.0,
        addCompareAtPrice:  true,
        publishImmediately: config.publishImmediately,
        defaultCollection:  'Trending Products',
      },
      meta: {
        launchAds:               config.launchAds,
        dailyBudgetPerProductUSD: config.dailyBudgetPerProductUSD,
        countries:               config.countries.split(',').map((c) => c.trim()),
        ageMin:                  18,
        ageMax:                  65,
        pixelId:                 '',
        funnelStages:            ['TOF', 'MOF', 'BOF'],
      },
      margins: {
        minGrossMarginPct: 60,
        minNetMarginPct:   15,
        maxEstimatedCPA:   30,
      },
    }

    try {
      const res  = await fetch('/api/pipeline', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(pipelineConfig),
      })
      const data = await res.json()

      if (data.success) {
        setRun(data.run)
        // Mark already-synced products
        const created = new Set(
          (data.run.shopifySyncResults ?? [])
            .filter((r: { status: string; productId: string }) => r.status === 'created')
            .map((r: { productId: string }) => r.productId),
        )
        setSyncedIds(created)
      } else {
        setError(data.error ?? 'Pipeline failed')
        setRun(data.run ?? null)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsRunning(false)
    }
  }, [config])

  // ── Sync single product ─────────────────────────────────
  const handleSync = useCallback(async (product: ProductIntelligence) => {
    try {
      const res  = await fetch('/api/shopify/sync', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ products: [product] }),
      })
      const data = await res.json()
      if (data.success && data.summary.created > 0) {
        setSyncedIds((prev) => new Set([...prev, product.id]))
      }
    } catch (err) {
      console.error('Sync failed:', err)
    }
  }, [])

  // ── Launch ads for single product ──────────────────────
  const handleLaunchAds = useCallback(async (product: ProductIntelligence) => {
    const syncResult = run?.shopifySyncResults.find((r) => r.productId === product.id)
    if (!syncResult) return

    setLaunchingIds((prev) => new Set([...prev, product.id]))

    try {
      const shopifyProduct = {
        id:            syncResult.shopifyId,
        title:         product.title,
        handle:        syncResult.handle,
        status:        'active',
        admin_url:     syncResult.adminUrl,
        storefront_url: syncResult.storefrontUrl,
        variants:      [{ id: 0, price: String(product.recommendedSellPrice) }],
        created_at:    new Date().toISOString(),
      }

      await fetch('/api/meta/launch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          product,
          shopifyProduct,
          options: {
            totalDailyBudgetUSD: config.dailyBudgetPerProductUSD,
            countries:           config.countries.split(',').map((c) => c.trim()),
            launchStatus:        'PAUSED',
          },
        }),
      })
    } finally {
      setLaunchingIds((prev) => { const s = new Set(prev); s.delete(product.id); return s })
    }
  }, [run, config])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">IP</div>
          <span className="font-semibold text-slate-900">InboxPilot</span>
          <span className="text-slate-300">|</span>
          <span className="text-sm text-slate-500">Commerce Intelligence</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Connected
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Product Intelligence Pipeline</h1>
          <p className="text-slate-500">
            Research trending TikTok Shop products → sync to Shopify with CRO copy → launch Meta funnels
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Config ──────────────────────────────── */}
          <div className="lg:col-span-1 space-y-4">

            <div className="card">
              <h2 className="font-semibold text-slate-900 mb-4">Pipeline Config</h2>

              {/* Categories */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                  Categories
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          categories: c.categories.includes(cat)
                            ? c.categories.filter((x) => x !== cat)
                            : [...c.categories, cat],
                        }))
                      }
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        config.categories.includes(cat)
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-3 mb-4">
                <NumberField
                  label="Min 30d Revenue ($)"
                  value={config.minRevenue30d}
                  onChange={(v) => setConfig((c) => ({ ...c, minRevenue30d: v }))}
                  step={10000}
                />
                <NumberField
                  label="Min Growth Rate (%)"
                  value={config.minGrowthRate * 100}
                  onChange={(v) => setConfig((c) => ({ ...c, minGrowthRate: v / 100 }))}
                  step={5}
                />
                <NumberField
                  label="Max Product Price ($)"
                  value={config.maxPrice}
                  onChange={(v) => setConfig((c) => ({ ...c, maxPrice: v }))}
                />
              </div>

              {/* Shopify */}
              <div className="border-t border-slate-100 pt-4 mb-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Shopify</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.publishImmediately}
                    onChange={(e) => setConfig((c) => ({ ...c, publishImmediately: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Publish immediately (live)</span>
                </label>
                <p className="text-xs text-slate-400 mt-1 ml-5">Unchecked = draft for review first</p>
              </div>

              {/* Meta Ads */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Meta Ads</p>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={config.launchAds}
                    onChange={(e) => setConfig((c) => ({ ...c, launchAds: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Auto-launch ad campaigns</span>
                </label>

                {config.launchAds && (
                  <div className="space-y-3 pl-5">
                    <NumberField
                      label="Daily budget per product ($)"
                      value={config.dailyBudgetPerProductUSD}
                      onChange={(v) => setConfig((c) => ({ ...c, dailyBudgetPerProductUSD: v }))}
                      step={10}
                    />
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Countries (comma-separated)</label>
                      <input
                        type="text"
                        value={config.countries}
                        onChange={(e) => setConfig((c) => ({ ...c, countries: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="US, CA, GB"
                      />
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700">
                      ⚠️ Campaigns launch PAUSED — activate in Meta Ads Manager after review
                    </div>
                  </div>
                )}
              </div>

              {/* Run Button */}
              <button
                onClick={handleRun}
                disabled={isRunning || config.categories.length === 0}
                className="btn-primary w-full justify-center mt-5"
              >
                {isRunning ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Running Pipeline...
                  </>
                ) : (
                  '▶ Run Pipeline'
                )}
              </button>
            </div>

            {/* Stats Card */}
            {run?.stage === 'complete' && (
              <div className="card">
                <h3 className="font-semibold text-slate-900 mb-3">Results</h3>
                <dl className="space-y-2 text-sm">
                  <Row label="Researched" value={run.results.productsResearched} />
                  <Row label="Viable" value={run.results.productsPassedFilter} green />
                  <Row label="Shopify" value={run.results.productsSyncedToShopify} green />
                  {run.results.campaignsLaunched > 0 && (
                    <>
                      <Row label="Campaigns" value={run.results.campaignsLaunched} green />
                      <Row label="Total daily budget" value={`$${run.results.totalDailyBudgetUSD}`} />
                    </>
                  )}
                </dl>
              </div>
            )}
          </div>

          {/* ── Right: Products + Pipeline ─────────────────── */}
          <div className="lg:col-span-2">
            <PipelineStatus run={run} isRunning={isRunning} />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
                {error}
              </div>
            )}

            {filtered.length > 0 && (
              <>
                {/* Filter Tabs */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-slate-500">{filtered.length} products</span>
                  <div className="flex gap-1 ml-auto">
                    {(['all', 'hot', 'rising'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          filter === f
                            ? 'bg-brand-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {f === 'all' ? 'All' : f === 'hot' ? '🔥 Hot' : '📈 Rising'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filtered.map((product) => (
                    <div key={product.id} className="relative">
                      <ProductCard
                        product={product}
                        onSync={handleSync}
                        onLaunchAds={handleLaunchAds}
                        synced={syncedIds.has(product.id)}
                        launching={launchingIds.has(product.id)}
                      />
                      <button
                        onClick={() => setBriefProduct(product)}
                        className="absolute top-4 right-4 text-xs text-slate-400 hover:text-brand-600 transition-colors"
                        title="View creative brief"
                      >
                        📋 Brief
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!isRunning && products.length === 0 && (
              <div className="card text-center py-16 text-slate-500">
                <div className="text-4xl mb-3">📊</div>
                <p className="font-medium text-slate-700 mb-1">No products yet</p>
                <p className="text-sm">Configure your pipeline and click Run to start researching</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Creative Brief Modal */}
      <CreativeBriefModal
        product={briefProduct}
        onClose={() => setBriefProduct(null)}
      />
    </div>
  )
}

function NumberField({
  label, value, onChange, step = 1,
}: {
  label: string; value: number; onChange: (v: number) => void; step?: number
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  )
}

function Row({ label, value, green }: { label: string; value: number | string; green?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-semibold ${green && Number(value) > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</dd>
    </div>
  )
}
