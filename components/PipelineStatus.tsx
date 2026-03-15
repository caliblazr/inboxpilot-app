'use client'

import type { PipelineRun, PipelineLog } from '@/lib/types'

interface Props {
  run: PipelineRun | null
  isRunning: boolean
}

const STAGE_LABELS: Record<string, string> = {
  idle:             'Ready',
  researching:      'Researching TikTok Shop...',
  filtering:        'Filtering by margin & viability...',
  generating_copy:  'Generating CRO copy & ad angles...',
  syncing_shopify:  'Syncing to Shopify...',
  launching_ads:    'Launching Meta campaigns...',
  complete:         'Pipeline complete',
  error:            'Pipeline error',
}

const STAGE_ORDER = [
  'researching',
  'filtering',
  'generating_copy',
  'syncing_shopify',
  'launching_ads',
  'complete',
]

export default function PipelineStatus({ run, isRunning }: Props) {
  if (!run && !isRunning) return null

  const currentStageIndex = run ? STAGE_ORDER.indexOf(run.stage) : 0

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900">Pipeline Status</h2>
        {isRunning && (
          <span className="flex items-center gap-1.5 text-sm text-brand-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            Running
          </span>
        )}
        {run?.stage === 'complete' && (
          <span className="badge-green">Complete</span>
        )}
        {run?.stage === 'error' && (
          <span className="badge-red">Error</span>
        )}
      </div>

      {/* Stage Progress */}
      <div className="flex items-center gap-1 mb-5">
        {STAGE_ORDER.map((stage, i) => {
          const done    = run && currentStageIndex > i
          const active  = run && currentStageIndex === i && isRunning
          const errored = run?.stage === 'error' && currentStageIndex === i
          return (
            <div key={stage} className="flex items-center flex-1">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  errored ? 'bg-red-400' :
                  done    ? 'bg-emerald-500' :
                  active  ? 'bg-brand-500 animate-pulse-slow' :
                            'bg-slate-200'
                }`}
              />
            </div>
          )
        })}
      </div>

      {/* Current stage label */}
      {run && (
        <p className="text-sm text-slate-600 mb-4">
          {STAGE_LABELS[run.stage] ?? run.stage}
        </p>
      )}

      {/* Results Summary */}
      {run?.stage === 'complete' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <ResultStat label="Products Found"    value={run.results.productsResearched} />
          <ResultStat label="Passed Filter"     value={run.results.productsPassedFilter} highlight />
          <ResultStat label="Synced to Shopify" value={run.results.productsSyncedToShopify} highlight />
          <ResultStat label="Campaigns Built"   value={run.results.campaignsLaunched} highlight />
        </div>
      )}

      {/* Log Feed */}
      {run && run.logs.length > 0 && (
        <div className="bg-slate-900 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs">
          {run.logs.slice(-20).map((log, i) => (
            <LogLine key={i} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}

function ResultStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <div className={`text-xl font-bold ${highlight && value > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function LogLine({ log }: { log: PipelineLog }) {
  const colors = {
    info:    'text-slate-400',
    warn:    'text-amber-400',
    error:   'text-red-400',
    success: 'text-emerald-400',
  }
  const prefixes = { info: '>', warn: '!', error: '✗', success: '✓' }

  return (
    <div className={`${colors[log.level]} leading-relaxed`}>
      <span className="text-slate-600">{new Date(log.timestamp).toLocaleTimeString()} </span>
      <span>{prefixes[log.level]} {log.message}</span>
    </div>
  )
}
