# KavirSavar — Original Art Pack v1

Original images were generated for KavirSavar using the built-in image generation tool.

## Runtime files

All 12 production images are in `public/assets/art/v1/` in WebP format. Bike parts, rider and scenery cutouts retain alpha transparency. The originals are preserved separately in the downloadable art pack as PNG files.

| File | Purpose |
|---|---|
| bike-chassis.webp | Frame, engine, tank, seat, fenders and headlamp |
| bike-wheel.webp | Independent rotating wheel, reused front/rear |
| bike-fork.webp | Front fork attached to the real wheel center |
| bike-swingarm.webp | Rear linkage with independently moving axle |
| bike-shock.webp | Coil-over shock attached between frame and linkage |
| rider.webp | Crouched rider with hip-based lean feedback |
| sky.webp | Full opaque sky background |
| far-mountains.webp | Transparent distant mountain panorama |
| kaluts-village.webp | Transparent midground cliffs and Iranian desert village |
| rock.webp | Sandstone roadside decoration |
| shrub.webp | Desert vegetation decoration |
| sand-texture.webp | Repeating cutaway terrain material |

## Integration

- `src/artwork/artManifest.ts` records original image dimensions and runtime frames, so transparent margins are removed without changing source files.
- `src/artwork/GameArtwork.ts` preloads bundled relative URLs. No remote image service or API is required at runtime.
- `src/bike/BikeRig.ts` maps independent image parts to interpolated physical centers.
- `src/track/TrackBuilder.ts` draws the exact terrain silhouette with the painted material and repeats mirrored panoramas to avoid a visible edge seam.
- `src/camera/FollowCamera.ts` brings the art closer while keeping enough view ahead on landscape phones.
- Physics and drive parameters are unchanged by this art update.

The complete generation prompts are in `docs/artwork-prompts.json`.
