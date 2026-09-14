import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    service: 'ProfitLogic MailOps',
    status: 'ok',
    version: 'v1',
    architecture: {
      state: 'Airtable ProfitLogic Events',
      transport: 'provider adapter pending',
      intelligence: 'AI enrichment after persistence',
      idempotency: 'message/command id required',
    },
    timestamp: new Date().toISOString(),
  })
}
