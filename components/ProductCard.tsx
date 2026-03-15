'use client'

import type { ProductIntelligence } from '@/lib/types'

interface Props {
  product: ProductIntelligence
  onSync: (product: ProductIntelligence) => void
  onLaunchAds: (product: ProductIntelligence) => void
  synced?: boolean
  launching?: boolean
}

const OPPORTUNITY_COLORS = {
  hot:       { badge: 'badge-red',    dot: 'bg-red-500',    label: '🔥 HOT' },
  rising:    { badge: 'badge-yellow', dot: 'bg-amber-400',  label: '📈 RISING' },
  watch:     { badge: 'badge-blue',   dot: 'bg-blue-400',   label: '👀 WATCH' },
  saturated: { badge: 'badge-purple', dot: 'bg-purple-400', label: '⚠️ SATURATED' },
}

export default function ProductCard({ product, onSync, onLaunchAds, synced, launching }: Props) {
  const opp = OPPORTUNITY_COLORS[product.opportunity]

  return (
    <div className="card hover:shadow-md transition-shadow animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-slate-100"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-2xl">
            🛍️
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={opp.badge}>{opp.label}</span>
            <span className="badge-blue">{product.category}</span>
            {synced && <span className="badge-green">✓ In Shopify</span>}
          </div>
          <h3 className="font-semibold text-slate-900 leading-tight truncate">{product.title}</h3>
          <p className="text-sm text-slate-500">{product.seller.name}</p>
        </div>
        {/* Viability Score */}
        <div className="text-right flex-shrink-0">
          <div
            className={`text-2xl font-bold ${
              product.viabilityScore >= 70 ? 'text-emerald-600' :
              product.viabilityScore >= 50 ? 'text-amber-600' : 'text-red-500'
            }`}
          >
            {product.viabilityScore}
          </div>
          <div className="text-xs text-slate-500">Score</div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Metric label="30d Revenue" value={`$${(product.revenue30d / 1000).toFixed(0)}k`} />
        <Metric label="Units Sold" value={product.soldCount30d.toLocaleString()} />
        <Metric
          label="Gross Margin"
          value={`${product.grossMarginPct.toFixed(0)}%`}
          highlight={product.grossMarginPct >= 65}
        />
        <Metric
          label="Net Margin"
          value={`${product.netMarginPct.toFixed(0)}%`}
          highlight={product.netMarginPct >= 20}
          warn={product.netMarginPct < 10}
        />
        <Metric label="Sell Price" value={`$${product.recommendedSellPrice}`} />
        <Metric
          label="Growth"
          value={`+${(product.revenueGrowthRate * 100).toFixed(0)}%`}
          highlight={product.revenueGrowthRate > 0.2}
        />
      </div>

      {/* Winning Hook Preview */}
      {product.adAngles[0] && (
        <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-100">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Top Ad Angle</p>
          <p className="text-sm text-slate-700 font-medium">"{product.adAngles[0].hook}"</p>
          <p className="text-xs text-slate-500 mt-1">{product.adAngles[0].format.replace('_', '/')}</p>
        </div>
      )}

      {/* Ship time warning */}
      {product.seller.fulfillmentDays > 5 && (
        <div className="text-xs text-amber-600 mb-3">
          ⚠️ Ships in {product.seller.fulfillmentDays} days — manage expectations in copy
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onSync(product)}
          disabled={synced}
          className="btn-primary flex-1 justify-center text-sm"
        >
          {synced ? '✓ Synced' : '→ Sync to Shopify'}
        </button>
        {synced && (
          <button
            onClick={() => onLaunchAds(product)}
            disabled={launching}
            className="btn-secondary flex-1 justify-center text-sm"
          >
            {launching ? '...' : '⚡ Launch Ads'}
          </button>
        )}
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  highlight,
  warn,
}: {
  label: string
  value: string
  highlight?: boolean
  warn?: boolean
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-2.5">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p
        className={`font-semibold text-sm ${
          warn ? 'text-red-600' :
          highlight ? 'text-emerald-600' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
