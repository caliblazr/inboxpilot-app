const chambers = [
  { name: 'Henderson Chamber', status: 'Contacted', outcome: '25-business pilot', signal: 'Awaiting reply' },
  { name: 'Vegas Chamber', status: 'Contacted', outcome: '25-business pilot', signal: 'Awaiting reply' },
  { name: 'Urban Chamber', status: 'Contacted', outcome: '25-business pilot', signal: 'Awaiting routing/reply' },
]

export default function Home() {
  return (
    <main style={{minHeight:'100vh',background:'#090909',color:'#f5f5f5',fontFamily:'Arial, sans-serif',padding:'48px 24px'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <p style={{letterSpacing:2,textTransform:'uppercase',fontSize:12,color:'#c7a75b'}}>ProfitLogic • Driverless Ops</p>
        <h1 style={{fontSize:48,margin:'8px 0'}}>InboxPilot MailOps</h1>
        <p style={{maxWidth:760,color:'#aaa',fontSize:18,lineHeight:1.6}}>Deterministic outbound and inbound control plane. Email is transport. Airtable is state. AI is intelligence. Every consequential event must be verified before the CRM moves.</p>

        <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:14,margin:'36px 0'}}>
          {[
            ['Authorized Chamber Pilot','0 / 1'],['Live Chamber Experiments','3'],['Verified Replies','0'],['Event Ledger','LIVE']
          ].map(([label,value]) => <div key={label} style={{border:'1px solid #292929',borderRadius:14,padding:20,background:'#111'}}><div style={{color:'#999',fontSize:13}}>{label}</div><div style={{fontSize:30,fontWeight:700,marginTop:8}}>{value}</div></div>)}
        </section>

        <h2 style={{fontSize:24}}>Chamber Command Queue</h2>
        <div style={{display:'grid',gap:12}}>
          {chambers.map(c => <article key={c.name} style={{border:'1px solid #292929',borderRadius:14,padding:20,background:'#111',display:'grid',gridTemplateColumns:'2fr 1fr 2fr',gap:16}}><strong>{c.name}</strong><span style={{color:'#c7a75b'}}>{c.status}</span><span style={{color:'#aaa'}}>{c.signal} • Outcome: {c.outcome}</span></article>)}
        </div>

        <section style={{marginTop:36,border:'1px solid #292929',borderRadius:14,padding:24,background:'#111'}}>
          <h2 style={{marginTop:0}}>MailOps Standard</h2>
          <p style={{color:'#bbb',lineHeight:1.7}}>Queued → Sending → Sent → Reply/Delivered → Outcome. Every command uses an idempotency key. Every provider event is persisted before AI analysis. Failures retry and enter the error ledger. No stage change is allowed from intent alone.</p>
        </section>
      </div>
    </main>
  )
}
