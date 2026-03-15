/**
 * POST /api/pipeline
 * Run the full product-to-ads pipeline.
 *
 * Body: Partial<PipelineConfig>
 * Returns: PipelineRun
 */

import { NextRequest, NextResponse } from 'next/server'
import { runPipeline, DEFAULT_PIPELINE_CONFIG } from '@/lib/pipeline'
import type { PipelineConfig } from '@/lib/types'

export const runtime = 'nodejs'

// Pipelines can take several minutes for large product sets
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as Partial<PipelineConfig>
    const run  = await runPipeline(body)

    const statusCode = run.stage === 'error' ? 500 : 200
    return NextResponse.json({ success: run.stage !== 'error', run }, { status: statusCode })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/pipeline] Error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    defaultConfig: DEFAULT_PIPELINE_CONFIG,
    endpoints: {
      'POST /api/pipeline':          'Run full pipeline',
      'GET  /api/kalodata/products': 'Research Kalodata products',
      'POST /api/shopify/sync':      'Sync products to Shopify',
      'POST /api/meta/launch':       'Launch Meta ad campaign',
    },
  })
}
