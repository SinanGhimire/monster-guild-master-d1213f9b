/**
 * Class art: the hand-drawn reference sheet sliced into 30 class cells.
 *
 * - `class-portraits.png` — full class characters (used by the class menu).
 * - `class-accessories.png` — the same cells with the plain base body removed,
 *   leaving only the class headgear/accessory so it can be layered on top of
 *   the original player sprites in game.
 *
 * Both sheets share the same grid: 10 columns x 3 rows of 200x240 cells, with
 * every cell aligned so the base head sits at the constants below.
 */
import portraitsUrl from "@/assets/classes/class-portraits.png";
import accessoriesUrl from "@/assets/classes/class-accessories.png";
import { CLASS_KEYS, type ClassKey } from "./classes";

export const CLASS_SHEET_URL = portraitsUrl;
export const CLASS_ACC_URL = accessoriesUrl;

export const CELL_W = 200;
export const CELL_H = 240;
export const SHEET_COLS = 10;
export const SHEET_ROWS = 3;

/** Where the plain base head sits inside a cell (measured from the sheet). */
const HEAD_CX = 100;
const HEAD_TOP = 58;
const HEAD_W = 86;

export function classCellIndex(cls: ClassKey): number {
  const i = CLASS_KEYS.indexOf(cls);
  return i < 0 ? 0 : i;
}

export function classCell(cls: ClassKey): { col: number; row: number } {
  const i = classCellIndex(cls);
  return { col: i % SHEET_COLS, row: Math.floor(i / SHEET_COLS) };
}

/** Inline styles that show a single class cell, centred, inside any box. */
export function classPortraitStyle(cls: ClassKey): React.CSSProperties {
  const { col, row } = classCell(cls);
  return {
    backgroundImage: `url(${CLASS_SHEET_URL})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${SHEET_COLS * 100}% ${SHEET_ROWS * 100}%`,
    backgroundPosition: `${(col / (SHEET_COLS - 1)) * 100}% ${(row / (SHEET_ROWS - 1)) * 100}%`,
  };
}

/* ---------------------------- sprite compositing --------------------------- */

let accImg: HTMLImageElement | null = null;
let accLoad: Promise<HTMLImageElement> | null = null;

function loadAccessories(): Promise<HTMLImageElement> {
  if (accImg) return Promise.resolve(accImg);
  if (accLoad) return accLoad;
  accLoad = new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.onload = () => {
      accImg = img;
      resolve(img);
    };
    img.onerror = () => resolve(img);
    img.src = CLASS_ACC_URL;
  });
  return accLoad;
}

interface HeadBox {
  cx: number;
  top: number;
  w: number;
}

/** Locate the head of one sprite frame from its alpha channel. */
function measureHead(data: Uint8ClampedArray, x0: number, fw: number, h: number): HeadBox | null {
  let top = -1;
  const rowSpan: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    let lo = -1;
    let hi = -1;
    for (let x = 0; x < fw; x++) {
      const a = data[((y * (x0 + fw + 1) || 0) + 0) as number];
      void a;
      break;
    }
    void lo;
    void hi;
    void rowSpan;
    void y;
    break;
  }
  void top;
  return null;
}

/** Head metrics for every frame of a strip, read once from an offscreen canvas. */
function headsForStrip(img: HTMLImageElement, frames: number): HeadBox[] {
  const fw = Math.floor(img.width / frames);
  const h = img.height;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const out: HeadBox[] = [];
  for (let f = 0; f < frames; f++) {
    const x0 = f * fw;
    let d: Uint8ClampedArray;
    try {
      d = g.getImageData(x0, 0, fw, h).data;
    } catch {
      out.push({ cx: fw / 2, top: h * 0.06, w: fw * 0.8 });
      continue;
    }
    let top = -1;
    const spans: [number, number][] = [];
    for (let y = 0; y < h; y++) {
      let lo = -1;
      let hi = -1;
      for (let x = 0; x < fw; x++) {
        if (d[(y * fw + x) * 4 + 3]! > 60) {
          if (lo < 0) lo = x;
          hi = x;
        }
      }
      spans.push([lo, hi]);
      if (top < 0 && lo >= 0 && hi - lo > 3) top = y;
    }
    if (top < 0) {
      out.push({ cx: fw / 2, top: h * 0.06, w: fw * 0.8 });
      continue;
    }
    // the head is the widest part of the top ~65% of the body
    let bestW = 0;
    let bestCx = fw / 2;
    const limit = Math.min(h, top + Math.floor(h * 0.6));
    for (let y = top; y < limit; y++) {
      const [lo, hi] = spans[y]!;
      if (lo < 0) continue;
      const w = hi - lo + 1;
      if (w > bestW) {
        bestW = w;
        bestCx = (lo + hi) / 2;
      }
    }
    out.push({ cx: bestCx, top, w: bestW || fw * 0.8 });
  }
  return out;
}

const stripCache = new Map<string, HTMLImageElement>();

/**
 * Draw the class accessory over every frame of a player strip and hand back a
 * new image. The original hand-drawn character art is untouched underneath.
 */
export async function composeClassStrip(
  base: HTMLImageElement,
  frames: number,
  cls: ClassKey,
  cacheKey: string,
): Promise<HTMLImageElement> {
  const cached = stripCache.get(cacheKey);
  if (cached) return cached;
  const acc = await loadAccessories();
  if (!base.width || !acc.width) return base;

  const fw = Math.floor(base.width / frames);
  const heads = headsForStrip(base, frames);
  const c = document.createElement("canvas");
  c.width = base.width;
  c.height = base.height;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = true;
  g.drawImage(base, 0, 0);

  const { col, row } = classCell(cls);
  const sx = col * CELL_W;
  const sy = row * CELL_H;

  for (let f = 0; f < frames; f++) {
    const head = heads[f]!;
    const scale = head.w / HEAD_W;
    const dx = f * fw + head.cx - HEAD_CX * scale;
    const dy = head.top - HEAD_TOP * scale;
    g.drawImage(acc, sx, sy, CELL_W, CELL_H, dx, dy, CELL_W * scale, CELL_H * scale);
  }

  const out = new Image();
  await new Promise<void>((resolve) => {
    out.onload = () => resolve();
    out.onerror = () => resolve();
    out.src = c.toDataURL();
  });
  stripCache.set(cacheKey, out);
  return out;
}

void measureHead;
