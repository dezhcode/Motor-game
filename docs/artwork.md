# KavirSavar — flat 2D artwork v3

The former shaded raster bike, rider and landscapes have been replaced. All mechanical parts and limbs now use authored SVG paths rendered as Pixi vector geometry. Scenery uses four newly generated flat front-elevation cutouts. Sky, mountains, dunes, terrain, shrubs and stones use solid vector shapes.

## Files

- `src/artwork/vectors/*.svg`: 16 original editable parts, no gradients, perspective, filters or bitmap fills.
- `vectorArtwork.ts`: imports SVG source and builds resolution-independent Pixi Graphics.
- `public/assets/art/v3/*.webp`: four local, alpha-transparent architectural scenes (1,029,322 bytes total).
- `artManifest.ts`: original size and alpha-bounded frames for scenery.
- `docs/artwork-v3-prompts.json`: prompts used with the built-in image generator; the assembled bike concept informed the flat palette, while runtime bike paths were authored explicitly for accurate geometry.
- `docs/scene-v3-{1,2,3,4}.webp`: actual renderer captures at four route positions.

Old v1/v2 runtime bitmaps have been removed from the application bundle; earlier prompt files and screenshots are historical references only.

## Shared connections

All measurements are chassis-local pixels, with 44 px/m. SVG paths already use these local coordinates: do not auto-trim them, infer pivots from alpha bounds or apply SVG element transforms. Pixi's SVG parser consumes paths at those exact coordinates.

`src/bike/bikeGeometry.ts` is the single source for attachment positions:

| Connection | X | Y |
|---|---:|---:|
| Rear linkage pivot | -13 | 0 |
| Steering head | 21 | -23 |
| Rear shock top | -18 | -14 |
| Drive sprocket | -8 | -1 |
| Near grip | 18 | -31 |
| Far grip | 15 | -32 |
| Near footpeg | -6 | 2 |
| Far footpeg | -8 | 1 |
| Helmet center | -3.52 | -45.76 |

The helmet center matches the physical collider (-0.08m, 1.04m). A separate balaclava joins the torso to the helmet. Limb origins are at (0,0) and distal bone endpoints at (0,length). Upper arm / forearm / thigh / shin lengths are 13 / 14 / 15 / 17 px respectively; rounded caps overlap these endpoints to hide seams. Hands and boots are separate rigid parts at the grip and footpeg points. Limb scale stays exactly 1; only the cloth torso accommodates a small pose deformation.

## Mechanical animation

- Wheels: center (0,0), physical outer radius 16.28 px; pure side elevation, separate spoke, rim, tire and brake-disc paths.
- Swingarm: connects its fixed bearing to the interpolated rear wheel center.
- Fork: upper tube and lower slider share a straight axis from steering head to front hub; slider, gaiter ribs and axle nut are separate drawn elements.
- Front mudguard: attaches at 34% of that fork axis, with a drawn central bracket.
- Shock: top at fixed bearing, bottom at 59% of the rear arm, spring spacing reacts to compression.
- Chain: tangent runs and arcs around drive and rear sprockets, recalculated as the rear axle moves. The rear sprocket rotates with the wheel.
- Exhaust, engine fins and bolts, tank, filler cap, seat seam, rear mudguard, grips, cable and footpegs are independent drawing layers.

## Landscape

Four unique front-elevation scenes are placed once at x=12, 105, 210 and 315m. A finite mountain silhouette pans without wrap or mirror. All scenery remains in side elevation. Terrain strata follow the actual collision surface with sparse drawn pebbles; no photographic terrain texture repeats.

## Verification

TypeScript, 17 regression tests and production build pass. Tests cover IK endpoint contacts and fixed bone lengths, chain tangency throughout suspension travel, helmet/collider alignment, initial tire clearance, local asset completeness and SVG restrictions. Chromium review checks lean -1 / 0 / 1, all four landmarks, resource errors, multi-touch controls, pause and portrait handling. Physical phone performance still requires installation testing.
