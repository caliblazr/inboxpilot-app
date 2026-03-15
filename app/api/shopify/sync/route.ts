/**
 * POST /api/shopify/sync
 * Sync a list of analyzed products to Shopify.
 *
 * Body: { products: ProductIntelligence[], options?: {...} }
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncProductsToShopify, createOrGetCollection, addProductToCollection } from '@/lib/shopify'
import type { ProductIntelligence } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      products: ProductIntelligence[]
      options?: {
        markupMultiplier?: number
        addCompareAtPrice?: boolean
        publishImmediately?: boolean
        collectionName?: string
      }
    }

    if (!body.products || !Array.isArray(body.products) || body.products.length === 0) {
      return NextResponse.json({ success: false, error: 'products array is required' }, { status: 400 })
    }

    const opts = body.options ?? {}
    const collectionName = opts.collectionName ?? 'Trending Products'

    const results = await syncProductsToShopify(body.products, opts)

    // Add created products to collection
    const created = results.filter((r) => r.status === 'created')
    if (created.length > 0) {
      try {
        const collectionId = await createOrGetCollection(collectionName)
        for (const r of created) {
          await addProductToCollection(collectionId, r.shopifyId)
        }
      } catch {
        // Non-fatal: products still synced, just not in collection
      }
    }

    const summary = {
      total:   results.length,
      created: results.filter((r) => r.status === 'created').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      failed:  results.filter((r) => r.status === 'failed').length,
    }

    return NextResponse.json({ success: true, summary, results })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/shopify/sync] Error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
