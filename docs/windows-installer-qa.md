# DMA Hub — Windows Alpha Installer QA
**Scope:** unsigned Windows 10/11 NSIS installer from the official `migtam628/dma_hub` GitHub Release. This is a **test procedure**, not evidence that QA was completed on physical machines.

## Before testing
1. Use a disposable standard-user Windows 10/11 test VM with current WebView2 and Windows updates.
2. Download the installer and `SHA256SUMS-windows.txt` from the *same* GitHub release.
3. Compute the installer digest in PowerShell: `(Get-FileHash -Algorithm SHA256 .\DMA.Hub_0.2.0_x64-setup.exe).Hash.ToLowerInvariant()`. Compare the full 64-character digest with the checksum text. Stop if different.
4. View installer publisher information. **Current alpha is unsigned**; Windows may warn about unknown publisher. Never claim it is signed or ask a user to defeat a security control.
5. Record build tag, Windows edition/build, architecture, package digest, test VM ID and test date.

## Manual QA matrix
| Test | Expected result | Evidence |
|---|---|---|
| Download/checksum | Official asset digest exactly matches published checksum | Asset URLs, hash output |
| Standard-user install | Current-user NSIS install completes without unintended elevation | Installer log/screenshot |
| First launch | DMA Hub launches with desktop preview and visible demo notice | Screen capture |
| Navigation | Launcher, Library, Device Center, Diagnostics, and Studio preview render | Screenshots |
| Local profile | Edit, export/import demo JSON and verify browser-local behavior | Sample JSON/observations |
| No unexpected device access | App does not silently enumerate or control devices | Observed behavior |
| Exit/restart | App closes and restarts normally | Start/stop notes |
| Uninstall | Application uninstalls and does not remove unrelated files | Uninstall result |
| Offline behavior | Public release information fails gracefully if network blocked | Screenshot |
| Accessibility | Keyboard navigation/focus and readable sizes | Test notes |

## Automated validation in CI
- `node scripts/check-release-metadata.mjs` ensures alpha tag and version alignment across the root package, desktop package and Tauri config. Refuses a false `installerSigned=true` claim.
- `scripts/verify-windows-installer.ps1` checks installer filename and version, expected PE magic, minimum size and Windows Authenticode status; **NotSigned is allowed only for explicitly labeled test builds**.
- A release job uploads the Windows installer and checksum, downloads both from GitHub Releases, and confirms the fetched installer hash equals the original and the checksum record.
- These integrity gates **do not** prove safety, reliable installation, runtime behavior, code signing or update safety. They do not replace manual VM tests.

## Production gate — still pending
- Obtain and protect an authentic publisher certificate (do not commit private keys).
- Add reproducible code signing and signature verification; introduce a separate signed-release process.
- Provide an authenticated signed update manifest and tested rollback; no automatic unsigned updater.
- Perform representative Windows 10/11 installation/upgrade/uninstall trials and security review.
- Add strict Tauri CSP, device-permission review, support, privacy, crash handling and monitoring.
