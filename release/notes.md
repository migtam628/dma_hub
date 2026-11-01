# DMA Hub v0.2.0-alpha.30

**Modern Call of Duty Xbox and PC game-platform matrix. Game availability does NOT mean DMA Hub game tool compatibility.**

## New in Alpha 30

- A new public `#/games/call-of-duty/platforms` experience compares official game listings for Warzone, Modern Warfare II, Modern Warfare III, Modern Warfare 4, Black Ops 6 and Black Ops 7 across Windows PC, Xbox Series X|S and Xbox One.
- Select Xbox Series X|S or Xbox One to inspect DMA Hub service boundaries: Xbox Edge website and browser-local planning, customer support/accounts after separate secure API hosting, optional ordinary capture/Remote Play, and **no direct console installation of the Windows launcher**.
- Official Xbox and Activision source links are provided for each game. Only Modern Warfare 4 is marked Xbox Play Anywhere where official listing directly supports the claim; other editions are unverified for that specific purchase entitlement.
- Xbox One Warzone is clearly marked as **end-of-service announced** ahead of MW4 Season 1. After the announced November 6, 2026 integration window, the website reports that service shutdown must be independently verified; it never claims real-time service checking.
- Modern Warfare 4 is documented as unavailable for Xbox One, while modern Xbox Series X|S is the default console target.
- Direct Xbox game-memory DMA, cheating tools, unapproved controller-input modification, hardware spoofing and anti-cheat bypass remain **unsupported**, regardless of official game listing.
- Unit tests assert version/platform validation, sunset handling, Windows/Xbox boundary, and that the project does not claim a published Xbox app, running public account backend, game compatibility certification or approved cheat software.
- Added source-backed [Xbox/PC platform test runbook](docs/call-of-duty-xbox-pc-matrix.md), and updated README, games guide and roadmap.

## What remains unverified

No physical Xbox has been connected or tested. Xbox Edge rendering, customer account flows, exact installed game builds, individual video capture/accessory compatibility, authorized hardware/software QA, and real customer operation need actual evidence. Static GitHub Pages has no production account backend. The existing Windows NSIS preview is **unsigned** and does not run as a native retail Xbox app.

## Release artifacts

GitHub publishes the static web ZIP and checksum. A separate Windows release job publishes the unsigned NSIS installer and checksum after packaging validation.

**Sources:** [Official Xbox Modern Warfare 4](https://www.xbox.com/en-US/games/call-of-duty-modern-warfare-4), [Activision Warzone platform update](https://support.activision.com/warzone-2/articles/warzone-platform-update), [Xbox Edge browser](https://www.microsoft.com/en-us/edge/learning-center/how-to-use-microsoft-edge-on-xbox), [Activision enforcement policy](https://support.activision.com/articles/call-of-duty-security-and-enforcement-policy).
