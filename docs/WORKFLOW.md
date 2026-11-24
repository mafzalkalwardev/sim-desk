# Workflow

```mermaid
flowchart LR
  operator[Operator] -->|compose| desk[Dashboard]
  desk -->|POST messages| api[NextAPI]
  api --> db[SQLite]
  phone[GatewayApp] -->|GET pending| api
  phone -->|SmsManager| sim[PhoneSIM]
  sim --> messagesApp[MessagesApp]
  phone -->|POST report| api
  phone -->|POST inbox| api
  desk -->|GET messages| api
```

The operator types a number and a body. The API checks `OPERATOR_KEY`, the number, the recipient cap, and the rate cap, then writes one `queued` row per recipient. The phone polls with its device token, sends through the SIM, and posts the status. Rows it can read from the telephony provider are posted back and drawn on the tape.
