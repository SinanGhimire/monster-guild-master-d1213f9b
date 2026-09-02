/**
 * Hand-drawn vector glyphs for upgrades / pickups.
 * Every path is authored in a 24x24 box so it can be drawn on the canvas
 * (Path2D) and in the HUD (inline SVG) from the same source.
 */
export interface GlyphPart {
  d: string;
  /** stroke instead of fill */
  stroke?: boolean;
  /** stroke width in 24-space */
  w?: number;
}

export const GLYPHS: Record<string, GlyphPart[]> = {
  /* bullet */
  damage: [
    { d: "M12 2c2.5 2.7 3.8 5.6 3.8 8.6V15H8.2v-4.4C8.2 7.6 9.5 4.7 12 2Z" },
    { d: "M8.2 16.4h7.6v3.1c0 1-.8 1.8-1.8 1.8h-4c-1 0-1.8-.8-1.8-1.8Z" },
  ],
  /* lightning bolt */
  rate: [{ d: "M13.6 1.8 4.8 13.4h5.4L9.2 22.2 19.2 10.2h-5.9Z" }],
  /* three chevrons */
  multishot: [
    { d: "M4 6.5 8.6 12 4 17.5", stroke: true, w: 2.4 },
    { d: "M11 6.5 15.6 12 11 17.5", stroke: true, w: 2.4 },
    { d: "M18 8.5 20.6 12 18 15.5", stroke: true, w: 2.4 },
  ],
  /* arrow with speed lines */
  velocity: [
    { d: "M13 5.5 21 12l-8 6.5v-4H9v-5h4Z" },
    { d: "M2.5 8h4.5", stroke: true, w: 2.2 },
    { d: "M2.5 12h3.5", stroke: true, w: 2.2 },
    { d: "M2.5 16h4.5", stroke: true, w: 2.2 },
  ],
  /* heart */
  hp: [
    {
      d: "M12 21.2S3.9 16.3 2.4 11.4C1.2 7.6 3.6 4.4 7.1 4.4c2 0 3.7 1.1 4.9 2.7 1.2-1.6 2.9-2.7 4.9-2.7 3.5 0 5.9 3.2 4.7 7-1.5 4.9-9.6 9.8-9.6 9.8Z",
    },
  ],
  /* winged boot -> double chevron + trail */
  speed: [
    { d: "M6 5.5 12.5 12 6 18.5", stroke: true, w: 2.6 },
    { d: "M13.5 5.5 20 12l-6.5 6.5", stroke: true, w: 2.6 },
    { d: "M2 12h2.5", stroke: true, w: 2.2 },
  ],
  /* shockwave */
  knock: [
    { d: "M6.5 12a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 1 0-5.2 0" },
    { d: "M14.2 6.6c2.6 2.9 2.6 7.9 0 10.8", stroke: true, w: 2.2 },
    { d: "M18.4 4.2c4 4.3 4 11.3 0 15.6", stroke: true, w: 2.2 },
    { d: "M4.4 8.6C3 9.9 3 14.1 4.4 15.4", stroke: true, w: 2 },
  ],
  /* rail: bolt through plates */
  pierce: [
    { d: "M1.5 12h13", stroke: true, w: 2.4 },
    { d: "M14.5 6.5 22.5 12l-8 5.5Z" },
    { d: "M6 7.5v9", stroke: true, w: 2 },
    { d: "M10.5 8.5v7", stroke: true, w: 2 },
  ],
  /* starburst */
  explosive: [
    {
      d: "M12 1.2l2.4 5.5 5.4-2.5-2.4 5.6 5.4 1.9-5.4 1.9 2.4 5.6-5.4-2.5L12 22.8l-2.4-5.5-5.4 2.5 2.4-5.6L1.2 12.3l5.4-1.9-2.4-5.6 5.4 2.5Z",
    },
  ],
  /* crosshair */
  crit: [
    { d: "M12 4.6a7.4 7.4 0 1 0 0 14.8 7.4 7.4 0 1 0 0-14.8", stroke: true, w: 2.2 },
    { d: "M12 0.8v3.4", stroke: true, w: 2.2 },
    { d: "M12 19.8v3.4", stroke: true, w: 2.2 },
    { d: "M0.8 12h3.4", stroke: true, w: 2.2 },
    { d: "M19.8 12h3.4", stroke: true, w: 2.2 },
    { d: "M10.2 12a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 1 0-3.6 0" },
  ],
  /* upward blade */
  critdmg: [
    { d: "M12 1.6 19.4 11H15.4v5.4H8.6V11H4.6Z" },
    { d: "M8.6 18.6h6.8v3.2H8.6Z" },
  ],
  /* droplet */
  lifesteal: [
    { d: "M12 2.2c4.2 5.2 7.2 8.4 7.2 11.6A7.2 7.2 0 0 1 4.8 13.8c0-3.2 3-6.4 7.2-11.6Z" },
  ],
};

/** pickup kinds reuse the same art */
export const KIND_GLYPH: Record<string, string> = {
  health: "hp",
  speed: "speed",
  rate: "rate",
  damage: "damage",
};

const cache = new Map<string, Path2D>();

function path(d: string) {
  let p = cache.get(d);
  if (!p) {
    p = new Path2D(d);
    cache.set(d, p);
  }
  return p;
}

/** Draw a glyph centered at (x, y), scaled so it spans `size` px. */
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  const parts = GLYPHS[id];
  if (!parts) return;
  const k = size / 24;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(k, k);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const part of parts) {
    const p = path(part.d);
    if (part.stroke) {
      ctx.strokeStyle = color;
      ctx.lineWidth = part.w ?? 2.2;
      ctx.stroke(p);
    } else {
      ctx.fillStyle = color;
      ctx.fill(p);
    }
  }
  ctx.restore();
}
