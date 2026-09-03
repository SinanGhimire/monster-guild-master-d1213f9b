/**
 * Sprite sheet helpers.
 *
 * A lot of the community weapon art ships as horizontal animation strips
 * (muzzle-flash frames laid out left to right). Drawing the whole sheet makes
 * the gun look like a scrapbook cut-out, so everything goes through here:
 * we detect the frame columns, keep the first frame and trim the transparent
 * padding around it.
 */

export interface Frame {
  img: CanvasImageSource;
  w: number;
  h: number;
}

const frameCache = new Map<string, Frame>();
const urlCache = new Map<string, string>();

function alphaColumns(data: Uint8ClampedArray, w: number, h: number): boolean[] {
  const cols: boolean[] = new Array(w).fill(false);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (data[(y * w + x) * 4 + 3]! > 12) {
        cols[x] = true;
        break;
      }
    }
  }
  return cols;
}

/** Contiguous runs of non-empty columns, merging tiny 1-2px gaps. */
function columnRuns(cols: boolean[]): [number, number][] {
  const runs: [number, number][] = [];
  let start = -1;
  let gap = 0;
  for (let x = 0; x < cols.length; x++) {
    if (cols[x]) {
      if (start < 0) start = x;
      gap = 0;
    } else if (start >= 0) {
      gap++;
      if (gap > 3) {
        runs.push([start, x - gap]);
        start = -1;
        gap = 0;
      }
    }
  }
  if (start >= 0) runs.push([start, cols.length - 1]);
  return runs;
}

/**
 * Returns the first animation frame of a sprite sheet, tightly trimmed.
 * Single-image sprites simply come back trimmed.
 */
export function firstFrame(img: HTMLImageElement): Frame {
  const key = img.src;
  const hit = frameCache.get(key);
  if (hit) return hit;
  const fallback: Frame = { img, w: img.width, h: img.height };
  if (!img.width || !img.height) return fallback;

  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return fallback;
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0);
  let data: ImageData;
  try {
    data = g.getImageData(0, 0, c.width, c.height);
  } catch {
    return fallback;
  }

  const cols = alphaColumns(data.data, c.width, c.height);
  const runs = columnRuns(cols);
  if (!runs.length) return fallback;

  const aspect = img.width / img.height;
  // A strip = several similar-width chunks on a very wide sheet.
  const widths = runs.map(([a, b]) => b - a + 1);
  const avg = widths.reduce((n, v) => n + v, 0) / widths.length;
  const even = widths.every((v) => Math.abs(v - avg) < avg * 0.55);
  const isStrip = runs.length >= 2 && aspect > 2 && even;

  // Pick the meatiest frame of the strip, not blindly the first one: some
  // sheets lead with a muzzle-flash or a near-empty pose.
  const density = ([a, b]: [number, number]) => {
    let n = 0;
    for (let y = 0; y < c.height; y++)
      for (let x = a; x <= b; x++) if (data.data[(y * c.width + x) * 4 + 3]! > 12) n++;
    return n;
  };
  let best = runs[0]!;
  if (isStrip) {
    let bestN = -1;
    for (const r of runs) {
      const n = density(r);
      if (n > bestN) {
        bestN = n;
        best = r;
      }
    }
  }

  const [x0, x1] = isStrip ? best : [runs[0]![0], runs[runs.length - 1]![1]];

  // vertical trim across the chosen slice only
  let y0 = c.height;
  let y1 = -1;
  for (let y = 0; y < c.height; y++) {
    for (let x = x0; x <= x1; x++) {
      if (data.data[(y * c.width + x) * 4 + 3]! > 12) {
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        break;
      }
    }
  }
  if (y1 < 0) return fallback;

  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const og = out.getContext("2d")!;
  og.imageSmoothingEnabled = false;
  og.drawImage(img, x0, y0, w, h, 0, 0, w, h);
  const frame: Frame = { img: out, w, h };
  frameCache.set(key, frame);
  return frame;
}

/* ------------------------------------------------------------------ *
 * Visibility pass
 *
 * Most of the community weapon art is near-black (average rgb ~30), so on the
 * dark arena floor and inside the dark shop trays the guns were effectively
 * invisible. Everything the player sees now goes through `visibleFrame`, which
 * tints the silhouette towards its weapon colour, lifts the highlights and
 * wraps it in a light rim so it reads instantly on any background.
 * ------------------------------------------------------------------ */

const visibleCache = new Map<string, Frame>();

/** `#rgb` / `#rrggbb` -> rgba string, lightened towards white so dark pack art pops. */
function tintRgba(tint: string, alpha: number): string {
  let hex = tint.trim().replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = Number.parseInt(hex, 16);
  if (hex.length !== 6 || Number.isNaN(n)) return `rgba(226,232,255,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lift = (v: number) => Math.round(v + (255 - v) * 0.18);
  return `rgba(${lift(r)},${lift(g)},${lift(b)},${alpha})`;
}


/** Tinted + rim-lit copy of a sprite's first frame. */
export function visibleFrame(img: HTMLImageElement, tint = "#e8ecff"): Frame {
  const base = firstFrame(img);
  const key = `${img.src}|${tint}`;
  const hit = visibleCache.get(key);
  if (hit) return hit;
  if (!base.w || !base.h) return base;

  const S = 4; // supersample so the rim stays crisp when scaled up in game
  const pad = 2 * S;
  const bw = base.w * S;
  const bh = base.h * S;

  // 1. body: brighten the original art, keep its colours, whisper of tint
  const body = document.createElement("canvas");
  body.width = bw;
  body.height = bh;
  const bg = body.getContext("2d");
  if (!bg) return base;
  bg.imageSmoothingEnabled = false;
  bg.filter = "brightness(2.6) contrast(1.08) saturate(1.25)";
  bg.drawImage(base.img, 0, 0, bw, bh);
  bg.filter = "none";
  bg.globalCompositeOperation = "source-atop";
  bg.fillStyle = tintRgba(tint, 0.16);
  bg.fillRect(0, 0, bw, bh);
  bg.globalCompositeOperation = "source-over";

  // 2. rim: silhouette smeared in every direction, filled with a light colour
  const out = document.createElement("canvas");
  out.width = bw + pad * 2;
  out.height = bh + pad * 2;
  const og = out.getContext("2d");
  if (!og) return base;
  og.imageSmoothingEnabled = false;

  const rim = document.createElement("canvas");
  rim.width = out.width;
  rim.height = out.height;
  const rg = rim.getContext("2d")!;
  rg.imageSmoothingEnabled = false;
  const r = S * 1.5;
  for (let a = 0; a < 16; a++) {
    const th = (a / 16) * Math.PI * 2;
    rg.drawImage(base.img, pad + Math.cos(th) * r, pad + Math.sin(th) * r, bw, bh);
  }
  rg.globalCompositeOperation = "source-in";
  rg.fillStyle = "rgba(12,10,18,0.92)";
  rg.fillRect(0, 0, rim.width, rim.height);

  og.drawImage(rim, 0, 0);
  og.drawImage(body, pad, pad);

  const frame: Frame = { img: out, w: out.width, h: out.height };
  visibleCache.set(key, frame);
  return frame;
}

/**
 * Browser-only: turn a sprite url into a data url holding just its first
 * frame, brightened for UI use, so React can render it in an <img> without the
 * strip artefacts. Resolves to the original url if anything goes wrong.
 */
export function spriteIconUrl(src: string, tint?: string): Promise<string> {
  const cacheKey = `${src}|${tint ?? ""}`;
  const hit = urlCache.get(cacheKey);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const f = tint ? visibleFrame(img, tint) : firstFrame(img);
        const url = f.img instanceof HTMLCanvasElement ? f.img.toDataURL("image/png") : src;
        urlCache.set(cacheKey, url);
        resolve(url);
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

