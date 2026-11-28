const textures = new Map<string, Promise<HTMLImageElement>>();

/** Resolve against the stylesheet, including Vite's production asset directory. */
export function resolvedBitmapUrl(element: Element): string | undefined {
  return /url\(["']?([^"')]+)["']?\)/.exec(
    getComputedStyle(element).backgroundImage,
  )?.[1];
}

function requestTexture(url: string, attempt = 0): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      // A brief connection loss must not leave the menu permanently unpainted.
      if (attempt < 2)
        setTimeout(
          () => resolve(requestTexture(url, attempt + 1)),
          [250, 750][attempt],
        );
      else reject(new Error(`Unable to load UI artwork: ${url}`));
    };
    image.src = url;
  });
}

/** Preloading and drawing share one decoded image and one in-flight request. */
export function bitmapTexture(url: string): Promise<HTMLImageElement> {
  let pending = textures.get(url);
  if (!pending) {
    pending = requestTexture(url).catch((error) => {
      if (textures.get(url) === pending) textures.delete(url);
      throw error;
    });
    textures.set(url, pending);
  }
  return pending;
}

export function warmBitmapTextures(urls: string[]): void {
  void Promise.allSettled([...new Set(urls)].map(bitmapTexture));
}
