# Call of Duty — Xbox and PC platform matrix (Alpha 30)

**Reviewed:** 2026-11-01. Scope expanded from one Warzone Windows PC pilot to **modern Call of Duty editions on Xbox Series X|S, Xbox One and Windows PC**. This is an official game *availability* reference, **not** a claim that any DMA Hub game software supports Xbox or PC Call of Duty.

## Game editions and official Xbox listings

| Title | Xbox Series X/S | Xbox One | Windows PC | Source |
|---|---|---|---|---|
| Modern Warfare 4 (2026) | Listed | **Not supported** | Listed | [Xbox](https://www.xbox.com/en-US/games/call-of-duty-modern-warfare-4) |
| Warzone (live service) | Listed | **Service retirement announced with MW4 Season 1** | Listed | [Activision service update](https://support.activision.com/warzone-2/articles/warzone-platform-update) |
| Black Ops 7 (2025) | Listed | Listed | Listed | [Xbox](https://www.xbox.com/en-US/games/call-of-duty-black-ops-7) |
| Black Ops 6 (2024) | Listed | Listed | Listed | [Xbox](https://www.xbox.com/en-US/games/call-of-duty-black-ops-6) |
| Modern Warfare III (2023) | Listed | Listed | Listed | [Xbox](https://www.xbox.com/en-US/games/call-of-duty-modern-warfare-iii) |
| Modern Warfare II (2022) | Listed | Listed | Listed | [Xbox](https://www.xbox.com/en-US/games/call-of-duty-modern-warfare-ii) |

Activision removed new Warzone downloads from Xbox One on June 4, 2026, and announced Xbox One gameplay would end when MW4 Season 1 begins. The [official change notice](https://support.activision.com/warzone-2/articles/warzone-platform-update) is not a real-time availability API. The UI highlights both an upcoming retirement and a post-announcement **verify-live-status** state rather than claiming it observed a console service shutdown.

Modern Warfare 4 is [Xbox Play Anywhere](https://www.xbox.com/en-US/games/call-of-duty-modern-warfare-4). An eligible digital Xbox purchase can provide access on Xbox Series and Windows PC under Microsoft's program; it does **not** make the Xbox executable run on a Windows gaming PC nor approve any DMA tools. Other titles are marked Play Anywhere **unverified** unless individually confirmed by the official game listing.

## DMA Hub service capability boundaries

| DMA Hub service | Xbox Series X/S | Xbox One | Important boundary |
|---|---|---|---|
| Public DMA Hub browser website / planning guides | Available for browser testing through Microsoft Edge | Browser testing still required | [Microsoft's Edge guide](https://www.microsoft.com/en-us/edge/learning-center/how-to-use-microsoft-edge-on-xbox) confirms Edge on Series X/S. No console-specific QA has yet been performed |
| Customer account, tickets, product status and profiles | Feasible in browser after backend deploy | Feasible after browser verification and backend deploy | Current GitHub Pages is static and no live customer API is deployed |
| Windows Tauri launcher / native hardware diagnostics | Not supported directly | Not supported directly | Xbox retail apps follow a distinct Microsoft publishing/security model; the Windows installer is not an Xbox console installer |
| Xbox Remote Play on optional PC | Xbox feature | Xbox feature | [Microsoft's technical overview](https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/game-streaming/game-streaming-overview) confirms the game still executes on the Xbox |
| Ordinary authorized HDMI recording/stream capture to companion PC | Equipment-dependent | Equipment-dependent | Capture is not game-memory access, gameplay automation, remote code execution or security bypass |
| Direct DMA game-memory manipulation, unapproved controller/input mods or anti-cheat evasion | **Not supported** | **Not supported** | [Activision security and enforcement](https://support.activision.com/articles/call-of-duty-security-and-enforcement-policy) prohibits cheating and unauthorized hardware/applications; no such code exists in DMA Hub |

The [Microsoft UWP developer-mode FAQ](https://learn.microsoft.com/en-us/windows/uwp/xbox-apps/frequently-asked-questions) also explains Developer Mode vs Retail Mode; using Developer Mode to run an experimental non-store app should **never** be marketed as normal Xbox retail support.

## Implemented

The live `#/games/call-of-duty/platforms` route includes an interactive Xbox Series vs Xbox One capability comparison and the sourced six-title game-platform table. A time-sensitive Warzone Xbox One cell changes from **end-of-service announced** to **announced-end recheck** after the scheduled update window. Neither state pretends live availability was measured.

Unit tests verify the sunset logic, Modern Warfare 4 Xbox One exclusion, Windows/Xbox distinction, and that every model reports `dmaMemoryAccess:false`, `directCheatSupport:false`, `consoleAppPublished:false`, `gameCompatibilityTested:false`, and `accountBackendOnline:false`.

## Testing plan for an actual Xbox

1. Record the **exact console model** (Series X, Series S, Xbox One generation), installed game edition and game version/playlist; use a separate entry for every edition or patch.
2. Test Microsoft's Edge on that console: webpage navigation, input controls, responsive layout, local survey persistence, exports and reading requirements. Document actual behavior before promoting any feature to “tested on Xbox.”
3. On a companion PC, validate standard Xbox Remote Play or ordinary video capture **only when permitted and necessary**. The PC is not running the console game process.
4. Validate the account/support workspace after a production-grade hosted API and HTTPS integration exist. Do not collect Xbox account credentials in an unreviewed app.
5. Keep a pass/fail/retest record per game/platform/build. Do not conflate an official Xbox store listing with DMA Hub software compatibility.
6. Test real ownership, accessibility support and normal controllers under Microsoft and Activision policies. No automatic aim, input scripting, console firmware tampering, DMA console memory access or spoofing.

## Pending external inputs

The user has indicated a broad modern Call of Duty testing scope, but has not yet provided the physical Xbox model, games actually installed, test evidence or equipment. These are the prerequisites for certifying browser and hardware behavior. There is no native Xbox DMA Hub application and no signed, approved console-game integration.

## Operator hardware test workbook — Alpha 31

The user requested continued Xbox work without identifying a specific model, so the public `#/games/call-of-duty/xbox-qa` worksheet intentionally **does not preselect a model, game build or successful tests**. It supports Xbox Series X/S and Xbox One variants, actual per-feature pass/fail/blocked/non-applicable results and portable locally stored observations. The [manual console test procedure](xbox-device-qa-workbook.md) describes gathering valid physical evidence. Nothing is uploaded to a backend or independently certified.
