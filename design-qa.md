# Alipo Mobile Filters — Design QA

- source visual truth path: not provided
- implementation: browser-rendered local build at `http://localhost:3100/`
- implementation screenshot path: unavailable; inspected directly in the Codex in-app browser
- viewport: 664 × 664 CSS px
- source pixels: unavailable
- implementation pixels: 664 × 664 at device scale factor 1
- density normalization: not applicable
- state: English, Lilongwe, list and map views

## Full-view comparison evidence

No source mockup, Figma frame, or reference screenshot was supplied, so a fidelity comparison cannot be completed. The rendered implementation was inspected directly. Fuel selection now occupies one clear segmented row with the list/map control, while availability filters occupy a separate horizontally scrollable row.

## Focused region evidence

The mobile search and filter region was inspected at readable scale. Search copy is “Search station or area”; fuel buttons do not wrap; controls retain 40px heights; radius remains available in the horizontally scrollable location row. Map selection, viewport anchoring, and empty-map dismissal were exercised in the browser.

## Findings

- No actionable implementation P0/P1/P2 issue remained in the inspected filter region.
- Formal source-to-implementation fidelity remains unassessable because no source visual target exists.

## Comparison history

1. Initial implementation: fuel, status, radius, and view controls competed in one row; “All fuel” wrapped.
2. Fix: separated fuel/view controls from status filters, shortened “All fuel” to “All,” moved mobile radius into the location row, and removed “brand” from search copy.
3. Post-fix evidence: browser inspection showed an uncluttered two-level filter hierarchy with single-line controls and working map anchoring.
4. Interaction fix: empty-map dismissal was moved to the map wrapper capture boundary after the MapLibre click layer proved inconsistent.

## Required fidelity surfaces

- Fonts and typography: existing Alipo families and weights preserved; mobile filter labels remain legible and unwrapped.
- Spacing and layout rhythm: primary controls and status filters now have distinct rows and consistent gaps.
- Colors and visual tokens: existing forest, orange, ivory, muted, and semantic status colors preserved.
- Image quality and asset fidelity: logo and map assets unchanged.
- Copy and content: search prompt simplified; fuel filter labels shortened without changing meaning.

## Final result

final result: blocked

Blocker: no source visual target was supplied for the required fidelity comparison.
