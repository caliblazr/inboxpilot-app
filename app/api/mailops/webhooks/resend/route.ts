import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'

export const runtime = 'nodejs'

type ResendWebhookEvent = {
  type?: string
  data?: {
    email_id?: string
    id?: string
  }
}

export async function POST(req: NextRequest) {
  // Fail-closed: never accept unauthenticated provider events into the
  // ProfitLogic system of record.
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

  // Svix verification must run against the raw, unparsed body.
  const rawBody = await req.text()
  let event: ResendWebhookEvent
  try {
    event = new Webhook(secret).verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendWebhookEvent
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 401 })
  }

  // MAILOPS.md rule 3: no CRM stage change from intent alone. Verified events
  // are logged with type + message id; durable persistence and classification
  // get wired in a follow-up change.
  const eventType = event?.type || 'unknown'
  const messageId = event?.data?.email_id || event?.data?.id || 'unknown'
  console.log('mailops_webhook_event', { eventType, messageId, svixId })

  return NextResponse.json({ ok: true, eventType, messageId }, { status: 200 })
}
