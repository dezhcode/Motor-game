# Interactive desert loading screen, revision 2

New airborne hero redrawn from a low front three-quarter camera. The original home/menu hero and gameplay bike are unchanged.

Layout follows the supplied reference in landscape: airborne hero centered high (x 26%, width 52%, top 1.5%, height 80%); logo middle-right (right 15%, top 41%, width 32%); progress bar centered low (x 51%, bottom 14px, width 24vw). Gyro parallax remains gentle. Portrait uses a stacked composition.

Only artwork and progress are visible: no buttons, slogans, percentage text, motion hints or status captions. Exceptions: a concise error message if an image fails, without a button. Normal startup dismisses automatically after all assets and renderer are ready, minimum 2 seconds. `?loading=preview` holds the scene without controls for art/motion review; remove the query to launch normally.

## New generated raster assets

- `public/assets/art/loading/hero-airborne-v2.webp`: new low-angle jump, transparent, 1536×1024, WebP quality 90.
- `public/assets/art/loading/progress-frame-v2.webp`: generated atlas crop (25,200,1510,480), 1485×280, WebP quality 92.
- `public/assets/art/loading/progress-fill-v2.webp`: same atlas crop (82,705,1455,796), 1373×91, WebP quality 92.

Frame and fill are two separate raster sprites. The frame remains visible; a fixed-sized enamel strip is revealed inside its trough based on actual loaded-file progress, so its texture does not squash at low values. No artwork was repainted procedurally. Prompts are recorded in `loading-v2-prompts.json`; originals retained in the image generation output.

Existing backdrop and new Persian wordmark from revision 1 remain. Progress counts all five splash images and bundled game textures; renderer readiness is required. URLs remain local and relative to document.baseURI for Pages and Capacitor.

Device orientation is baseline-calibrated and mapped to screen angle, bounded and smoothed via RAF. Listeners/RAF clean up, pause when hidden, and respect reduced motion. No sensor permission is requested on the loading screen. Browsers needing a fresh gesture-bound grant use pointer/touch fallback until permission exists; supported Android devices can use orientation events directly. Physical sensor response still needs review on a phone.

API reference: https://www.w3.org/TR/orientation-event/
