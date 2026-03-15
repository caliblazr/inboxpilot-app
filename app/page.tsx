import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">IP</div>
          <span className="font-bold text-slate-900">InboxPilot</span>
        </div>
        <Link href="/dashboard" className="btn-primary">
          Open Dashboard →
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          TikTok Shop Intelligence → Shopify → Meta Ads
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
          Find what&apos;s selling.<br />
          <span className="text-brand-600">List it. Advertise it. Win.</span>
        </h1>
        <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto">
          InboxPilot connects Kalodata&apos;s TikTok Shop intelligence with your Shopify store
          and Meta ad account — turning product research into revenue in one pipeline.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/dashboard" className="btn-primary text-base px-6 py-3">
            Run Your First Pipeline →
          </Link>
          <a href="#how" className="btn-secondary text-base px-6 py-3">See How It Works</a>
        </div>
      </section>

      {/* Criticisms addressed */}
      <section className="bg-slate-50 border-y border-slate-100 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">
            Built differently than every other dropship tool
          </h2>
          <p className="text-slate-500 text-center mb-10">We tore down the standard approach and rebuilt it.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                wrong: 'Steal TikTok videos for ads',
                right: 'Extract winning hooks — brief real UGC creators',
                why: 'Copyright infringement kills ad accounts. Briefs win creatives.',
              },
              {
                wrong: 'Auto-list everything trending',
                right: 'Filter by 60%+ gross margin, 15%+ net margin, <7 day ship',
                why: "Products that look popular often can't survive ad costs.",
              },
              {
                wrong: 'Run ads immediately with no data',
                right: 'Campaigns launch PAUSED — review before spending a dollar',
                why: 'No pixel data = bad optimization. Warm the pixel, then scale.',
              },
            ].map((item, i) => (
              <div key={i} className="card">
                <p className="text-sm text-slate-400 mb-1 line-through">{item.wrong}</p>
                <p className="text-sm font-semibold text-slate-900 mb-2">{item.right}</p>
                <p className="text-xs text-slate-500">{item.why}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">How the pipeline works</h2>
        <div className="space-y-6">
          {[
            {
              step: '01',
              title: 'Research',
              desc: 'Pull trending TikTok Shop products via Kalodata. Filter by category, revenue, growth rate, and price point.',
              badge: 'Kalodata API',
            },
            {
              step: '02',
              title: 'Analyze',
              desc: 'Every product gets a viability score. We estimate your landed cost, calculate net margins after ad spend, and extract the winning ad hooks from top-performing TikTok videos.',
              badge: 'Margin Engine',
            },
            {
              step: '03',
              title: 'Sync to Shopify',
              desc: 'Viable products are created on your Shopify store with CRO-optimized descriptions (Hook → Pain → Promise → Proof → CTA), SEO metadata, and proper variant/inventory setup.',
              badge: 'Shopify Admin API',
            },
            {
              step: '04',
              title: 'Generate Creative Briefs',
              desc: 'Every product gets a creator brief: proven hooks from real TikTok data, do/don\'t lists, example scripts, and visual directions. Send to UGC creators or film yourself.',
              badge: 'Ad Intelligence',
            },
            {
              step: '05',
              title: 'Launch Meta Funnels',
              desc: '3-tier funnel: TOF broad + lookalike → MOF page visitor retargeting → BOF cart abandoner recovery. All launch PAUSED so you review before spending.',
              badge: 'Meta Marketing API',
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-5 items-start">
              <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {item.step}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <span className="badge-blue">{item.badge}</span>
                </div>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 py-16 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to run?</h2>
        <p className="text-brand-100 mb-8">Add your API keys and launch your first pipeline.</p>
        <Link href="/dashboard" className="inline-flex items-center gap-2 bg-white text-brand-600 font-semibold px-8 py-3 rounded-lg hover:bg-brand-50 transition-colors">
          Open Dashboard →
        </Link>
      </section>

      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        InboxPilot — Built for operators, not tourists.
      </footer>
    </main>
  )
}
