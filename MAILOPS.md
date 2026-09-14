# ProfitLogic MailOps v1

## Outcome
Remove conversational Gmail connectors from the critical path for ProfitLogic revenue operations.

## Governing rules
1. Email is transport; Airtable is state; AI is intelligence.
2. Persist provider events before AI analysis.
3. No CRM stage change from intent alone.
4. Every outbound command requires an idempotency key.
5. Every inbound provider message ID is deduplicated.
6. Failures retry and are written to the error ledger.
7. High-consequence sends require an explicit authorized command.

## Event flow
Outbound: command → validate → persist queued event → provider send → persist provider message/thread ID → mark sent → monitor reply.

Inbound: provider event → dedupe by message ID → persist raw event → classify → update CRM → alert → next-best action.

## Chamber watchlist
- Henderson Chamber: mmalloy@hendersonchamber.com, mpope@hendersonchamber.com
- Vegas Chamber: jvalle@vegaschamber.com, mbsewald@vegaschamber.com
- Urban Chamber: urbanchamber.org domain / routed decision-maker

## Airtable
Use the existing `ProfitLogic Events` table. Message ID is the inbound idempotency key. Add an Outbound Command ID for outbound commands before production send support is enabled.

## Next implementation gate
Add a provider adapter only after credentials are configured in Vercel environment variables. Never commit provider credentials to this repository.
