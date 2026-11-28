# Ride presentation and two-pedal controls

This update addresses the eight issues reported against the painted-desert APK. It keeps the original course geometry, physical obstacles, rider artwork, home menu and separate Studio main project.

- Pedal plates retain their registered normal/pressed art. A matching metal stem extends beyond the viewport, so increasing the bottom margin cannot expose a floating rounded end. The inactive/active plate images remain mounted for instant response.
- Only brake and gas remain in the HUD and settings preview. Gas raises the physical front axle and brake lowers it. Ground pitch assist is relative to the road slope and bounded; airborne pedal input applies bounded angular-rate control. Brake takes precedence when both pedals are held. Legacy keyboard balance input remains supported, but no separate balance button is required. Tutorial instructions and course hints now describe the two pedals.
- The pedals flank the instrument cluster with responsive clearance. Existing control size, opacity and margin preferences continue to apply.
- Camera base magnification increases from 1.45 to 2.15 (about 48% closer), with a bounded speed/descent pullback. Initial camera framing accounts for viewport size; tracking keeps the enlarged motorcycle in the left riding corridor.
- Head inertia is underdamped: spring 64, damping 6.5, stronger acceleration/impact coupling and an 11-degree safety limit instead of 6 degrees. Measured telemetry still drives motion; pause freezes it and rest adds no artificial idle wobble.
- The village is a single finite panorama that starts beyond the right edge, passes across the scene and exits fully left by the end. Distant mesas/dunes retain slower parallax.
- Coin trails have seven items spaced 0.95m apart, with short gaps between trails. Coins sit 0.55m above the sampled road; fuel sits 0.62m above it. Fuel replaces a coin periodically. Trails omit deep pits and steep discontinuities; swept collection and per-run reset remain intact.
- Eight newly drawn scenery props provide three boulder styles, pebble scatter, leafy shrub, dry grass, sage scrub and a warning sign. They are arranged at varied sizes along the road edge and in the soil cutaway. These added details are decorative; existing crates, barrels, cones and saws retain their physical collision behavior. Existing direction signs are smaller to suit the closer camera.

Validation: TypeScript, production web build, 48 Vitest cases including real physical pedal pitch, closer camera/controls, finite village traversal, lower/closer pickups and visible head rebound. The four-step tutorial test now completes using only the two pedals. Browser checks covered HUD button removal, full-height stems, actual gas hold/release, increased coin count, fuel pickup and the closer scenery view.

Scenery art was generated with the built-in image generator from the original KavirSavar style reference. No new motorcycle/store implementation is part of this update. Per-cell alpha bounds and WebP export metadata are recorded in `public/assets/art/painted/scenery-provenance.json`.
