# Security policy

## Reporting

Use GitHub private vulnerability reporting on this repository.
Do not open a public issue for a security report.
Do not include exploit details, credentials, or live customer data.

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | yes |

## Secrets

Runtime secrets belong in the host environment. `.env.example` lists keys with empty values.

`OPERATOR_KEY` authorizes the dashboard and the operator API. Each phone has its own device token. Neither value is committed. The server stores only a hash of the device token.

The public page does not receive the operator key. `GET /api/session` returns it only when the `Host` header is localhost or a private LAN address, so a tunnel host cannot read it. On any other host the operator pastes the key into the desk, and the browser keeps it in `sessionStorage`.

The live process listens on localhost behind nginx. The phone polls the public HTTPS host. Do not publish the Node port. A send from this desk leaves from the operator's own SIM and can cost money or reach a real person.

The rate cap is 10 queued messages a minute and 5 recipients on one request. It is a safety stop for a bug, not a bulk product. There is no contact import.
