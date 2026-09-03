# Alipo Mobile Design QA

## Comparison target

- Source visual truth: `C:\Users\Timothy\.codex\codex-remote-attachments\01a066db-2dab-7eb2-92da-cd9fbb1e33de\FEFE878C-B717-4EE6-A61A-64CA888D3474\3-Photo-3.jpg`
- Brand assets: `1-Photo-1.jpg` and `2-Photo-2.jpg` from the same attachment folder.
- Browser-rendered implementation screenshots:
  - `design-qa-home-screen-final.png`
  - `design-qa-detail-screen-final-v2.png`
  - `design-qa-report-screen-final-v2.png`
- Combined comparison evidence: `design-qa-comparison-final-v2.png`
- Source pixels: 1280 x 853.
- Implementation pixels: 393 x 852 per screen.
- CSS viewport: 393 x 852 at device scale factor 1.
- Density normalization: implementation screens were captured at their native CSS size. The source board was kept at its native 1280 x 853 size and combined with the three 393 x 852 captures in one 1280 x 1800 comparison board.
- State: signed-out public consumer flow using realistic offline seed data; home, selected station detail, and default report form.

## Browser verification

- Home search and clear controls worked.
- Opening the nearest-station card displayed the station detail sheet.
- The detail CTA navigated to the report screen.
- Fuel-situation, fuel-type, and queue selections changed state correctly.
- The note field accepted text and enforced the visible character-count pattern.
- Submit reached the success state and returned to Home. PocketBase was not listening locally, so this exercised the app's intended offline fallback without writing a backend record.
- The final browser console check had no errors. One React Native Web `pointerEvents` deprecation warning remains as non-blocking framework noise.

## Full-view comparison evidence

The final combined board shows the source and implementation together. The implementation matches the source's main composition: forest header, warm ivory canvas, inset search and pills, pastel map with semantic pins, compact station/report cards, tab navigation, page-sheet detail view, and large report-choice targets. The implementation intentionally omits the device bezel and status-bar artwork because those belong to the device/runtime rather than the app UI.

Focused region comparison was not required after the final pass because the three 393 px captures keep typography, controls, icons, map, cards, and footer actions legible in the combined board.

## Required fidelity surfaces

- Fonts and typography: heavy rounded system weights reproduce the reference hierarchy, with compact secondary copy and tabular price numerals. Exact branded font files were not supplied, so the app uses platform system fallbacks.
- Spacing and layout rhythm: 14-20 px cards, continuous rounded controls, compact 8-18 px gaps, and fixed bottom actions closely follow the source density without clipped controls.
- Colors and visual tokens: forest `#073F2B`, warm ivory `#F7F4ED`, off-white surfaces, sage status fills, orange petrol accents, and muted red/amber states are centralized in `lib/theme.ts`.
- Image quality and asset fidelity: the supplied logo photos are retained as source assets; the map is a purpose-made high-resolution raster asset in the same muted illustration style. No visible logo or map asset is recreated with CSS or placeholder art.
- Copy and content: key source copy is preserved, including “Find fuel. Share updates. Keep Malawi moving.”, “Puma Area 47”, fuel/queue labels, MWK prices, and the report encouragement.

## Comparison history

### Pass 1 - blocked

- [P2] Station detail lacked the source's details and recent-report density, leaving too much blank space.
- [P2] The detail CTA was not persistently visible in the browser-rendered page sheet.
- [P2] Home filters omitted the source's explicit All control.
- [P2] Initial evidence included transient development refresh chrome.

Fixes: added the details table and recent report, pinned the detail CTA to the bottom with reserved scroll padding, added the All pill, hid the detail scroll indicator, and recaptured after the development refresh settled.

### Pass 2 - passed

Post-fix evidence in `design-qa-comparison-final-v2.png` shows all three screens at the same viewport with the previously missing regions and persistent CTA visible. No actionable P0, P1, or P2 differences remain.

## Follow-up polish

- [P3] A supplied production font would improve the last bit of typographic fidelity.
- [P3] The existing Expo SDK emits a React Native Web deprecation warning that does not affect layout or interaction.

## Implementation checklist

- [x] Apply supplied Alipo branding and visual palette.
- [x] Rebuild map-led Home experience.
- [x] Add interactive station details.
- [x] Rebuild report form and success flow.
- [x] Verify 393 x 852 browser rendering and primary interactions.
- [x] Export the Expo web bundle successfully.

final result: passed
