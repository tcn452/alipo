# Alipo Next.js redesign QA

## Source comparison

- Source: `Photo 3.jpg` supplied by the user, supported by the two Alipo logo references.
- Implementation: public Next.js fuel discovery and reporting experience at `http://localhost:3000`.
- Side-by-side artifact: `design-qa-comparison.png` (local QA artifact, intentionally gitignored).

## Visual intent retained

- Deep forest green, warm ivory and orange fuel accent palette.
- Alipo mark and campaign language as the primary identity.
- Map-led fuel discovery, visible availability and queue states, and a focused report flow.
- Calm, high-trust utility character adapted from mobile to a wider responsive workspace.

## Responsive and interaction checks

- Desktop: hero, filter command bar, station list, map and selected-station detail panel reviewed at 1440px.
- Mobile: header, hero, horizontally scrollable filters, status rail and station list reviewed at 390px.
- Search filters station name, area and brand.
- City and availability filters update both station count and results.
- Station selection is reflected on the live map.
- Report modal opens, changes status, fuel type and queue selection, and closes correctly.
- PocketBase downtime falls back to built-in station data without interrupting the public experience.

## Issue review

- P0: none.
- P1: fixed unhandled PocketBase realtime connection rejection while offline.
- P1: fixed narrow-screen header and status rail overflow.
- P2: replaced the text glyph map marker with the supplied Alipo visual asset.

## Result

final result: passed
