# Debug Session: PMYMS Fullscreen Blank

Status: OPEN
Session ID: `pmyms-fullscreen-blank`
Date: 2026-07-07

## Symptom
- PMYMS loads correctly while DevTools responsive/inspect mode is open.
- In fullscreen/normal browser mode, the editor page becomes blank.
- MES loads properly under the same conditions.

## Initial Hypotheses
1. PMYMS data includes a section/item shape that only appears in fullscreen layout and causes `DocumentPreview` filtering/rendering to call `.trim()` on a non-string value.
2. A responsive/fullscreen branch renders additional preview content that PMYMS reaches but MES does not, exposing malformed data.
3. The PMYMS document payload contains mixed array/object entries, and a render helper assumes every item is a string.
4. A width-dependent memo/filter path in `DocumentPreview` changes the processed data source between inspect and fullscreen modes.
5. An uncaught render-time exception in `DocumentPreview` collapses the React tree, making the page appear blank only when the fullscreen layout mounts that subtree.

## Evidence To Collect
- Runtime stack traces around `DocumentPreview.tsx`.
- The exact PMYMS section/item payload shape reaching the failing filter/map logic.
- Whether fullscreen mode mounts different preview blocks/components than inspect mode.
- Whether MES payload avoids the problematic item shape.

## Plan
1. Inspect the failing component and surrounding data pipeline.
2. Add minimal instrumentation only around the suspected render/filter path.
3. Reproduce and compare PMYMS vs MES evidence.
4. Implement the smallest safe fix once the root cause is confirmed.
5. Verify fullscreen and inspect mode both render correctly.
