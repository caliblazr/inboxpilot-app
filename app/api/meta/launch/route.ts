/**
 * POST /api/meta/launch
 * Launch a Meta ad funnel for a single product.
 *
 * Body: { product: ProductIntelligence, shopifyProduct: ShopifyProduct, options?: {...} }
 */

import { NextRequest, NextResponse } from 'next/server'
import { launchProductFunnel } from '@/lib/meta'
import type { ProductIntelligence, ShopifyProduct } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      product: ProductIntelligence
      shopifyProduct: ShopifyProduct
      options?: {
        totalDailyBudgetUSD?: number
        countries?: string[]
        ageMin?: number
        ageMax?: number
        launchStatus?: 'ACTIVE' | 'PAUSED'
        funnelStages?: ('TOF' | 'MOF' | 'BOF')[]
      }
    }

    if (!body.product || !body.shopifyProduct) {
      return NextResponse.json(
        { success: false, error: 'product and shopifyProduct are required' },
        { status: 400 },
      )
    }

    const opts = body.options ?? {}

    const campaign = await launchProductFunnel(body.product, body.shopifyProduct, {
      totalDailyBudgetUSD: opts.totalDailyBudgetUSD ?? 50,
      countries:           opts.countries           ?? ['US'],
      ageMin:              opts.ageMin              ?? 18,
      ageMax:              opts.ageMax              ?? 65,
      launchStatus:        opts.launchStatus        ?? 'PAUSED',
      funnelStages:        opts.funnelStages        ?? ['TOF', 'MOF', 'BOF'],
    })

    return NextResponse.json({ success: true, campaign })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/meta/launch] Error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
