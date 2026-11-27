// Flat 2D scenery; motorcycle and rider use authored SVG vectors.
export const ART_MANIFEST = {
  "windcatchers-flat": {
    "file": "v3/windcatchers-flat.webp",
    "width": 1536,
    "height": 1024,
    "frame": {
      "x": 22,
      "y": 94,
      "width": 1492,
      "height": 856
    }
  },
  "terraces-flat": {
    "file": "v3/terraces-flat.webp",
    "width": 1536,
    "height": 1024,
    "frame": {
      "x": 38,
      "y": 91,
      "width": 1464,
      "height": 870
    }
  },
  "caravanserai-flat": {
    "file": "v3/caravanserai-flat.webp",
    "width": 1536,
    "height": 512,
    "frame": {
      "x": 20,
      "y": 27,
      "width": 1496,
      "height": 453
    }
  },
  "oasis-flat": {
    "file": "v3/oasis-flat.webp",
    "width": 1536,
    "height": 1024,
    "frame": {
      "x": 11,
      "y": 47,
      "width": 1517,
      "height": 937
    }
  }
} as const;
export type ArtKey = keyof typeof ART_MANIFEST;
