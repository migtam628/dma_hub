# Xbox field QA workbook — Call of Duty (Alpha 31)

**Scope:** An optional field-testing notebook at [DMA Hub Xbox QA](https://dma.moobee.lol/#/games/call-of-duty/xbox-qa) for a real Xbox Series X, Series S, Xbox One, One S, or One X. This does **not** use a privileged Xbox SDK, game memory access, unapproved controller interface, or console firmware changes. No game cheat module is present.

## Why this exists

Official Xbox/Activision pages establish *published game availability* for editions, not that the DMA Hub website will actually navigate well using an Xbox controller, that downloads work in Xbox Edge, or that any hardware/software supports a particular installed build. The [platform matrix](call-of-duty-xbox-pc-matrix.md) distinguishes these. This tool documents **manual test observations** on exact physical consoles without inventing a result.

## Quick-start field procedure

1. From the **actual console**, open Microsoft Edge and navigate to \`https://dma.moobee.lol/#/games/call-of-duty/xbox-qa\`. If browser navigation fails, conduct the log from an optional companion PC and truthfully mark Edge navigation **failed** or **blocked**.
2. Choose the precise Xbox model. No default console is assumed. Choose the installed Call of Duty edition (Warzone, MW II–IV, or BO6/7); record actual displayed game build/version rather than a marketing season number.
3. Record the Xbox OS version/build in Settings, test date, controller, and display.
4. Test each item and mark **Not tested / Observed pass / Observed failure / Blocked / Not applicable**:
   - Edge loads the site; Xbox controller navigation and focus; readable display; setup-form typing;
   - local questionnaire persistence; TXT export/copy; browser print/PDF, where supported;
   - optional Microsoft-approved Xbox Remote Play to a PC; optional ordinary, authorized HDMI capture.
5. Describe observed actions/results in at least 10 characters. Optional HTTPS evidence links must not contain credentials. Never paste Xbox passwords, session tokens, credit-card data or personal screenshots.
6. Only check the **personally tested on physical hardware** box after those actions actually occurred. A local observation requires real console model, game, installed version, Xbox OS build, test date, explanatory notes and at least one observed pass/failure/blocker.
7. Save locally, export TXT or JSON, or copy the report. If the Xbox browser cannot export, record the results on an associated companion computer and mark the failed export check accordingly.
8. Re-run and record an **independent new observation** after each console OS, game build or browser update. Existing locally saved reports are not silently promoted as current.

## Data handling and limitations

- All draft answers and up to 25 saved observations are held in this browser's **localStorage**, if available. Nothing is uploaded to DMA Hub, Microsoft, Activision or the API. Local reports are not a trusted immutable audit log and can be edited or lost if browser storage is cleared. Export important findings securely.
- JSON import accepts the versioned \`schemaVersion:1\` fields, validates actual console model, title, date, observed statuses and HTTPS evidence links, and discards unknown keys. A report imported from elsewhere is **not authenticated proof of testing**.
- A successful website test means only the operator reported the website functioned on that machine. It is **not independent Xbox certification**, live backend availability, game software compatibility, verified download support, or legal permission to manipulate gameplay.
- Game availability is based on a dated publisher listing. The UI warns about MW4's missing Xbox One support and the announced Warzone Xbox One service retirement; the notebook cannot check live services.
- The **Windows NSIS launcher is not an Xbox app**. Accounts, tickets, entitlements and real commerce still require a production-grade API not yet deployed. No direct console memory DMA, aim/input automation, bypass, device spoofing, or game cheat is supported.
- This alpha does not claim a hardware test has actually been performed. Results must be supplied by an authorized operator on a real device.

## Verification before claiming Xbox browser compatibility

A release acceptance report should include an actual console model and console OS, Call of Duty edition/build, test date, browser/Edge version if discoverable, controller type, statuses for all applicable UI steps, logs/screenshots from authorized sources, failure/retest resolution and a separate software-rights statement if relevant.

Code-level tests cover data validation and fail-closed claims. They **do not replace a console-in-hand test**. Only after this evidence should an exact browser feature be described as manually tested on a specific console/build.

References: [Xbox/PC game and capabilities matrix](call-of-duty-xbox-pc-matrix.md), [publisher enforcement policy](https://support.activision.com/articles/call-of-duty-security-and-enforcement-policy), [official Microsoft Edge Xbox overview](https://www.microsoft.com/en-us/edge/learning-center/how-to-use-microsoft-edge-on-xbox).

## Optional private API handoff (Alpha 32)

Once a genuine operator report has been prepared, export its v1 JSON and transfer it securely to an authorized administrator of the **local** DMA Hub API. The administrator can choose the report in **Admin → Xbox QA Intake**, review its preview, explicitly import, and record triaged/retest-required history. This is **not automatic synchronization** and never certifies a game or console. [Private intake instructions](xbox-qa-private-intake.md).
