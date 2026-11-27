# Reactive rider head (v6)

The approved raster motorcycle/rider art now uses an integrated body and suspension, two independent matte black wheels, and a separate head without a scarf. The body neck extends beneath the helmet/beard. The head rotates about `(721, 282)` in the original body canvas; it never independently translates, so the joint cannot float apart. Registration and source canvas sizes are in `src/bike/riderSpriteGeometry.ts`.

`BikeRig` positions both wheels from Planck poses and fits the intact body to their axle frame with uniform scale. Forks and shocks remain inside the body PNG. `HeadDynamics` receives measured horizontal/vertical velocity, chassis pitch/angular velocity, landing strength and obstacle collision events. It produces a bounded (±6°), damped rotation; it contains no time-driven idle animation. It does not change physics bodies, colliders, controls or track geometry. Nonplaying frames pass `dt=0`; restarting resets the spring. Impact events are consumed once by `PhysicsWorld`.

Run `npm ci`, `npm run typecheck`, `npm run test:physics`, `npm run build`.

Generate the standalone, offline HTML preview with `node scripts/head-motion/preview.cjs /absolute/output/KavirSavar_Head_Test.html`. It embeds the same controller and PNGs; its controls supply a simplified test telemetry stream. The actual game uses real Planck telemetry. Optional frame rendering uses `node scripts/head-motion/render.cjs /absolute/output/preview` and requires `@napi-rs/canvas` in the renderer environment.

The sources are on `codex/development`. `main` and its Studio APK bundle are not replaced. A web build does not update an already installed APK; a development APK must be built from these sources separately.
