# Call of Duty: Warzone — DMA Hub first authorized PC pilot

**Research snapshot: November 1, 2026.** Game family `call-of-duty`, initial **edition `Call of Duty: Warzone`**, Windows PC. The phrase “Call of Duty” alone does **not** distinguish Warzone, Modern Warfare 4, Black Ops 7, a particular launcher, or an exact installed game build. Warzone was selected as the initial free-to-play pilot track because it has published PC requirements. **No user game build or hardware specifications have yet been provided or verified.**

## Scope and acceptance gate

The purpose of this pilot is to prepare an operator test environment, verify **official game-level requirements**, gather exact build and hardware QA evidence, and ensure no unsupported game compatibility claims are published. It does **not** supply software that changes gameplay, evades security controls, manipulates memory, identifies hidden game data, spoofs hardware, or bypasses RICOCHET.

A person or software vendor must independently establish rights before testing or distributing any third-party companion software. Activision's [Security and Enforcement Policy](https://support.activision.com/articles/call-of-duty-security-and-enforcement-policy) explicitly prohibits unauthorized cheating, modifications, security circumvention and related unsupported external devices/apps. No such module is included in DMA Hub.

## Official published PC specifications

Source: [Activision — Warzone PC system requirements, March 11, 2026](https://support.activision.com/warzone-2/articles/pc-system-requirements-for-warzone-2). These are **requirements to run Warzone itself**, not a specification or endorsement of any DMA device/software.

| Parameter | Minimum published | Recommended published |
| --- | --- | --- |
| Operating system | Windows 10 64-bit, latest updates | Windows 11 64-bit, latest updates |
| CPU examples | Ryzen 5 1400 / Intel i5-6600 | Ryzen 5 1600X / Intel i7-6700K |
| RAM | 8 GB | 12 GB |
| GPU examples | Radeon RX 470 / GTX 970 or 1060 / Intel Arc A580 | Radeon RX 6600 XT / RTX 3060 / Intel Arc B580 |
| GPU dedicated memory | 3 GB | 8 GB |
| SSD free space | 116 GB | 116 GB |

Activision additionally specifies broadband, DirectX 12, and supported Intel/AMD processors with AVX. Intel Arc cards require Resizable BAR. Minimums and storage can change with mandatory game updates.

**Security prerequisite:** [Activision's TPM 2.0 and Secure Boot guidance](https://support.activision.com/articles/trusted-platform-module-and-secure-boot) requires TPM 2.0 and Secure Boot for Warzone. Windows 10 should be 22H2 or newer. **Do not disable Secure Boot, tamper with TPM/attestation, or change firmware just to satisfy a third-party tool.** Follow the OS/motherboard vendor and official Call of Duty attestation guidance if a legitimate game configuration needs fixing.

## Patch and build watch

- Baseline source: [Warzone Season 06 patch notes, updated October 14, 2026](https://www.callofduty.com/patchnotes/2026/09/call-of-duty-bo7-warzone-season-06-patch-notes). A *patch-note date is not an exact executable build number*.
- [Official October 28 announcement](https://www.callofduty.com/uk/en/blog/2026/10/call-of-duty-modern-warfare-4-warzone-season-1-announcement) schedules Season 1 Warzone integration for **November 6, 2026 at 00:00 Eastern** and a further Warzone update article for November 2. The UI treats November 6 as a **mandatory recheck trigger**, not proof the patch actually shipped.
- Future build-specific compatibility records must be withdrawn or retested after a meaningful update. Current pilot has **no** software product, tested executable, vendor signature, or dated proof of functional game compatibility.

## Pilot implementation: `#/games/call-of-duty/pilot`

The public site contains a real local-only, interactive Warzone PC worksheet that allows a technician to:

1. Record the launcher/client, exact installed build as visible to the user, Windows edition, CPU and GPU models.
2. Enter reported RAM, VRAM and free SSD space; compare those numeric reports against official *game* minimums.
3. Record observed TPM 2.0, Secure Boot, DirectX 12, supported AVX CPU and broadband status without executing diagnostics or altering the computer.
4. Review reported blockers, unverified items, and the November 6 recheck trigger.
5. Export a JSON survey, TXT test handoff, copy the report, or print/PDF it for offline review.

All inputs remain in current-browser local storage. No game process, driver, anti-cheat stack, hardware interface, account or third-party server is read or modified. CPU/GPU equivalence is **not algorithmically determined** from free-text models. A completely filled survey is still **self-reported only**, with `gameCompatibilityVerified:false`, `dmaSoftwareSupported:false`, and `downloadEnabled:false`.

## Manual real-system QA evidence required for a later release

- Confirm chosen game is truly *Warzone* (not MW4 multiplayer or BO7) and record **platform launcher**, exact executable/game build and tested date.
- On the authorized PC record Windows version, CPU/GPU exact models, system and dedicated graphics memory, available SSD storage, and vendor-recommended graphics driver.
- Inspect system information using legitimate Windows settings and official Call of Duty tools. For TPM and Secure Boot, use **official Call of Duty attestation** or normal Windows `tpm.msc` / `msinfo32` **read-only** views. No DMA Hub device flashing, kernel hooks or anti-cheat bypass.
- Record owner/publisher authorization to test any *specific* DMA software/product and an **independently controlled evidence reference**. Do not self-attest compatibility based solely on a source marketing page.
- In local API Admin → Game QA create an actual software product only if authorized, link exact game/build, enter evidence, then write **pass/fail/retest-required** observations. This pilot does not automatically seed a product, mark any review passed or upload data to the API.
- Require independent binary signature, malware screening, rights review, and hardened distribution/entitlement controls before any software download could be approved.

## External inputs still needed

A real Windows PC environment and its specs, exact installed game client/version, and evidence of any companion software's authorized publisher/test rights. Absent those, this milestone is a source-backed *working preparation tool*, not a finished game implementation or 100% commercial product.

## Additional server-side retest gate

From the announced November 6, 2026 00:00 Eastern integration window onward, the local API deliberately **omits** Call of Duty public compatibility records, per-game QA status and matched asset metadata when their operator review predates that window. This is a conservative **re-review trigger**, not evidence that an update actually shipped or that a post-window re-attestation independently verified game software. Other game IDs are unaffected.

The existing admin review/QA workflow can re-attest a product against an exact game build after manual testing, but new QA observations and release records must be separately issued for the new review version. Nothing is automatically approved for download.
