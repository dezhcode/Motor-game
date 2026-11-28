export interface SliceRegion {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}
/** One shared, pixel-aligned 3×3 grid. Corners scale uniformly; edge strips
 * stretch on one axis and only the center stretches on both axes. */
export function nineSliceGrid(
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
  sourceInset: number,
  destinationInset: number,
): SliceRegion[] {
  const cut = Math.max(
    1,
    Math.min(
      sourceInset,
      Math.floor((sourceWidth - 1) / 2),
      Math.floor((sourceHeight - 1) / 2),
    ),
  );
  const corner = Math.max(
    0,
    Math.min(
      Math.round(destinationInset),
      Math.floor((width - 1) / 2),
      Math.floor((height - 1) / 2),
    ),
  );
  const xs = [0, cut, sourceWidth - cut, sourceWidth],
    ys = [0, cut, sourceHeight - cut, sourceHeight];
  const xd = [0, corner, width - corner, width],
    yd = [0, corner, height - corner, height];
  const regions: SliceRegion[] = [];
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < 3; x++)
      regions.push({
        sx: xs[x],
        sy: ys[y],
        sw: xs[x + 1] - xs[x],
        sh: ys[y + 1] - ys[y],
        dx: xd[x],
        dy: yd[y],
        dw: xd[x + 1] - xd[x],
        dh: yd[y + 1] - yd[y],
      });
  return regions;
}
