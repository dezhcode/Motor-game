# KavirSavar illustrated home

A full-screen menu based on the supplied racing-game reference: upper-left wordmark, large airborne rider at center-right, compact parchment route plaque at upper-right, and a stepped arrangement of cream menu tiles at lower-left. Persian text, gold/turquoise palette, Iranian windcatcher architecture, and local desert art match the game's approved concept.

Working actions: start (preserves first-run tutorial), replay driving tutorial, view the existing locally stored best time, and open existing settings. The record dialog traps focus with native modal behavior, closes with Escape or its return button, and restores focus. No store, fake countdown, multiplayer or tournament functionality is implied.

The rider is a dedicated rendered title-screen illustration, not the gameplay sprite assembly. It depicts the same turquoise motorcycle, bearded rider, cream/orange helmet and tan riding clothes in a foreshortened front three-quarter jump with golden rim lighting, headlamp gleam, translucent dust and speed streaks. The PNG has genuine alpha and is packaged as high-quality WebP. It does not modify the gameplay artwork, head dynamics, suspension or physics. All menu imagery ships locally and works offline in the development web/Capacitor build. Environment and logo textures total approximately 357 KiB.

`preview.webp` is the actual rendered 1536×707 menu; `mobile-preview.webp` is the actual rendered 844×390 menu. UI checks cover 640×360, 844×390, 1280×720 and 1536×707, minimum 48px targets, menu target separation, tutorial/race transitions, settings, empty records and Escape dismissal. Existing 40 physics/gameplay tests pass, along with TypeScript and production build.

Artwork: built-in image generation, guided by the user-supplied original KavirSavar scene. Environment prompt: panoramic painted 2D Iranian central desert, clear turquoise sky for top-left logo and large center-right rider, distant lavender mesas, golden dunes, small adobe windcatcher village and palms, bottom rocky ledge, no characters, text or UI. Logo prompt: exact Persian word «کویرسوار», amber front faces, chocolate outline, orange lower shadow, tiny dune, rising sun and two date palms, transparent background, no plaque or subtitle. PNG generation masters are retained separately; optimized WebP files are in `public/assets/art/home`.

The hero generation prompt and design constraints are recorded in `hero-art-direction.md`. The hero is static artwork; its built-in light/dust effects are part of that illustration.
