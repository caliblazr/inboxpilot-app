'use client'

import type { ProductIntelligence } from '@/lib/types'

interface Props {
  product: ProductIntelligence | null
  onClose: () => void
}

export default function CreativeBriefModal({ product, onClose }: Props) {
  if (!product) return null
  const brief = product.creativeBrief

  const copy = `
CREATIVE BRIEF: ${brief.productTitle}
==========================================

TARGET AUDIENCE
${brief.targetAudience}

PRIMARY PAIN POINT
${brief.primaryPainPoint}

KEY BENEFITS
${brief.keyBenefits.map((b) => `• ${b}`).join('\n')}

WINNING HOOKS (use one per video)
${brief.winningHooks.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

TONE OF VOICE
${brief.toneOfVoice}

CALL TO ACTION
${brief.callToAction}

DO LIST
${brief.doList.map((d) => `✅ ${d}`).join('\n')}

DON'T LIST
${brief.dontList.map((d) => `❌ ${d}`).join('\n')}

EXAMPLE SCRIPTS
${brief.exampleScripts.map((s, i) => `\n--- SCRIPT ${i + 1} ---\n${s}`).join('\n')}

VISUAL DIRECTIONS
${brief.visualDirections.map((v) => `• ${v}`).join('\n')}
`.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="font-bold text-slate-900">Creative Brief</h2>
            <p className="text-sm text-slate-500">{brief.productTitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(copy)
              }}
              className="btn-secondary text-sm"
            >
              Copy Brief
            </button>
            <button onClick={onClose} className="btn-secondary text-sm">Close</button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          <Section title="Target Audience">
            <p className="text-sm text-slate-700">{brief.targetAudience}</p>
          </Section>

          <Section title="Primary Pain Point">
            <p className="text-sm text-slate-700">{brief.primaryPainPoint}</p>
          </Section>

          <Section title="Key Benefits">
            <ul className="space-y-1">
              {brief.keyBenefits.map((b, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-2">
                  <span className="text-emerald-500 flex-shrink-0">✅</span> {b}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Winning Hooks (from TikTok data)">
            <div className="space-y-2">
              {brief.winningHooks.map((h, i) => (
                <div key={i} className="bg-brand-50 rounded-lg p-3 text-sm font-medium text-brand-900">
                  "{h}"
                </div>
              ))}
            </div>
          </Section>

          <Section title="Do / Don't">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase mb-2">Do</p>
                <ul className="space-y-1">
                  {brief.doList.map((d, i) => (
                    <li key={i} className="text-xs text-slate-700">✅ {d}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase mb-2">Don't</p>
                <ul className="space-y-1">
                  {brief.dontList.map((d, i) => (
                    <li key={i} className="text-xs text-slate-700">❌ {d}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section title="Example Scripts">
            <div className="space-y-3">
              {brief.exampleScripts.map((s, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-3 font-mono text-xs whitespace-pre-wrap text-slate-700 border border-slate-200">
                  {s}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Visual Directions">
            <ul className="space-y-1">
              {brief.visualDirections.map((v, i) => (
                <li key={i} className="text-sm text-slate-700">• {v}</li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</h3>
      {children}
    </div>
  )
}
