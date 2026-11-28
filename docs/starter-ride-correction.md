# Starter ride correction

This follow-up corrects four issues in the previous ride refinement.

1. Pedal extensions now reuse the exact row of each normal/pressed source image's shaft. The source image is clipped at row 540 and its own bevel, outline, alpha edges and metal colors continue to the screen edge through an SVG image viewport. The imitation CSS gradient/border is removed. No pedal plate or icon is repainted. The existing source frames remain 349x600 (brake) and 360x600 (gas).
2. Pedals are farther from the instruments: the responsive gauge-to-pedal gap increases from 8.5% of screen width to 18%, bounded by the available viewport and existing size preferences.
3. BikeRig now forwards the effective gas/brake state to HeadDynamics. Previously the controls argument was ignored and only physical telemetry drove the head. Press/release transitions now create a directional kick, held input contributes load, and acceleration/landing/obstacle gains are stronger. The softer spring uses stiffness 45, damping 4.6 and an 18-degree neck-pivot safety bound. Rest adds no idle motion and pause remains frozen.
4. The game and training use FIRST_STAGE_PHYSICS_CONFIG: motor torque 92 instead of 138, target wheel speed 31 instead of 47 rad/s, and progressive drag above 11.5m/s. Flat-road top speed is about 41km/h. The governor adds physical force rather than overwriting velocity. Existing suspension, course geometry, obstacles and two-pedal pitch control remain unchanged. The base physics configuration remains available for independent physics checks and future vehicle tuning.

Validation: 53 Vitest checks cover stronger direct gas/brake head reactions, stronger impacts, rest/pause/FPS stability, slower acceleration and flat top speed, full completion of the existing course using only two pedals at the lower speed, and the four-step tutorial under the same starter configuration. TypeScript, production build and browser visual/interaction checks also pass.
