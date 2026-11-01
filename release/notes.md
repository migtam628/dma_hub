# DMA Hub v0.2.0-alpha.31

**Xbox physical-console testing workbook and local QA observation history. No physical Xbox has been tested by the project.**

## New in Alpha 31

- Public `#/games/call-of-duty/xbox-qa` manual QA workbook linked from the Call of Duty Xbox/PC platform matrix.
- Covers **Xbox Series X, Series S, Xbox One, One S and One X** with no assumed hardware model or test results.
- Records exact installed Call of Duty edition/build, console OS version, test date, controller/display, and optional HTTPS evidence reference.
- Captures individual **Not tested / Observed pass / Observed failure / Blocked / Not applicable** outcomes for Xbox Edge site opening/navigation, display readability, form inputs, browser storage, TXT export, printing/PDF, optional official Remote Play and ordinary authorized HDMI capture.
- Draft and up to 25 explicitly saved field observations are stored **only in the browser**, never transmitted to DMA Hub or Xbox. Reports export to JSON/TXT, clipboard or print. Versioned JSON draft import and local deletion supported.
- A saved observation requires a manually declared **real physical Xbox test**, specific model/game/build/OS/date, meaningful notes, and at least one observed positive/negative outcome. Defaults do **not** invent successful tests.
- Input validation, sanitization and exported report messages make it clear that all observations are operator-reported, unaudited and not independently certified.
- Added unit tests and a documented [physical console field QA procedure](docs/xbox-device-qa-workbook.md); updated README, Call of Duty matrix documentation and roadmap.

## Technical and commercial limitations

No Xbox test console has been connected or measured. Browser localStorage is not a tamper-resistant audit database. Some Xbox Edge browser download, clipboard or print features may be unavailable; they require manual testing.

This does **not** produce a native Xbox app, install the unsigned Windows launcher onto a console, enable DMA game memory access, alter controller inputs, evade anti-cheat, or approve game cheats. The public Pages site remains a static preview without a deployed customer account/API service.

## Release assets

GitHub publishes the static web ZIP and SHA256 checksum, and a separate workflow publishes a preview **unsigned** Windows NSIS installer and SHA256 checksum after its packaging job succeeds.

See [Console QA workbook](https://dma.moobee.lol/#/games/call-of-duty/xbox-qa), [Xbox/PC matrix](https://dma.moobee.lol/#/games/call-of-duty/platforms), [field procedure](docs/xbox-device-qa-workbook.md) and [project roadmap](docs/project-roadmap.md).
