import { Assets, Rectangle, Texture } from 'pixi.js';
import { RIDER_SPRITE_FILES, type RiderSpriteKey } from '../bike/riderSpriteGeometry';
import { PAINTED_ART, type PaintedArtKey } from './paintedManifest';
import { ART_MANIFEST, type ArtKey } from './artManifest';

export type GameArtwork = Record<ArtKey | RiderSpriteKey | PaintedArtKey, Texture>;
let artworkPromise: Promise<GameArtwork> | undefined;

/** Bundled relative URLs work in Vite and offline Capacitor. */
export function loadGameArtwork(): Promise<GameArtwork> {
  artworkPromise ??= Promise.all(
    (Object.keys(ART_MANIFEST) as ArtKey[]).map(async (key) => {
      const entry = ART_MANIFEST[key];
      const url = new URL(`./assets/art/${entry.file}`, document.baseURI).href;
      const full = await Assets.load<Texture>(url);
      const { x, y, width, height } = entry.frame;
      const texture = new Texture({ source: full.source, frame: new Rectangle(x, y, width, height) });
      return [key, texture] as const;
    })
  ).then(async (entries) => {
    const sprites = await Promise.all(Object.entries(RIDER_SPRITE_FILES).map(async ([key, file]) => {
      const url = new URL(`./assets/art/${file}`, document.baseURI).href;
      return [key, await Assets.load<Texture>(url)] as const;
    }));
    const painted = await Promise.all(Object.entries(PAINTED_ART).map(async ([key, file]) => {
      const url = new URL(`./assets/art/${file}`, document.baseURI).href;
      return [key, await Assets.load<Texture>(url)] as const;
    }));
    return Object.fromEntries([...entries, ...sprites, ...painted]) as GameArtwork;
  });
  return artworkPromise;
}
