import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Endpoint is intentionally fail-closed until webhook signature verification is configured.
  // Never accept unauthenticated provider events into the ProfitLogic system of record.
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'webhook_not_configured' }, { status: 503 })
  }

  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ ok: false, error: 'missing_signature' }, { status: 401 })
  }

  // Signature verification will be enabled with the provider webhook secret before
  // the webhook is registered. This route deliberately refuses events until then.
  return NextResponse.json({ ok: false, error: 'signature_verification_pending' }, { status: 503 })
}
