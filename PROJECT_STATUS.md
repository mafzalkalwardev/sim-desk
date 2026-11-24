# Project status

type: web
repo: https://github.com/mafzalkalwardev/sim-desk
live: https://9e11cd6d0707bc.app.lhr.life

- [x] 0 intake done
- [x] 1 docs done
- [x] 2 github done
- [x] 3 issues done
- [x] 4 backend done
- [x] 5 frontend done
- [x] 6 review done
- [x] 7 media done
- [x] 8 readme done
- [x] 9 ship done
- [x] 10 closeout done

## Notes

- 2026-11-24 — Name sim-desk. One-line idea: a local desk that queues SMS and an Infinix gateway that sends them through the phone SIM.
- Issues: #1 handset lamp, #2 queue onto the tape, #3 phone send and report, #4 inbox mirror, #5 pair the Infinix (human). #2 blocked by #1, #3 by #2, #4 and #5 by #3.
- 2026-11-24 — Review: API tests pass. Desk checked at 320, 768, 1024, and 1440 with no horizontal scroll. Live carrier send stays on #5 because the connect port closed after pairing.
- 2026-11-24 — Live desk is a localhost.run tunnel to `npm start` on this PC: https://9e11cd6d0707bc.app.lhr.life. The operator key is not in the page. Port 3000 is not published on the router. Canonical URL remains the GitHub repository. Release: https://github.com/mafzalkalwardev/sim-desk/releases/tag/v0.1.0
- Wireless debugging on the Infinix was paired earlier and the connect port was closed at ship time. A watcher on this PC installs the gateway when the connect port opens. No carrier SMS was sent.
- Graphify skip: `graphify` is not on PATH, and `gsd-tools.cjs graphify build` exits because `../../../package.json` cannot be resolved. `.planning/config.json` still enables graphify.
