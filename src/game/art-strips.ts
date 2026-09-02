import { FRAME, IDLE_FRAMES, WALK_FRAMES, DEATH_FRAMES } from "./critters";

/**
 * Turns a single illustrated sprite into idle / walk / death animation strips.
 *
 * Instead of wobbling the whole decal, the artwork is cut into a small puppet
 * rig -- head, torso, two legs (and wings for flyers) -- and every part is
 * transformed around its own pivot. That gives real articulation: legs swing
 * from the hip, the torso bobs and counter-rotates, the head lags behind, and
 * wings flap. Serpents keep a travelling slice wave instead of legs.
 */

export type Gait = "ground" | "heavy" | "skitter" | "float" | "serpent" | "crawler";

type Anim = "idle" | "walk" | "death";

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("art load failed"));
    img.src = src;
  });
}

function frameCount(anim: Anim) {
  return anim === "idle" ? IDLE_FRAMES : anim === "walk" ? WALK_FRAMES : DEATH_FRAMES;
}

/* ------------------------------------------------------------------ */
/* rig                                                                 */
/* ------------------------------------------------------------------ */

interface Body {
  img: HTMLImageElement;
  w: number;
  h: number;
}

/** Band splits (fraction of sprite height, 0 = top of head). */
interface Rig {
  headTo: number;
  torsoTo: number;
  hasWings: boolean;
  /** number of leg columns; 2 = humanoid, more = arachnid/insect shuffle */
  legCols: number;
}

function rigFor(gait: Gait): Rig {
  switch (gait) {
    case "heavy":
      return { headTo: 0.3, torsoTo: 0.74, hasWings: false, legCols: 2 };
    case "skitter":
      return { headTo: 0.32, torsoTo: 0.62, hasWings: false, legCols: 2 };
    case "crawler":
      // many-legged bodies hang from a high carapace, so the legs band starts early
      return { headTo: 0.3, torsoTo: 0.5, hasWings: false, legCols: 4 };
    case "float":
      return { headTo: 0.34, torsoTo: 0.82, hasWings: true, legCols: 2 };
    default:
      return { headTo: 0.33, torsoTo: 0.68, hasWings: false, legCols: 2 };
  }
}

interface PartXf {
  /** pivot in body space (feet centre = 0,0; up is negative y) */
  px: number;
  py: number;
  rot: number;
  dx: number;
  dy: number;
  sx: number;
  sy: number;
}

const NO_XF: PartXf = { px: 0, py: 0, rot: 0, dx: 0, dy: 0, sx: 1, sy: 1 };

/**
 * Draws one rectangular chunk of the sprite (given in 0..1 sprite fractions)
 * with its own pivot transform, clipped so it moves independently.
 */
function drawPart(
  ctx: CanvasRenderingContext2D,
  b: Body,
  fx0: number,
  fy0: number,
  fx1: number,
  fy1: number,
  xf: PartXf,
) {
  const { w, h } = b;
  const x0 = -w / 2 + fx0 * w;
  const x1 = -w / 2 + fx1 * w;
  const y0 = -h + fy0 * h;
  const y1 = -h + fy1 * h;
  ctx.save();
  ctx.translate(xf.px + xf.dx, xf.py + xf.dy);
  ctx.rotate(xf.rot);
  ctx.scale(xf.sx, xf.sy);
  ctx.translate(-xf.px, -xf.py);
  ctx.beginPath();
  // slight bleed keeps the seams between bands from showing
  ctx.rect(x0 - 0.6, y0 - 0.6, x1 - x0 + 1.2, y1 - y0 + 1.2);
  ctx.clip();
  ctx.drawImage(b.img, -w / 2, -h, w, h);
  ctx.restore();
}

/** Travelling slice wave, used for serpents / worms. */
function drawWave(
  ctx: CanvasRenderingContext2D,
  b: Body,
  amp: number,
  waves: number,
  phase: number,
) {
  const { img, w, h } = b;
  if (amp < 0.15) {
    ctx.drawImage(img, -w / 2, -h, w, h);
    return;
  }
  const slices = 26;
  const sh = img.height / slices;
  const dh = h / slices;
  for (let s = 0; s < slices; s++) {
    const k = 1 - s / (slices - 1); // 0 feet -> 1 head
    const off = Math.sin(phase + k * Math.PI * 2 * waves) * amp * (0.25 + k * 0.75);
    ctx.drawImage(img, 0, s * sh, img.width, sh + 0.6, -w / 2 + off, -h + s * dh, w, dh + 0.9);
  }
}

function contactShadow(ctx: CanvasRenderingContext2D, w: number, lift: number, alpha = 1) {
  const t = Math.max(0, Math.min(1, lift / 16));
  ctx.save();
  ctx.globalAlpha = (0.62 - t * 0.14) * alpha;
  ctx.fillStyle = "#151027";
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.36 * (1 - t * 0.22), w * 0.11 * (1 - t * 0.18), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* poses                                                               */
/* ------------------------------------------------------------------ */

interface Pose {
  /** whole-body root motion */
  lift: number;
  sway: number;
  lean: number;
  sx: number;
  sy: number;
  alpha: number;
  /** leg swing angles (radians, + = forward) */
  legA: number;
  legB: number;
  /** per-leg knee lift */
  liftA: number;
  liftB: number;
  /** head nod / lag */
  headRot: number;
  headDy: number;
  /** torso counter rotation */
  torsoRot: number;
  torsoSy: number;
  /** wing flap 0..1 */
  flap: number;
  /** serpent wave */
  wave: number;
  waves: number;
  phase: number;
  flash: number;
}

function base(t: number): Pose {
  return {
    lift: 0,
    sway: 0,
    lean: 0,
    sx: 1,
    sy: 1,
    alpha: 1,
    legA: 0,
    legB: 0,
    liftA: 0,
    liftB: 0,
    headRot: 0,
    headDy: 0,
    torsoRot: 0,
    torsoSy: 1,
    flap: 0,
    wave: 0,
    waves: 1,
    phase: t * Math.PI * 2,
    flash: 0,
  };
}

function idlePose(gait: Gait, t: number): Pose {
  const a = t * Math.PI * 2;
  const br = Math.sin(a);
  const p = base(t);
  switch (gait) {
    case "heavy":
      p.torsoSy = 1 + br * 0.045;
      p.headDy = br * 1.6;
      p.headRot = Math.sin(a - 0.9) * 0.05;
      p.legA = Math.sin(a) * 0.03;
      p.legB = -Math.sin(a) * 0.03;
      p.lift = Math.max(0, br) * 0.35;
      break;
    case "skitter":
      p.lift = Math.abs(Math.sin(a * 2)) * 0.6;
      p.legA = Math.sin(a * 3) * 0.3;
      p.legB = -Math.sin(a * 3) * 0.3;
      p.liftA = Math.max(0, Math.sin(a * 3)) * 2;
      p.liftB = Math.max(0, -Math.sin(a * 3)) * 2;
      p.headRot = Math.sin(a * 3 + 1) * 0.07;
      p.torsoRot = Math.sin(a * 3) * 0.03;
      break;
    case "crawler":
      // carapace breathes, legs twitch in two alternating tripods, body stays down
      p.lift = 0;
      p.torsoSy = 1 + br * 0.03;
      p.legA = Math.sin(a * 2) * 0.13;
      p.legB = -Math.sin(a * 2) * 0.13;
      p.liftA = Math.max(0, Math.sin(a * 2)) * 1.1;
      p.liftB = Math.max(0, -Math.sin(a * 2)) * 1.1;
      p.headRot = Math.sin(a * 2 - 0.6) * 0.03;
      p.headDy = br * 0.7;
      break;
    case "float":
      p.lift = 6 + Math.sin(a) * 4;
      p.flap = (Math.sin(a * 2) + 1) / 2;
      p.headRot = Math.sin(a - 0.7) * 0.06;
      p.legA = 0.12 + Math.sin(a) * 0.06;
      p.legB = 0.05 - Math.sin(a) * 0.06;
      break;
    case "serpent":
      p.wave = 4.5;
      p.waves = 1.25;
      p.lift = 0.4 + Math.sin(a) * 0.4;
      break;
    default:
      p.lift = Math.max(0, br) * 0.5;
      p.torsoSy = 1 + br * 0.05;
      p.headDy = br * 1.8;
      p.headRot = Math.sin(a - 0.8) * 0.05;
      p.legA = Math.sin(a) * 0.11;
      p.legB = -Math.sin(a) * 0.11;

  }
  return p;
}

function walkPose(gait: Gait, t: number): Pose {
  const a = t * Math.PI * 2;
  const p = base(t);
  // impact peaks just after each footfall (two per cycle)
  const impact = Math.max(0, -Math.cos(a * 2));
  const bob = Math.abs(Math.sin(a));
  switch (gait) {
    case "heavy": {
      p.legA = Math.sin(a) * 0.72;
      p.legB = Math.sin(a + Math.PI) * 0.72;
      p.liftA = Math.max(0, Math.sin(a)) * 11;
      p.liftB = Math.max(0, Math.sin(a + Math.PI)) * 11;
      p.lift = bob * 2.2;
      p.lean = 0.035;
      p.torsoRot = -Math.sin(a) * 0.07;
      p.torsoSy = 1 - impact * 0.14;
      p.sx = 1 + impact * 0.1;
      p.headRot = Math.sin(a - 1.1) * 0.12;
      p.headDy = impact * 3;
      break;
    }
    case "skitter": {
      p.legA = Math.sin(a * 2) * 0.95;
      p.legB = Math.sin(a * 2 + Math.PI) * 0.95;
      p.liftA = Math.max(0, Math.sin(a * 2)) * 11;
      p.liftB = Math.max(0, Math.sin(a * 2 + Math.PI)) * 11;
      p.lift = Math.abs(Math.sin(a * 2)) * 2.2;
      p.lean = 0.06;
      p.torsoRot = Math.sin(a * 2) * 0.09;
      p.headRot = Math.sin(a * 2 - 0.8) * 0.16;
      break;
    }
    case "crawler": {
      // alternating tripods: half the legs push while the other half reach.
      // The carapace never leaves the ground plane, so it reads as a scuttle.
      p.legA = Math.sin(a * 2) * 0.68;
      p.legB = Math.sin(a * 2 + Math.PI) * 0.68;
      p.liftA = Math.max(0, Math.sin(a * 2)) * 9;
      p.liftB = Math.max(0, Math.sin(a * 2 + Math.PI)) * 9;
      p.lift = Math.abs(Math.sin(a * 2)) * 0.5;
      p.lean = 0;
      p.sway = Math.sin(a) * 1.6;
      p.torsoRot = Math.sin(a * 2 + 0.4) * 0.06;
      p.torsoSy = 1 - Math.abs(Math.sin(a * 2)) * 0.05;
      p.headRot = Math.sin(a * 2 - 0.5) * 0.09;
      p.headDy = Math.abs(Math.sin(a * 2)) * 1.4;
      break;
    }
    case "float": {
      p.lift = 8 + Math.sin(a) * 5;
      p.flap = (Math.sin(a * 3) + 1) / 2;
      p.lean = 0.09;
      p.legA = 0.24 + Math.sin(a) * 0.1;
      p.legB = 0.14 - Math.sin(a) * 0.1;
      p.headRot = Math.sin(a - 0.6) * 0.08;
      break;
    }
    case "serpent": {
      p.wave = 19;
      p.waves = 1.9;
      p.sway = Math.sin(a) * 2.4;
      p.lift = 0.6 + Math.abs(Math.sin(a)) * 1.4;
      p.lean = 0;
      break;
    }
    default: {
      p.legA = Math.sin(a) * 0.95;
      p.legB = Math.sin(a + Math.PI) * 0.95;
      p.liftA = Math.max(0, Math.sin(a)) * 12;
      p.liftB = Math.max(0, Math.sin(a + Math.PI)) * 12;
      p.lift = bob * 3;
      p.lean = 0.07;
      p.torsoRot = -Math.sin(a) * 0.1;
      p.torsoSy = 1 - impact * 0.12;
      p.sx = 1 + impact * 0.09;
      p.headRot = Math.sin(a - 1) * 0.14;
      p.headDy = impact * 2.6;
    }
  }
  return p;
}

/** Flash pop -> knees buckle -> topple -> flatten -> dissolve. */
function deathPose(gait: Gait, k: number): Pose {
  const p = base(k);
  const pop = k < 0.18 ? Math.sin((k / 0.18) * Math.PI) : 0;
  const fall = Math.max(0, (k - 0.14) / 0.86);
  const ease = fall * fall * (3 - 2 * fall);
  p.flash = pop;
  p.lift = (gait === "float" ? 10 * (1 - ease) : 0) + pop * 6;
  const crawler = gait === "crawler";
  // spiders don't topple over — they drop, curl their legs in and flatten
  p.sway = ease * (crawler ? 2 : 9);
  p.lean = ease * (crawler ? 0.18 : 1.35);
  p.sx = (1 + pop * 0.1) * (1 + ease * (crawler ? 0.14 : 0.08));
  p.sy = (1 + pop * 0.16) * (1 - ease * (crawler ? 0.5 : 0.4));
  p.legA = ease * (crawler ? 0.55 : 0.9);
  p.legB = -ease * (crawler ? 0.55 : 0.7);
  p.liftA = ease * (crawler ? 1.5 : 4);
  p.liftB = ease * (crawler ? 1.5 : 2);
  p.headRot = -ease * (crawler ? 0.1 : 0.5);
  p.headDy = ease * (crawler ? 4 : 2);
  p.torsoRot = ease * (crawler ? 0.05 : 0.2);
  p.flap = gait === "float" ? Math.max(0, 1 - ease * 2) : 0;
  p.wave = gait === "serpent" ? 6 * (1 - ease) : 0;
  p.waves = 1.2;
  p.alpha = Math.max(0, 1 - Math.max(0, (k - 0.45) / 0.55) ** 1.4);
  return p;
}

/* ------------------------------------------------------------------ */
/* strip building                                                      */
/* ------------------------------------------------------------------ */

function drawPuppet(ctx: CanvasRenderingContext2D, b: Body, rig: Rig, p: Pose) {
  const { w, h } = b;
  const hipY = -h * (1 - rig.torsoTo);
  const neckY = -h * (1 - rig.headTo);

  const leg = (fx0: number, fx1: number, rot: number, lift: number): PartXf => ({
    px: -w / 2 + ((fx0 + fx1) / 2) * w,
    py: hipY,
    rot,
    dx: 0,
    dy: -lift,
    sx: 1,
    sy: 1 - lift * 0.02,
  });

  if (rig.hasWings) {
    // back wing behind the body
    const back: PartXf = {
      px: -w * 0.12,
      py: neckY + (hipY - neckY) * 0.3,
      rot: -0.5 + p.flap * 0.9,
      dx: 0,
      dy: 0,
      sx: 1,
      sy: 1,
    };
    drawPart(ctx, b, 0, rig.headTo * 0.6, 0.3, rig.torsoTo, back);
  }

  if (rig.legCols > 2) {
    // arachnid / insect: every leg column is its own limb, driven in two
    // alternating tripods, and each one rotates about its own attachment point
    // instead of being cut into a pair of human legs.
    const n = rig.legCols;
    const order = [...Array(n).keys()].sort(
      (i, j) => Math.abs(j - (n - 1) / 2) - Math.abs(i - (n - 1) / 2),
    ); // outer columns first, centre columns on top
    for (const i of order) {
      const fx0 = i / n;
      const fx1 = (i + 1) / n;
      const group = i % 2 === 0;
      const dir = fx0 + fx1 < 1 ? -1 : 1; // mirror so both sides push outward
      drawPart(
        ctx,
        b,
        fx0,
        rig.torsoTo,
        fx1,
        1,
        leg(fx0, fx1, (group ? p.legA : p.legB) * dir, group ? p.liftA : p.liftB),
      );
    }
  } else {
    // back leg first so the front leg reads on top
    drawPart(ctx, b, 0.5, rig.torsoTo, 1, 1, leg(0.5, 1, p.legB, p.liftB));
    drawPart(ctx, b, 0, rig.torsoTo, 0.5, 1, leg(0, 0.5, p.legA, p.liftA));
  }

  // torso pivots on the hips
  drawPart(ctx, b, 0, rig.headTo, 1, rig.torsoTo + 0.002, {
    px: 0,
    py: hipY,
    rot: p.torsoRot,
    dx: 0,
    dy: 0,
    sx: 1,
    sy: p.torsoSy,
  });

  if (rig.hasWings) {
    const front: PartXf = {
      px: w * 0.12,
      py: neckY + (hipY - neckY) * 0.3,
      rot: 0.5 - p.flap * 0.9,
      dx: 0,
      dy: 0,
      sx: 1,
      sy: 1,
    };
    drawPart(ctx, b, 0.7, rig.headTo * 0.6, 1, rig.torsoTo, front);
  }

  // head pivots at the neck
  drawPart(ctx, b, 0, 0, 1, rig.headTo + 0.002, {
    px: 0,
    py: neckY,
    rot: p.headRot,
    dx: 0,
    dy: p.headDy,
    sx: 1,
    sy: 1,
  });
}

/** Pixel grid: every frame is composed at this size, then blown up 1:N. */
const PIX = 64;

/**
 * Snaps colours to a coarse ramp and hard-cuts the alpha so the upscaled
 * result reads as hand-placed pixels instead of a smooth photo blowup.
 */
function posterize(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  const step = 26;
  const snap = (v: number) => Math.min(255, Math.round(v / step) * step);
  for (let i = 0; i < d.length; i += 4) {
    if ((d[i + 3] ?? 0) < 108) {
      d[i + 3] = 0;
      continue;
    }
    d[i + 3] = 255;
    d[i] = snap(d[i] ?? 0);
    d[i + 1] = snap(d[i + 1] ?? 0);
    d[i + 2] = snap(d[i + 2] ?? 0);
  }
  ctx.putImageData(data, 0, 0);
}

function buildStrip(img: HTMLImageElement, anim: Anim, gait: Gait): string {
  const frames = frameCount(anim);
  // 1) compose the animation on the low-res pixel grid
  const k = PIX / FRAME;
  const small = document.createElement("canvas");
  small.width = PIX * frames;
  small.height = PIX;
  const ctx = small.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.setTransform(k, 0, 0, k, 0, 0);

  const pad = 12;
  const box = FRAME - pad * 2;
  const scale = Math.min(box / img.width, box / img.height);
  const b: Body = { img, w: img.width * scale, h: img.height * scale };
  const floor = FRAME - pad * 0.7;
  const rig = rigFor(gait);

  for (let i = 0; i < frames; i++) {
    const t = i / frames;
    const p =
      anim === "idle"
        ? idlePose(gait, t)
        : anim === "walk"
          ? walkPose(gait, t)
          : deathPose(gait, i / (frames - 1));

    const cx = FRAME * i + FRAME / 2;

    ctx.save();
    ctx.translate(cx + p.sway * 0.4, floor);
    contactShadow(ctx, b.w, p.lift, p.alpha);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(cx + p.sway, floor - p.lift);
    ctx.rotate(p.lean);
    ctx.scale(p.sx, p.sy);

    if (gait === "serpent" || p.wave > 0.15) drawWave(ctx, b, p.wave, p.waves, p.phase);
    else drawPuppet(ctx, b, rig, p);

    if (p.flash > 0.01) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = p.flash * 0.85;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-b.w, -b.h - 6, b.w * 2, b.h + 12);
    }
    ctx.restore();
  }

  // 2) quantise, then blow the grid up with no filtering so pixels stay square
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  posterize(ctx, small.width, small.height);

  const cv = document.createElement("canvas");
  cv.width = FRAME * frames;
  cv.height = FRAME;
  const out = cv.getContext("2d")!;
  out.imageSmoothingEnabled = false;
  out.drawImage(small, 0, 0, cv.width, cv.height);
  return cv.toDataURL();
}

const cache = new Map<string, Promise<[string, string, string]>>();

/** [idle, walk, death] data urls derived from one illustrated sprite. */
export function artSrc(src: string, gait: Gait = "ground"): Promise<[string, string, string]> {
  const key = `${src}|${gait}`;
  let p = cache.get(key);
  if (!p) {
    p = loadImg(src).then((img) => [
      buildStrip(img, "idle", gait),
      buildStrip(img, "walk", gait),
      buildStrip(img, "death", gait),
    ]);
    cache.set(key, p);
  }
  return p;
}
