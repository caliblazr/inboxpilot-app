/**
 * GET /api/kalodata/products
 * Search and analyze trending TikTok Shop products from Kalodata.
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchTrendingProducts, analyzeProducts, filterViableProducts } from '@/lib/kalodata'
import type { KalodataSearchParams } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl

    const params: KalodataSearchParams = {
      category:       searchParams.get('category')        ?? undefined,
      minRevenue30d:  Number(searchParams.get('minRevenue30d'))   || 50_000,
      minGrowthRate:  Number(searchParams.get('minGrowthRate'))   || 0.10,
      maxPrice:       Number(searchParams.get('maxPrice'))        || 80,
      minPrice:       Number(searchParams.get('minPrice'))        || 10,
      sortBy:         (searchParams.get('sortBy') as KalodataSearchParams['sortBy']) ?? 'revenue',
      limit:          Number(searchParams.get('limit'))           || 20,
      page:           Number(searchParams.get('page'))            || 1,
    }

    const viableOnly = searchParams.get('viableOnly') !== 'false'

    const raw      = await searchTrendingProducts(params)
    const enriched = await analyzeProducts(raw)
    const products = viableOnly ? filterViableProducts(enriched) : enriched

    // Sort by viability score descending
    products.sort((a, b) => b.viabilityScore - a.viabilityScore)

    return NextResponse.json({
      success:  true,
      total:    raw.length,
      filtered: products.length,
      products,
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/kalodata/products] Error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
