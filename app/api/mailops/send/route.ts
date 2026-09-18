import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import crypto from 'crypto'

export const runtime = 'nodejs'

type SendBody = {
  commandId: string
  to: string
  subject: string
  text: string
  from?: string
  replyTo?: string
  tags?: Record<string, string>
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a)
  const bb = Buffer.from(b)
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb)
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  const controlToken = process.env.MAILOPS_CONTROL_TOKEN
  if (!apiKey || !controlToken) {
    return NextResponse.json({ ok: false, error: 'mailops_not_configured' }, { status: 503 })
  }

  const supplied = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  if (!supplied || !safeEqual(supplied, controlToken)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: SendBody
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const { commandId, to, subject, text } = body
  if (!commandId || !to || !subject || !text) {
    return NextResponse.json({ ok: false, error: 'missing_required_fields' }, { status: 400 })
  }

  // MVP idempotency: commandId is attached to provider tags. Durable dedupe moves to
  // ProfitLogic Events/Supabase before autonomous high-volume sending is enabled.
  const resend = new Resend(apiKey)
  const from = body.from || process.env.MAILOPS_FROM || 'ceo@profitlogic.io'
  const replyTo = body.replyTo || process.env.MAILOPS_REPLY_TO || 'ceo@profitlogic.io'
  const tags = [
    { name: 'command_id', value: commandId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 256) },
    { name: 'system', value: 'profitlogic-mailops' },
    ...Object.entries(body.tags || {}).slice(0, 8).map(([name, value]) => ({
      name: name.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 256),
      value: String(value).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 256),
    })),
  ]

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    replyTo,
    subject,
    text,
    tags,
  })

  if (error) {
    console.error('mailops_send_failed', { commandId, error })
    return NextResponse.json({ ok: false, commandId, error: error.message }, { status: 502 })
  }

  console.log('mailops_send_accepted', { commandId, providerId: data?.id, to })
  return NextResponse.json({ ok: true, commandId, provider: 'resend', providerId: data?.id }, { status: 202 })
}
