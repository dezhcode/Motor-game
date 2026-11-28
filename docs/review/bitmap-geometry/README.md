# Bitmap geometry correction

The previous percentage-based nine-slice rules mapped unequal source-pixel corner sizes to square destination corners. The shared dialog rule also had higher CSS specificity than the square/action control rules, so some controls received a panel skin.

- Horizontal buttons, headings, tags and meter textures now preserve complete 500-pixel end caps from their 724-pixel source height. Only the straight center expands horizontally. One ResizeObserver tracks actual control heights and ignores unchanged height values. A child-list observer registers new dialogs and releases removed controls without running on game text updates.
- Panels use equal 190-pixel source corners and equal destination corners. Square controls use full-image `contain` backgrounds and square hitboxes in both states. The generic frame selector uses `:where` so it cannot override a specific control skin.
- Mode illustrations, loading artwork and gallery examples retain native aspect ratios. Loading-frame geometry uses the actual 1485×280 source ratio. Pedal shafts retain the image ratio rather than stretching to viewport height. Meter artwork uses the same end-cap rule as controls.
- The selected gold panel has irregular translucent patches near the inner edges. A dark bitmap underlay stops terrain from showing through these patches; the selected texture sits beneath content in an isolated stacking context. Both normal and pressed images remain active.

Validation: TypeScript, production build and browser checks passed. Browser checks audited image aspect ratios, equal corner scales, normal/pressed texture changes with stable hitboxes, and no console errors/missing assets. Garage layout passed at 640×320, 780×360, 844×390, 960×432, 1280×720 and 1536×692. Home, mode selection, settings, loading, actual race and pause were checked. Purchase cancellation, wallet deduction, saved selection and actual jeep coin pickups passed.
