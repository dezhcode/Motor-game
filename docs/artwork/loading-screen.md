# Interactive desert loading screen

Development branch only. New original generated background and Persian wordmark; existing promotional hero remains separate from gameplay sprites.

- Background: `public/assets/art/loading/desert-splash.webp` — 1672×941, WebP quality 88.
- Wordmark: `public/assets/art/loading/kavirsavar-wordmark.webp` — transparent alpha, WebP quality 90. Text: کویر / سوار.
- Hero: existing `public/assets/art/home/hero-jump.webp`. No gameplay bike art changed.
- Progress: completed bundled game textures plus the three splash images; engine readiness is required before dismissal. Minimum display 2 seconds.
- Review mode: `?loading=preview` keeps the loading screen open, with an enter button when ready. Normal launches dismiss automatically.
- Motion: baseline-calibrated deviceorientation, screen rotation mapping, bounded parallax, smoothed via RAF. Permission requests are only made after an explicit button press on platforms requiring them. Pointer/touch movement provides a fallback. Reduced-motion disables animation and tilt.
- All assets resolve relative to document.baseURI for Pages subpaths and offline Capacitor. No external image/font requests.

Orientation API reference: https://www.w3.org/TR/orientation-event/

Generated originals retained in the session; repository assets are optimized encodings of those originals, without repainting.
