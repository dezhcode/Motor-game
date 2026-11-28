# Nine-slice garage and upgrades

The home retains the existing desert/logo/jumping-rider artwork. The garage shows one vehicle at a time, with category tabs and arrows. The upgrade screen uses a bike showcase and four part cards.

`nineSliceGrid` supplies one pixel-aligned 3×3 grid for every `BitmapSurface`: corner crops scale uniformly, edges stretch along one axis, and only the middle stretches along both axes. Panels use 190 source pixels; action/icon skins use 360, clamped to their native dimensions. Destination corners are capped so even small controls cannot overlap. All faces are original raster pixels, with separate normal and pressed assets. Typography stays live Persian text with the embedded font and glyph-based alignment.

Keep the resolved `backgroundImage` URL lookup: production CSS image URLs are relative to the emitted stylesheet. Reading the raw custom property would break the GitHub Pages asset path.

New art is documented in `nine-slice-art.json`. Each component was generated independently; none is cut out of a supplied screen. Runtime WebP files preserve native dimensions. The sport riding body preserves the registered head/wheel assembly; the buggy uses registered independent wheels.

Four vehicles are selectable. Existing coins, selected vehicle and jeep ownership remain valid. Each owned vehicle has independent levels 1–8 for engine, tires, suspension and tank. Purchases save coin deduction and level together, reject stale double taps, and affect torque, friction, suspension or fuel consumption on the next ride. The existing jeep price remains 300 for continuity; new sport and buggy prices are 8,000 and 25,000.

Validation: TypeScript, 88 gameplay/storage/geometry tests, and `scripts/verify-menu-ui.cjs` against a compiled `/Motor-game/` deployment. The browser audit checks six landscape sizes, loaded pixels, nine regions per surface, text bounds/centering, raster density, pressed-state pixels, persistence, purchase cancellation and real coin pickups with all four vehicles. Currency fixtures belong only to the isolated test browser.

## UI loading and press refinement

Stat meter tracks and fills now use the same nine-slice raster compositor as the menu frames. Unselected vehicle cards use their own pressed panel artwork, and releasing outside the control restores the normal pixels without moving its hit area.

Pressed artwork is preloaded from resolved CSS URLs into the same decoded-image cache used for drawing. This avoids loading a second public-path copy of an already emitted Vite asset. Failed image requests retry twice (after 250 and 750 ms); after a persistent failure, an online event retries the affected surfaces. Retries preserve the previous face while a different state loads and never replace raster art with generated CSS shapes.

The browser audit also exercises dark controls, square icons, silver arrows, selected and unselected cards. A separate session aborts image requests to verify both automatic retry and recovery after connectivity returns.


## Single-vehicle garage

The category buttons switch between motorcycles and cars. Both arrows wrap within the active category. The price and the difference from the available balance are in the specifications panel; existing purchase and upgrade actions are below the large preview.

The generated open-center silver trim is `public/assets/art/ui-bitmaps/garage-spec-panel.webp` (1122 × 1402, WebP). It uses the nine-slice compositor over the existing opaque navy panel texture, allowing the name, description, seller status, rating bars and coin values to update independently. The annotated screenshot was a style reference; the frame was generated separately using the built-in image generator. The prompt asked for an orthographic satin-silver race-game panel with compact corners, restrained navy shading, transparent exterior, and no lettering, icons, or scenery. A second render refined the inset and edge treatment.
