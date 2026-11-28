# Pickup delivery feedback

Coin/fuel collection uses the existing swept contact detection and original pickup sprites. Each newly collected item emits one event with its actual reward amount; fuel is capped at capacity. Physics rewards apply immediately, including fuel needed to continue riding.

A separate screen-space Pixi layer launches the collected sprite from its current camera-projected position and accelerates it along a curved path into the matching top-left HUD icon. Coins use gold flecks, a short trail and gentle spin; fuel uses turquoise flecks and a light wobble. At arrival the destination icon pulses and the displayed credit appears. The new top-left fuel percentage and existing bottom fuel dial share the same displayed value.

HUD targets are measured from the real icon bounds and updated on resize, including safe-area positioning. Camera motion does not drag a flying pickup away from its screen path. The effect is bounded to 32 flights; excess rewards display immediately. Reduced-motion skips travel and pulse animation.

Pausing freezes pending deliveries; resume continues them. Restart clears all pending flights and credits. Crash/finish settle outstanding display credits before showing the result overlay. No currency, fuel, track or bike tuning changed.

Coin sound is a short layered metallic ping with a bounded rising streak; fuel has a distinct lower bubbling/rising refill cue. Web Audio synthesis works offline without extra downloads. Both respect saved sound settings, bounded polyphony, lifecycle pause and restart cleanup. No claim of physical-device loudness tuning; review the balance on the target phone.

Validation: contact event uniqueness, fuel-cap amount, independent delivery timing, pause with zero dt, no duplicate arrival, reset, bounded queue, exact flight endpoints, distinct bounded audio cues, existing complete-course physics regression. Browser QA verified visible coin flights, count updates, fuel refill, pause/resume, restart, mute toggle and the lowered splash logo.
