
## Demo repair and page simplification

- [x] Identify why the live demo controls are not behaving reliably.
- [x] Fix the demo state flow for start, pause, re-optimize, incident simulation, zone selection, and algorithm selection.
- [x] Remove sections 8 and 9 from the rendered page and navigation.
- [x] Remove the website footer and make section 12 the final visible section.
- [x] Re-run TypeScript/build checks and verify the repaired demo in the browser.

## Raipur OpenStreetMap live-demo rebuild

- [x] Audit the live demo behavior and section numbering from 01 through 12.
- [x] Select a random Raipur road area and retrieve its OpenStreetMap road geometry.
- [x] Convert the road geometry into a stable frontend route dataset with source attribution.
- [x] Rebuild the live demo controls so route selection, movement, incidents, and re-optimization visibly work.
- [x] Correct section numbering and navigation order so the narrative runs cleanly from 01 to 12.
- [x] Verify desktop/mobile behavior, interactions, source attribution, and production build output.

## Local image asset availability

- [x] Inventory the generated image files and all current image references.
- [x] Keep persistent local source copies in the supported shared asset directory.
- [x] Add project-local asset documentation and verify every referenced image is accessible.
- [x] Save the updated project revision.
