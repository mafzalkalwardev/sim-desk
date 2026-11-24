# PRD — sim-desk

## Problem

A script or a dashboard cannot send an SMS by itself. Paid carrier APIs rent a number that is not the one already in the phone. The Infinix on the desk has a SIM and a Messages app. The missing piece is a local queue: type the text on the computer, and that phone sends it.

## Users

- The operator at the PC, who pairs the phone, composes texts, and reads the tape.
- The handset, which is the gateway. It is not a second account.

## Stories

- As an operator, I want to see whether the phone is online, so that I know a text can leave.
- As an operator, I want to type a number and a message, so that the phone sends it through my SIM.
- As an operator, I want a tape of queued, sent, failed, and received messages, so that I can see what the line did.
- As the handset, I want to register with a pairing code, so that only this desk can queue sends for it.
- As the handset, I want to pull pending texts and report status, so that the tape matches what the carrier did.
- As the handset, I want to upload new inbox and sent rows, so that replies show on the tape without replacing the Messages app.

## Non-goals

- Accounts, teams, or billing.
- Firebase Cloud Messaging, MongoDB, Redis, or a public send API.
- Becoming the default SMS app.
- Contact import, CSV blasts, or more than 5 recipients on one send.
- WhatsApp or any messenger other than SMS.
- A hosted deployment in v0.1.

## Success

- A message typed in the dashboard is queued, pulled by the paired phone, and handed to `SmsManager`.
- The tape shows the status the phone reports.
- Inbox and sent rows the phone is allowed to read appear on the tape.
- API tests cover register, queue, a bad number, the rate cap, and a missing token.

## Constraints

Free tools only unless a paid tool is listed under Paid later.
The queue stays in local SQLite. The send API stays on the LAN.
Operator routes require `OPERATOR_KEY`. Device routes require that device's token.
At most 10 queued sends per minute and 5 recipients per request.
A live carrier send goes only to a number the operator types. The build does not invent a destination.

## Acceptance criteria

- [ ] Dashboard shows device online state, compose, and the message tape.
- [ ] Phone registers with a one-time pairing code and sends heartbeats.
- [ ] Pending messages are sent with `SmsManager` and reported back as sent, delivered, or failed.
- [ ] Inbox and sent rows the phone can read show on the tape.
- [ ] A bad number, a missing token, and the rate cap are rejected with a clear status.
- [ ] `OPERATOR_KEY` and device tokens are not in git.
- [ ] Layouts hold at 320, 768, 1024, and 1440.
- [ ] `npm test` passes.
- [ ] README commands match `package.json`.
