# Standalone image UI

51 individually generated raster assets in `public/assets/art/ui-bitmaps/`. The approved concept images were used only as style references; no artwork was cropped or extracted from them. Frames, buttons, icons, mode illustrations and pedal shafts use complete image files. Normal and pressed button/card states have separate generated textures. Live labels, wallet counts, prices and records remain selectable text.

`public/ui-art-review.html` previews every asset and the normal/pressed pairs. The downloadable art pack includes unchanged full-resolution PNG originals, same-size quality-95 WebP files, generation prompts and original SHA256 hashes.

Validation: TypeScript and production build passed; 75 gameplay/storage/physics tests passed. Browser checks verified image-only UI (no SVG nodes), actual normal/pressed source swaps with stable hitboxes, settings slider keyboard control, no missing assets or JavaScript errors, and garage bounds at 640×320, 844×390, 1280×720 and 1536×692. Purchase cancellation, coin deduction, saved jeep selection and real race coin pickups passed. Vehicle preview layers retain their original pixel registration when fitted into each viewport.

The existing endless/timed modes remain marked coming soon; their artwork is included.
