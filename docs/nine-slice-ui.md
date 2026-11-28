# Nine-slice garage and upgrades

The home retains the existing desert/logo/jumping-rider artwork. The garage follows the supplied four-card vehicle layout and the upgrade screen uses a bike showcase and four part cards.

`nineSliceGrid` supplies one pixel-aligned 3×3 grid for every `BitmapSurface`: corner crops scale uniformly, edges stretch along one axis, and only the middle stretches along both axes. Panels use 190 source pixels; action/icon skins use 360, clamped to their native dimensions. Destination corners are capped so even small controls cannot overlap. All faces are original raster pixels, with separate normal and pressed assets. Typography stays live Persian text with the embedded font and glyph-based alignment.

Keep the resolved `backgroundImage` URL lookup: production CSS image URLs are relative to the emitted stylesheet. Reading the raw custom property would break the GitHub Pages asset path.

New art is documented in `nine-slice-art.json`. Each component was generated independently; none is cut out of a supplied screen. Runtime WebP files preserve native dimensions. The sport riding body preserves the registered head/wheel assembly; the buggy uses registered independent wheels.

Four vehicles are selectable. Existing coins, selected vehicle and jeep ownership remain valid. Each owned vehicle has independent levels 1–8 for engine, tires, suspension and tank. Purchases save coin deduction and level together, reject stale double taps, and affect torque, friction, suspension or fuel consumption on the next ride. The existing jeep price remains 300 for continuity; new sport and buggy prices are 8,000 and 25,000.

Validation: TypeScript, 88 gameplay/storage/geometry tests, and `scripts/verify-menu-ui.cjs` against a compiled `/Motor-game/` deployment. The browser audit checks six landscape sizes, loaded pixels, nine regions per surface, text bounds/centering, raster density, pressed-state pixels, persistence, purchase cancellation and real coin pickups with all four vehicles. Currency fixtures belong only to the isolated test browser.
