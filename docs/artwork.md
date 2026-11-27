# KavirSavar — layered artwork v2

28 bundled WebP textures, 2,661,004 bytes total. Nineteen new transparent sprites replace the former composite bike, rider and repeated village. Nine v1 textures remain in use. Original PNG files and both prompt sets are available in the downloadable v2 pack.

## Scenery progression

| World X (m) | Unique artwork | Parallax factor |
|---|---|---|
| 12 | Adobe village with windcatcher | 0.34 |
| 105 | Stepped hillside houses | 0.34 |
| 210 | Caravanserai courtyard facade | 0.34 |
| 315 | Palm oasis and farmhouse | 0.34 |

`SceneryPlan.ts` positions each landmark once. There is no modulo, wrapping or mirrored architecture. Distant mountains pan across one oversized finite panorama throughout the level. Separate sky, mountains, sandstone arch, architecture and near dune sprites move at different depths. Terrain material and small natural roadside decorations remain reusable textures.

## Motorcycle assembly

`BikeRig.ts` uses chassis-local pixels, with 44 pixels per physical meter:

| Attachment | Local position / behavior |
|---|---|
| Rear linkage pivot | (-13, 0); follows rear hub |
| Steering head | (22, -25); fork follows front hub |
| Rear shock top | (-17, -14); lower end follows linkage |
| Engine | (-1, -9), independent sprite |
| Tank | (3, -24), independent sprite |
| Seat | (-18, -21), independent sprite |
| Rear mudguard | (-34, -16), independent sprite |
| Front mudguard | Above the interpolated front hub with separate braces |
| Headlamp | (27, -28), independent sprite |
| Chain and rear sprocket | Follow rear hub; sprocket rotates with rear wheel |

Frame source bearing centers are calibrated with anchor (0.346, 0.892). Wheel sprites rotate around their centers. Suspension, wheel radii, masses, torque, gravity and collision shapes are unchanged.

## Articulated rider

`RiderRig.ts` uses six transparent source sprites to create ten rendered parts: helmet, torso, and two segments for each of four limbs. Far limbs render behind the bike; torso, near limbs and helmet render above it. Exact two-bone IK keeps hands at (17, -35) / (14, -36), and boots at (-4, 2) / (-7, 1). The hip and torso react smoothly to lean input and suspension compression.

`rigGeometry.ts` contains independently testable pose and IK math. All tested lean and compression combinations preserve bone lengths and hand/foot attachment points.

## Files and validation

- `artManifest.ts` records texture dimensions and alpha-bounded frames; `GameArtwork.ts` preloads all bundled URLs before play.
- v2 generation prompts: `docs/artwork-v2-prompts.json`; retained v1 prompts: `docs/artwork-prompts.json`.
- `npm run typecheck`, `npm run test:physics` (13 tests) and `npm run build` pass.
- Chromium smoke: no page errors or failed resource requests; two simultaneous touch controls, release, pause and portrait guard checked.
- Actual Pixi renderer reviewed at x=4, 105, 210 and 315 m; a different landmark is visible at each point. Rider assembly reviewed at lean -1, 0 and 1.
- Desktop browser verification is not a physical Android device test.
