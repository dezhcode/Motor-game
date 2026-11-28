import { Assets, Rectangle, Texture } from 'pixi.js';
import { RIDER_SPRITE_FILES, type RiderSpriteKey } from '../bike/riderSpriteGeometry';
import { PAINTED_ART, type PaintedArtKey } from './paintedManifest';
import { ART_MANIFEST, type ArtKey } from './artManifest';

export type GameArtwork = Record<ArtKey | RiderSpriteKey | PaintedArtKey, Texture>;
let artworkPromise: Promise<GameArtwork> | undefined;
let progress = 0;
const progressListeners = new Set<(ratio: number) => void>();

/** Bundled relative URLs work in Vite and offline Capacitor. */
export function loadGameArtwork(onProgress?: (ratio: number) => void): Promise<GameArtwork> {
  if (onProgress) { progressListeners.add(onProgress); onProgress(progress); }
  if (!artworkPromise) {
    const total = Object.keys(ART_MANIFEST).length + Object.keys(RIDER_SPRITE_FILES).length + Object.keys(PAINTED_ART).length;
    let loaded = 0;
    const report = () => {
      progress = ++loaded / total;
      progressListeners.forEach(listener => listener(progress));
    };
    const atlas = (Object.keys(ART_MANIFEST) as ArtKey[]).map(async (key) => {
      const entry = ART_MANIFEST[key];
      const url = new URL(`./assets/art/${entry.file}`, document.baseURI).href;
      const full = await Assets.load<Texture>(url);
      const { x, y, width, height } = entry.frame;
      const texture = new Texture({ source: full.source, frame: new Rectangle(x, y, width, height) });
      report();
      return [key, texture] as const;
    });
    const sprites = Object.entries(RIDER_SPRITE_FILES).map(async ([key, file]) => {
      const url = new URL(`./assets/art/${file}`, document.baseURI).href;
      const texture = await Assets.load<Texture>(url);
      report();
      return [key, texture] as const;
    });
    const painted = Object.entries(PAINTED_ART).map(async ([key, file]) => {
      const url = new URL(`./assets/art/${file}`, document.baseURI).href;
      const texture = await Assets.load<Texture>(url);
      report();
      return [key, texture] as const;
    });
    artworkPromise = Promise.all([...atlas, ...sprites, ...painted]).then(entries => Object.fromEntries(entries) as GameArtwork);
  }
  return artworkPromise.finally(() => { if (onProgress) progressListeners.delete(onProgress); });
}
