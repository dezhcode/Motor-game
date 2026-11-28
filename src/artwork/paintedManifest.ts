// Approved art review v1 + modular terrain/pedal update v2.
export const PAINTED_ART = {
  granite: "painted/granite.webp",
  sandstone: "painted/sandstone.webp",
  layeredRock: "painted/layeredRock.webp",
  pebbles: "painted/pebbles.webp",
  leafBush: "painted/leafBush.webp",
  dryGrass: "painted/dryGrass.webp",
  sageBush: "painted/sageBush.webp",
  warningSign: "painted/warningSign.webp",

  "sky": "painted/sky.webp",
  "mesas": "painted/mesas.webp",
  "dunes": "painted/dunes.webp",
  "village": "painted/village.webp",
  "plants": "painted/plants.webp",
  "rock": "painted/rock.webp",
  "crate": "painted/crate.webp",
  "ramp": "painted/ramp.webp",
  "sign": "painted/sign.webp",
  "coin": "painted/coin.webp",
  "fuel": "painted/fuel.webp",
  "speedFace": "painted/speedFace.webp",
  "fuelFace": "painted/fuelFace.webp",
  "needle": "painted/needle.webp",
  "plaque": "painted/plaque.webp",
  "brake_normal": "painted/brake_normal.webp",
  "brake_pressed": "painted/brake_pressed.webp",
  "gas_normal": "painted/gas_normal.webp",
  "gas_pressed": "painted/gas_pressed.webp",
  "soil": "painted/soil.webp",
  "surface": "painted/surface.webp"
} as const;
export type PaintedArtKey = keyof typeof PAINTED_ART;
export const paintedUrl = (key: PaintedArtKey) => new URL(`./assets/art/${PAINTED_ART[key]}`, document.baseURI).href;
