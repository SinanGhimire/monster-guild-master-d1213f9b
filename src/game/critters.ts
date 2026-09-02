/**
 * Procedural chibi creature art.
 *
 * Every creature here is drawn at runtime on a canvas in a thick-outlined,
 * cel-shaded chibi style — no imported sprite packs. Each design produces the
 * three strips the engine expects: idle (6), walk (8), death (10).
 *
 * The renderer is deliberately layered like a painter would work:
 * shadow -> tail -> wings -> back limbs -> body (base, cel shade, rim light,
 * pattern) -> belly plate -> arms + claws -> crown -> brows -> eyes -> mouth.
 */

export type CritterShape =
  | "blob" | "egg" | "round" | "wide" | "tall"
  | "block" | "insect" | "long" | "serpent" | "sack" | "shard"
  | "jelly" | "totem" | "orb" | "tripod" | "brain" | "mound" | "worm"
  | "ghost" | "mech";
export type CritterCrown =
  | "none" | "horns" | "ears" | "antenna" | "spikes" | "crown" | "fin"
  | "turret" | "pincers" | "pipe" | "shards"
  | "rings" | "scythes" | "drill" | "megaphone" | "hornsteel" | "pavise";
export type CritterMouth = "none" | "fangs" | "grin" | "smile" | "maw";
export type CritterPattern = "none" | "spots" | "stripes" | "plates" | "belly";
export type CritterBrow = "none" | "angry" | "sad" | "flat";

export type CritterEnemyKey =
  // ---- critters
  | "e_mushroom"
  // ---- undead
  | "e_skel_white" | "e_skel_gold"
  // ---- imps
  | "e_imp_violet" | "e_imp_bile" | "e_imp_crimson" | "e_gnat"
  // ---- vermin
  | "e_bat"
  // ---- slimes
  | "e_sticklooter" | "e_slime_skull"
  // ---- bosses
  | "e_nightborne" | "e_demon_slime"
  // ---- graveyard shift
  | "e_blob_gray" | "e_blob_pup" | "e_zombie" | "e_ghost" | "e_hound";

export type CritterHeroKey = "templar" | "reaper" | "oracle" | "seraph" | "warchief" | "sprout";

/** Class headgear drawn on top of the base chibi body (see class-critters.ts). */
export type CritterHat =
  | "none"
  | "bandana"
  | "boomerang"
  | "armyhelm"
  | "ninjamask"
  | "hood"
  | "piratehat"
  | "vikinghelm"
  | "knighthelm"
  | "gladiatorhelm"
  | "feathercap"
  | "greenhood"
  | "wizardhat"
  | "witchhat"
  | "antlers"
  | "featherband"
  | "headband"
  | "mitre"
  | "goggles"
  | "gasmask"
  | "headmirror"
  | "mohawk"
  | "jesterhat"
  | "afro"
  | "sheet"
  | "cultisthood"
  | "demonhorns"
  | "reaperhood";

export interface CritterDesign {
  key: CritterEnemyKey | CritterHeroKey | (string & {});
  name: string;
  /** main body colour */
  body: string;
  /** darker tone used for the cel shadow, horns and pattern */
  shade: string;
  /** iris colour */
  eye: string;
  shape: CritterShape;
  crown: CritterCrown;
  mouth: CritterMouth;
  eyes: 0 | 1 | 2 | 3;
  /** leg rig: a normal pair, a skittering many-legged rig, or none at all */
  legs?: "two" | "many" | "none";
  /** emissive inner core colour (crystals, unstable spores) */
  core?: string;
  /** neon rim: the silhouette is traced in glowing light */
  neon?: string;
  arms: boolean;
  tail: boolean;
  /** bulk: nudges silhouette proportions (world size comes from the stat table) */
  size: number;
  pattern?: CritterPattern;
  brow?: CritterBrow;
  wings?: boolean;
  claws?: boolean;
  /** optional emissive halo behind the creature (bosses / elites) */
  glow?: string;
  /** class headgear layered over the head (drawn last, above the face) */
  hat?: CritterHat;
  /** accent colour used by some hats (plumes, cloth, gems) */
  accent?: string;
}

const OUTLINE = "#140f1a";
const LIMB = "#231b2e";
const TOOTH = "#fdfbff";

export const FRAME = 160;
export const IDLE_FRAMES = 6;
export const WALK_FRAMES = 8;
export const DEATH_FRAMES = 10;

/* ------------------------------- the roster -------------------------------- */

export const CRITTER_ENEMIES: CritterDesign[] = [
  // ---- critters
  { key: "e_mushroom", name: "Spore Cap", body: "#d95f5f", shade: "#7a2c2c", eye: "#fff0d0", shape: "mound", crown: "none", mouth: "grin", eyes: 2, arms: true, tail: false, size: 0.95, legs: "two", pattern: "spots", glow: "rgba(217,95,95,0.35)" },
  // ---- imps
  { key: "e_imp_violet", name: "Violet Imp", body: "#a06bd6", shade: "#4c2c78", eye: "#f2e6ff", shape: "orb", crown: "horns", mouth: "none", eyes: 2, arms: false, tail: false, size: 0.75, legs: "two", pattern: "none" },
  { key: "e_imp_bile", name: "Bile Imp", body: "#9fc24a", shade: "#4c6318", eye: "#eaffb8", shape: "orb", crown: "horns", mouth: "fangs", eyes: 2, arms: false, tail: true, size: 0.8, legs: "two", pattern: "spots", brow: "angry" },
  { key: "e_imp_crimson", name: "Crimson Imp", body: "#d4544f", shade: "#6d1f1c", eye: "#ffe0d0", shape: "orb", crown: "hornsteel", mouth: "fangs", eyes: 2, arms: false, tail: false, size: 0.85, legs: "two", pattern: "none", brow: "angry" },
  { key: "e_gnat", name: "Fuzz Stinger", body: "#c9b273", shade: "#6d5c2c", eye: "#fff3c9", shape: "orb", crown: "none", mouth: "fangs", eyes: 2, arms: false, tail: false, size: 0.8, legs: "none", pattern: "none", wings: true, glow: "rgba(201,178,115,0.32)" },

  // ---- undead
  { key: "e_skel_white", name: "Bone Soldier", body: "#e8e8ee", shade: "#8b8b98", eye: "#9fd8ff", shape: "tall", crown: "none", mouth: "fangs", eyes: 2, arms: true, tail: false, size: 1, legs: "two", pattern: "none", brow: "angry" },
  { key: "e_skel_gold", name: "Gilded Bones", body: "#e8c56a", shade: "#8c6f1f", eye: "#fff0b8", shape: "tall", crown: "none", mouth: "fangs", eyes: 2, arms: true, tail: false, size: 1.05, legs: "two", pattern: "none", brow: "angry", glow: "rgba(232,197,106,0.35)" },




  // ---- golems: the heavy late-wave threats
  // ---- vermin & arcane
  { key: "e_bat", name: "Night Bat", body: "#6b5aa8", shade: "#2f2650", eye: "#ffd24a", shape: "orb", crown: "ears", mouth: "fangs", eyes: 2, arms: false, tail: false, size: 0.7, legs: "none", pattern: "none", wings: true, glow: "rgba(107,90,168,0.32)" },

  // ---- bosses
  { key: "e_sticklooter", name: "Sticklooter", body: "#7fd6a8", shade: "#2f6b4c", eye: "#0f2a1c", shape: "jelly", crown: "none", mouth: "grin", eyes: 2, arms: false, tail: false, size: 0.8, legs: "none", pattern: "spots" },
  { key: "e_slime_skull", name: "Skull Ooze", body: "#9fb6d8", shade: "#3c4a68", eye: "#ff7a4a", shape: "jelly", crown: "none", mouth: "fangs", eyes: 2, arms: false, tail: false, size: 0.9, legs: "none", pattern: "none", brow: "angry", glow: "rgba(159,182,216,0.32)" },
  { key: "e_demon_slime", name: "Demon Slime", body: "#c33f5c", shade: "#5c1424", eye: "#ffd24a", shape: "blob", crown: "horns", mouth: "maw", eyes: 2, arms: true, tail: false, size: 1.8, legs: "two", pattern: "none", brow: "angry", glow: "rgba(195,63,92,0.45)" },
  { key: "e_nightborne", name: "NightBorne", body: "#3b2a55", shade: "#170f26", eye: "#ff3b5c", shape: "tall", crown: "spikes", mouth: "fangs", eyes: 2, arms: true, tail: false, size: 1.7, legs: "two", pattern: "none", brow: "angry", glow: "rgba(255,59,92,0.4)" },


];

export const CRITTER_HEROES: CritterDesign[] = [
  { key: "templar", name: "Templar", body: "#e8e2d2", shade: "#a89f88", eye: "#3a6fd0", shape: "egg", crown: "crown", mouth: "smile", eyes: 2, arms: true, tail: false, size: 0.95, pattern: "plates", brow: "flat" },
  { key: "reaper", name: "Reaper", body: "#4c4a63", shade: "#26243a", eye: "#8bf7c8", shape: "tall", crown: "fin", mouth: "grin", eyes: 2, arms: true, tail: true, size: 1, pattern: "none", brow: "angry", glow: "rgba(120,255,205,0.35)" },
  { key: "oracle", name: "Oracle", body: "#8f6ce0", shade: "#4f3496", eye: "#ffe9a8", shape: "egg", crown: "antenna", mouth: "smile", eyes: 1, arms: true, tail: false, size: 0.95, pattern: "spots", brow: "flat" },
  { key: "seraph", name: "Seraph", body: "#ffd98a", shade: "#cb9c40", eye: "#4a2f0a", shape: "round", crown: "crown", mouth: "smile", eyes: 2, arms: true, tail: false, size: 0.95, pattern: "belly", brow: "flat", wings: true },
  { key: "warchief", name: "Warchief", body: "#6fbf5a", shade: "#33771f", eye: "#ffeecb", shape: "wide", crown: "horns", mouth: "fangs", eyes: 2, arms: true, tail: false, size: 1.05, pattern: "stripes", brow: "angry", claws: true },
  { key: "sprout", name: "Sprout", body: "#a8e86f", shade: "#639f2c", eye: "#1f3a12", shape: "blob", crown: "ears", mouth: "grin", eyes: 2, arms: true, tail: true, size: 0.82, pattern: "spots", brow: "sad" },
];

/* --------------------------------- helpers --------------------------------- */

function parseColor(v: string): [number, number, number] {
  if (v.startsWith("#")) {
    return [
      parseInt(v.slice(1, 3), 16),
      parseInt(v.slice(3, 5), 16),
      parseInt(v.slice(5, 7), 16),
    ];
  }
  const m = v.match(/-?\d+(\.\d+)?/g) ?? ["0", "0", "0"];
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

/** blend two colours (hex or rgb()) — used for cel shading and highlights */
function mix(from: string, to: string, t: number) {
  const a = parseColor(from);
  const b = parseColor(to);
  const c = a.map((v, i) => Math.round(v + (b[i]! - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** deterministic pseudo-random so a design always looks identical */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function seedOf(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** limbs read as a darker relative of the body instead of flat black */
function limbTone(d: CritterDesign) {
  return mix(d.shade, LIMB, 0.55);
}

function ink(g: CanvasRenderingContext2D, width: number) {
  g.lineJoin = "round";
  g.lineCap = "round";
  g.lineWidth = width;
  g.strokeStyle = OUTLINE;
}

/* --------------------------------- drawing --------------------------------- */

function bodyPath(g: CanvasRenderingContext2D, d: CritterDesign, w: number, h: number, squash: number) {
  const bw = w * (1 + (1 - squash) * 0.3);
  const bh = h * squash;
  g.beginPath();
  switch (d.shape) {
    case "egg":
      g.moveTo(0, -bh);
      g.bezierCurveTo(bw * 0.62, -bh * 0.96, bw * 0.6, -bh * 0.1, 0, -bh * 0.02);
      g.bezierCurveTo(-bw * 0.6, -bh * 0.1, -bw * 0.62, -bh * 0.96, 0, -bh);
      break;
    case "round":
      g.moveTo(0, -bh);
      g.bezierCurveTo(bw * 0.78, -bh * 0.98, bw * 0.74, -bh * 0.06, 0, -bh * 0.02);
      g.bezierCurveTo(-bw * 0.74, -bh * 0.06, -bw * 0.78, -bh * 0.98, 0, -bh);
      break;
    case "wide":
      g.moveTo(0, -bh * 0.98);
      g.bezierCurveTo(bw * 0.96, -bh * 0.9, bw * 0.9, -bh * 0.04, 0, -bh * 0.02);
      g.bezierCurveTo(-bw * 0.9, -bh * 0.04, -bw * 0.96, -bh * 0.9, 0, -bh * 0.98);
      break;
    case "tall":
      g.moveTo(0, -bh * 1.02);
      g.bezierCurveTo(bw * 0.66, -bh * 0.98, bw * 0.62, -bh * 0.12, 0, -bh * 0.03);
      g.bezierCurveTo(-bw * 0.62, -bh * 0.12, -bw * 0.66, -bh * 0.98, 0, -bh * 1.02);
      break;
    case "block":
      // brute: chunky monolith with heavy square shoulders
      g.moveTo(-bw * 0.92, -bh * 0.02);
      g.lineTo(-bw * 0.98, -bh * 0.76);
      g.quadraticCurveTo(-bw * 0.94, -bh * 1.0, -bw * 0.6, -bh * 1.02);
      g.lineTo(bw * 0.6, -bh * 1.02);
      g.quadraticCurveTo(bw * 0.94, -bh * 1.0, bw * 0.98, -bh * 0.76);
      g.lineTo(bw * 0.92, -bh * 0.02);
      break;
    case "insect":
      // elongated thorax leaning forward over the legs
      g.moveTo(0, -bh * 1.04);
      g.bezierCurveTo(bw * 0.72, -bh * 0.94, bw * 0.86, -bh * 0.3, bw * 0.34, -bh * 0.05);
      g.bezierCurveTo(0, bh * 0.03, -bw * 0.34, -bh * 0.05, -bw * 0.72, -bh * 0.34);
      g.bezierCurveTo(-bw * 0.82, -bh * 0.8, -bw * 0.4, -bh * 1.02, 0, -bh * 1.04);
      break;
    case "long":
      // horizontal centipedal body
      g.moveTo(-bw * 1.5, -bh * 0.42);
      g.bezierCurveTo(-bw * 1.5, -bh * 0.86, -bw * 0.5, -bh * 0.9, 0, -bh * 0.82);
      g.bezierCurveTo(bw * 0.8, -bh * 0.72, bw * 1.55, -bh * 0.74, bw * 1.5, -bh * 0.34);
      g.bezierCurveTo(bw * 1.45, -bh * 0.06, -bw * 1.45, -bh * 0.08, -bw * 1.5, -bh * 0.42);
      break;
    case "serpent":
      // sinuous coil rising into a raised head
      g.moveTo(-bw * 1.1, -bh * 0.06);
      g.bezierCurveTo(-bw * 1.35, -bh * 0.5, -bw * 0.35, -bh * 0.5, -bw * 0.2, -bh * 0.86);
      g.bezierCurveTo(-bw * 0.06, -bh * 1.16, bw * 0.7, -bh * 1.12, bw * 0.66, -bh * 0.74);
      g.bezierCurveTo(bw * 0.62, -bh * 0.44, bw * 0.02, -bh * 0.5, bw * 0.16, -bh * 0.2);
      g.bezierCurveTo(bw * 0.3, bh * 0.02, -bw * 0.6, bh * 0.02, -bw * 1.1, -bh * 0.06);
      break;
    case "sack":
      // slumped artillery sack, wide bottom, narrow shoulders
      g.moveTo(0, -bh * 0.98);
      g.bezierCurveTo(bw * 0.5, -bh * 0.94, bw * 1.02, -bh * 0.34, bw * 0.78, -bh * 0.06);
      g.bezierCurveTo(bw * 0.3, bh * 0.06, -bw * 0.3, bh * 0.06, -bw * 0.78, -bh * 0.06);
      g.bezierCurveTo(-bw * 1.02, -bh * 0.34, -bw * 0.5, -bh * 0.94, 0, -bh * 0.98);
      break;
    case "jelly":
      // floating bell with a scalloped hem
      g.moveTo(-bw * 0.9, -bh * 0.52);
      g.bezierCurveTo(-bw * 0.9, -bh * 1.14, bw * 0.9, -bh * 1.14, bw * 0.9, -bh * 0.52);
      for (let i = 3; i >= -3; i--) {
        g.quadraticCurveTo(bw * (i / 3.4), -bh * 0.34, bw * ((i - 1) / 3.4), -bh * 0.52);
      }
      break;
    case "totem": {
      // levitating stacked geometric monolith
      g.moveTo(-bw * 0.5, -bh * 0.1);
      g.lineTo(-bw * 0.72, -bh * 0.56);
      g.lineTo(-bw * 0.4, -bh * 0.68);
      g.lineTo(-bw * 0.58, -bh * 1.1);
      g.lineTo(bw * 0.58, -bh * 1.1);
      g.lineTo(bw * 0.4, -bh * 0.68);
      g.lineTo(bw * 0.72, -bh * 0.56);
      g.lineTo(bw * 0.5, -bh * 0.1);
      break;
    }
    case "orb":
      // near-perfect sphere floating a little off the deck
      g.arc(0, -bh * 0.6, Math.min(bw, bh) * 0.62, 0, Math.PI * 2);
      break;
    case "tripod": {
      // towering hull sitting on three splayed struts
      g.moveTo(-bw * 0.62, -bh * 0.62);
      g.bezierCurveTo(-bw * 0.7, -bh * 1.18, bw * 0.7, -bh * 1.18, bw * 0.62, -bh * 0.62);
      g.lineTo(bw * 0.9, -bh * 0.02);
      g.lineTo(bw * 0.44, -bh * 0.5);
      g.lineTo(bw * 0.1, -bh * 0.02);
      g.lineTo(-bw * 0.24, -bh * 0.5);
      g.lineTo(-bw * 0.9, -bh * 0.02);
      g.lineTo(-bw * 0.62, -bh * 0.62);
      break;
    }
    case "brain": {
      // lobed mass inside a containment vat
      g.moveTo(-bw * 0.86, -bh * 0.4);
      for (let i = 0; i < 7; i++) {
        const a = Math.PI - (i / 6) * Math.PI;
        const rx = Math.cos(a) * bw * 0.86;
        const ry = -bh * 0.4 - Math.sin(a) * bh * 0.62;
        g.quadraticCurveTo(rx * 1.18, ry * 1.1, rx, ry);
      }
      g.bezierCurveTo(bw * 0.72, -bh * 0.04, -bw * 0.72, -bh * 0.04, -bw * 0.86, -bh * 0.4);
      break;
    }
    case "mound":
      // rooted nest anchored wide to the floor
      g.moveTo(-bw * 1.22, 0);
      g.bezierCurveTo(-bw * 1.05, -bh * 0.86, -bw * 0.36, -bh * 1.08, 0, -bh * 1.08);
      g.bezierCurveTo(bw * 0.36, -bh * 1.08, bw * 1.05, -bh * 0.86, bw * 1.22, 0);
      break;
    case "worm":
      // low tube body reared up at the mouth end
      g.moveTo(-bw * 1.2, -bh * 0.08);
      g.bezierCurveTo(-bw * 1.4, -bh * 0.46, -bw * 0.5, -bh * 0.42, -bw * 0.2, -bh * 0.66);
      g.bezierCurveTo(0, -bh * 0.86, bw * 0.9, -bh * 0.9, bw * 0.9, -bh * 0.5);
      g.bezierCurveTo(bw * 0.9, -bh * 0.14, bw * 0.2, -bh * 0.02, -bw * 1.2, -bh * 0.08);
      break;
    case "ghost":
      // hovering phantom with a ragged hem
      g.moveTo(-bw * 0.74, -bh * 0.3);
      g.bezierCurveTo(-bw * 0.8, -bh * 1.12, bw * 0.8, -bh * 1.12, bw * 0.74, -bh * 0.3);
      g.lineTo(bw * 0.5, -bh * 0.06);
      g.lineTo(bw * 0.24, -bh * 0.24);
      g.lineTo(0, -bh * 0.04);
      g.lineTo(-bw * 0.24, -bh * 0.24);
      g.lineTo(-bw * 0.5, -bh * 0.06);
      break;
    case "mech":
      // boxy chassis with a bevelled canopy
      g.moveTo(-bw * 0.96, -bh * 0.04);
      g.lineTo(-bw * 0.86, -bh * 0.62);
      g.lineTo(-bw * 0.52, -bh * 1.0);
      g.lineTo(bw * 0.52, -bh * 1.0);
      g.lineTo(bw * 0.86, -bh * 0.62);
      g.lineTo(bw * 0.96, -bh * 0.04);
      break;
    case "shard": {
      // faceted geode: an angular crystal hull
      const pts: [number, number][] = [
        [0, -bh * 1.08], [bw * 0.52, -bh * 0.86], [bw * 0.86, -bh * 0.44],
        [bw * 0.6, -bh * 0.04], [-bw * 0.6, -bh * 0.04], [-bw * 0.86, -bh * 0.44],
        [-bw * 0.52, -bh * 0.86],
      ];
      g.moveTo(pts[0]![0], pts[0]![1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]![0], pts[i]![1]);
      break;
    }
    default:
      // blob: heavy pear silhouette with a soft crown
      g.moveTo(-bw * 0.56, -bh * 0.36);
      g.bezierCurveTo(-bw * 0.66, -bh * 1.04, bw * 0.66, -bh * 1.04, bw * 0.56, -bh * 0.36);
      g.bezierCurveTo(bw * 0.6, -bh * 0.02, -bw * 0.6, -bh * 0.02, -bw * 0.56, -bh * 0.36);
      break;
  }
  g.closePath();
}

function drawPattern(g: CanvasRenderingContext2D, d: CritterDesign, w: number, h: number) {
  const r = rng(seedOf(d.key));
  const dark = mix(d.shade, "#000000", 0.15);
  switch (d.pattern) {
    case "spots":
      g.fillStyle = dark;
      g.globalAlpha = 0.5;
      for (let i = 0; i < 9; i++) {
        const x = (r() - 0.5) * w * 1.5;
        const y = -h * (0.08 + r() * 0.5);
        const rr = w * (0.05 + r() * 0.07);
        g.beginPath();
        g.ellipse(x, y, rr, rr * 0.82, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
      break;
    case "stripes":
      g.strokeStyle = dark;
      g.globalAlpha = 0.45;
      g.lineWidth = w * 0.1;
      g.lineCap = "round";
      for (let i = 0; i < 5; i++) {
        const y = -h * (0.08 + i * 0.11);
        g.beginPath();
        g.moveTo(-w, y);
        g.quadraticCurveTo(0, y - h * 0.06, w, y);
        g.stroke();
      }
      break;
    case "plates":
      g.strokeStyle = dark;
      g.globalAlpha = 0.55;
      g.lineWidth = 3.5;
      for (let i = 0; i < 4; i++) {
        const y = -h * (0.1 + i * 0.12);
        g.beginPath();
        g.moveTo(-w * 0.8, y);
        g.quadraticCurveTo(0, y + h * 0.07, w * 0.8, y);
        g.stroke();
      }
      break;
    case "belly":
      g.globalAlpha = 0.85;
      g.fillStyle = mix(d.body, "#ffffff", 0.55);
      g.beginPath();
      g.ellipse(0, -h * 0.2, w * 0.46, h * 0.24, 0, 0, Math.PI * 2);
      g.fill();
      break;
    default:
      break;
  }
  g.globalAlpha = 1;
}

function drawCrown(g: CanvasRenderingContext2D, d: CritterDesign, w: number, h: number) {
  const top = -h * 0.9;
  const horn = mix(d.shade, "#f7edd8", 0.72);
  ink(g, 5);

  const drawHorn = (sx: number) => {
    const grad = g.createLinearGradient(sx * w * 0.2, top, sx * w * 0.7, top - h * 0.4);
    grad.addColorStop(0, mix(horn, "#000000", 0.3));
    grad.addColorStop(1, mix(horn, "#ffffff", 0.5));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(sx * w * 0.22, top + h * 0.18);
    g.quadraticCurveTo(sx * w * 0.42, top - h * 0.08, sx * w * 0.78, top - h * 0.2);
    g.quadraticCurveTo(sx * w * 0.52, top + h * 0.04, sx * w * 0.56, top + h * 0.2);
    g.closePath();
    g.fill();
    g.stroke();
    // ridge lines carved into the horn
    g.save();
    g.globalAlpha = 0.4;
    g.lineWidth = 2.4;
    for (let i = 1; i <= 2; i++) {
      const t = i / 3;
      g.beginPath();
      g.moveTo(sx * w * (0.18 + 0.3 * t), top + h * (0.14 - 0.13 * t));
      g.lineTo(sx * w * (0.5 + 0.14 * t), top + h * (0.16 - 0.22 * t));
      g.stroke();
    }
    g.restore();
  };

  switch (d.crown) {
    case "horns":
      drawHorn(-1);
      drawHorn(1);
      break;
    case "ears":
      for (const sx of [-1, 1]) {
        g.fillStyle = d.body;
        g.beginPath();
        g.ellipse(sx * w * 0.5, top - h * 0.02, w * 0.16, h * 0.24, sx * 0.42, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.save();
        g.globalAlpha = 0.75;
        g.fillStyle = mix(d.shade, "#ff9ec0", 0.4);
        g.beginPath();
        g.ellipse(sx * w * 0.5, top - h * 0.02, w * 0.075, h * 0.14, sx * 0.42, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      break;
    case "antenna":
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(0, top + h * 0.1);
      g.quadraticCurveTo(w * 0.22, top - h * 0.2, w * 0.06, top - h * 0.36);
      g.stroke();
      g.beginPath();
      g.arc(w * 0.06, top - h * 0.42, w * 0.12, 0, Math.PI * 2);
      g.fillStyle = mix(d.eye, "#ffffff", 0.35);
      g.fill();
      g.stroke();
      g.save();
      g.globalAlpha = 0.7;
      g.fillStyle = "#fff";
      g.beginPath();
      g.arc(w * 0.02, top - h * 0.46, w * 0.04, 0, Math.PI * 2);
      g.fill();
      g.restore();
      break;
    case "spikes":
      for (let i = -2; i <= 2; i++) {
        const tall = 1 - Math.abs(i) * 0.22;
        g.beginPath();
        g.moveTo(i * w * 0.24 - w * 0.11, top + h * 0.16);
        g.quadraticCurveTo(i * w * 0.24, top - h * 0.1 * tall, i * w * 0.24, top - h * 0.3 * tall);
        g.quadraticCurveTo(i * w * 0.24, top - h * 0.1 * tall, i * w * 0.24 + w * 0.11, top + h * 0.16);
        g.closePath();
        g.fillStyle = mix(d.shade, "#f7edd8", 0.66);
        g.fill();
        g.stroke();
      }
      break;
    case "crown": {
      const gold = g.createLinearGradient(0, top - h * 0.3, 0, top + h * 0.06);
      gold.addColorStop(0, "#ffe9a0");
      gold.addColorStop(0.5, "#ffc43e");
      gold.addColorStop(1, "#c98a1a");
      g.fillStyle = gold;
      g.beginPath();
      g.moveTo(-w * 0.42, top + h * 0.08);
      g.lineTo(-w * 0.46, top - h * 0.26);
      g.lineTo(-w * 0.18, top - h * 0.08);
      g.lineTo(0, top - h * 0.36);
      g.lineTo(w * 0.18, top - h * 0.08);
      g.lineTo(w * 0.46, top - h * 0.26);
      g.lineTo(w * 0.42, top + h * 0.08);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = "#ff5c7a";
      for (const sx of [-1, 0, 1]) {
        g.beginPath();
        g.arc(sx * w * 0.24, top - h * 0.02, w * 0.045, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      break;
    }
    case "fin":
      g.fillStyle = mix(d.shade, "#ffffff", 0.18);
      g.beginPath();
      g.moveTo(-w * 0.1, top + h * 0.16);
      g.quadraticCurveTo(-w * 0.02, top - h * 0.46, w * 0.26, top - h * 0.1);
      g.quadraticCurveTo(w * 0.08, top + h * 0.06, -w * 0.1, top + h * 0.16);
      g.closePath();
      g.fill();
      g.stroke();
      g.save();
      g.globalAlpha = 0.35;
      g.lineWidth = 2.6;
      for (let i = 1; i <= 3; i++) {
        g.beginPath();
        g.moveTo(-w * 0.02 + i * w * 0.05, top + h * 0.1);
        g.lineTo(w * 0.02 + i * w * 0.05, top - h * 0.16 + i * h * 0.05);
        g.stroke();
      }
      g.restore();
      break;
    case "turret": {
      // spitter: a single bulbous eye on a stalk, used as a weapon
      g.lineWidth = 7;
      g.strokeStyle = OUTLINE;
      g.beginPath();
      g.moveTo(0, top + h * 0.22);
      g.quadraticCurveTo(w * 0.1, top - h * 0.12, w * 0.02, top - h * 0.3);
      g.stroke();
      g.strokeStyle = limbTone(d);
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(0, top + h * 0.22);
      g.quadraticCurveTo(w * 0.1, top - h * 0.12, w * 0.02, top - h * 0.3);
      g.stroke();
      const eyeR = w * 0.3;
      const bulb = g.createRadialGradient(-eyeR * 0.3, top - h * 0.44 - eyeR * 0.3, 0, 0, top - h * 0.42, eyeR);
      bulb.addColorStop(0, mix(d.eye, "#ffffff", 0.7));
      bulb.addColorStop(0.6, d.eye);
      bulb.addColorStop(1, mix(d.eye, "#000000", 0.55));
      g.fillStyle = bulb;
      ink(g, 5.5);
      g.beginPath();
      g.arc(0, top - h * 0.42, eyeR, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = OUTLINE;
      g.beginPath();
      g.ellipse(0, top - h * 0.42, eyeR * 0.24, eyeR * 0.5, 0, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.globalAlpha = 0.9;
      g.fillStyle = "#fff";
      g.beginPath();
      g.arc(-eyeR * 0.36, top - h * 0.42 - eyeR * 0.34, eyeR * 0.2, 0, Math.PI * 2);
      g.fill();
      g.restore();
      break;
    }
    case "pincers": {
      // charger: two oversized chrome pincers clamped out in front
      for (const sx of [-1, 1]) {
        const chrome = g.createLinearGradient(sx * w * 0.3, top + h * 0.5, sx * w * 1.2, top - h * 0.1);
        chrome.addColorStop(0, "#7d8798");
        chrome.addColorStop(0.4, "#f2f6fa");
        chrome.addColorStop(0.75, "#9aa4b4");
        chrome.addColorStop(1, "#4f5866");
        g.fillStyle = chrome;
        ink(g, 5.5);
        // upper jaw
        g.beginPath();
        g.moveTo(sx * w * 0.34, top + h * 0.46);
        g.quadraticCurveTo(sx * w * 1.16, top + h * 0.3, sx * w * 1.26, top - h * 0.06);
        g.quadraticCurveTo(sx * w * 0.98, top + h * 0.16, sx * w * 0.74, top + h * 0.22);
        g.quadraticCurveTo(sx * w * 0.9, top + h * 0.42, sx * w * 0.34, top + h * 0.46);
        g.closePath();
        g.fill();
        g.stroke();
        // lower jaw
        g.beginPath();
        g.moveTo(sx * w * 0.34, top + h * 0.56);
        g.quadraticCurveTo(sx * w * 1.02, top + h * 0.66, sx * w * 1.2, top + h * 0.46);
        g.quadraticCurveTo(sx * w * 0.92, top + h * 0.48, sx * w * 0.72, top + h * 0.4);
        g.closePath();
        g.fill();
        g.stroke();
      }
      break;
    }
    case "pipe": {
      // lobber: hollow mortar pipe venting plasma loops
      g.save();
      g.translate(-w * 0.1, top + h * 0.18);
      g.rotate(-0.5);
      const steel = g.createLinearGradient(-w * 0.2, 0, w * 0.2, 0);
      steel.addColorStop(0, mix(d.shade, "#000000", 0.3));
      steel.addColorStop(0.5, mix(d.shade, "#ffffff", 0.35));
      steel.addColorStop(1, mix(d.shade, "#000000", 0.2));
      g.fillStyle = steel;
      ink(g, 5.5);
      g.beginPath();
      g.moveTo(-w * 0.2, h * 0.14);
      g.lineTo(-w * 0.26, -h * 0.42);
      g.lineTo(w * 0.26, -h * 0.42);
      g.lineTo(w * 0.2, h * 0.14);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = "#2a1206";
      g.beginPath();
      g.ellipse(0, -h * 0.42, w * 0.26, h * 0.08, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.save();
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) {
        g.globalAlpha = 0.5 - i * 0.14;
        g.strokeStyle = i % 2 ? "#ffd08a" : "#ff7a2f";
        g.lineWidth = 4 - i;
        g.beginPath();
        g.arc(0, -h * (0.56 + i * 0.16), w * (0.16 + i * 0.08), Math.PI * 0.15, Math.PI * 0.85, true);
        g.stroke();
      }
      g.restore();
      g.restore();
      break;
    }
    case "shards": {
      // splinter: crystal spurs bursting out of the hull
      for (const [sx, sc] of [[-1, 0.9], [1, 1.05], [0, 1.25]] as [number, number][]) {
        const cry = g.createLinearGradient(sx * w * 0.3, top, sx * w * 0.3, top - h * 0.4 * sc);
        cry.addColorStop(0, mix(d.body, "#ffffff", 0.2));
        cry.addColorStop(1, mix(d.core ?? d.body, "#ffffff", 0.75));
        g.fillStyle = cry;
        ink(g, 5);
        g.beginPath();
        g.moveTo(sx * w * 0.34 - w * 0.14, top + h * 0.16);
        g.lineTo(sx * w * 0.34, top - h * 0.34 * sc);
        g.lineTo(sx * w * 0.34 + w * 0.14, top + h * 0.16);
        g.closePath();
        g.fill();
        g.stroke();
      }
      break;
    }
    case "rings": {
      // orbiting runic / copper rings spinning on an electrostatic axis
      g.save();
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) {
        g.strokeStyle = mix(d.neon ?? d.eye, "#ffffff", 0.25);
        g.globalAlpha = 0.75 - i * 0.18;
        g.lineWidth = 4 - i * 0.8;
        g.beginPath();
        g.ellipse(0, top + h * (0.32 - i * 0.16), w * (0.98 - i * 0.12), h * (0.12 + i * 0.03), i * 0.5, 0, Math.PI * 2);
        g.stroke();
      }
      g.restore();
      ink(g, 4);
      g.fillStyle = mix(d.shade, "#ffffff", 0.4);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.beginPath();
        g.ellipse(Math.cos(a) * w * 0.92, top + h * 0.3 + Math.sin(a) * h * 0.11, w * 0.09, h * 0.05, a, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      break;
    }
    case "scythes": {
      // dual energy scythes held wide
      for (const sx of [-1, 1]) {
        g.strokeStyle = OUTLINE;
        g.lineWidth = 8;
        g.beginPath();
        g.moveTo(sx * w * 0.7, top + h * 0.72);
        g.lineTo(sx * w * 0.94, top - h * 0.16);
        g.stroke();
        g.strokeStyle = limbTone(d);
        g.lineWidth = 4;
        g.stroke();
        const blade = g.createLinearGradient(sx * w * 0.9, top - h * 0.2, sx * w * 0.2, top - h * 0.5);
        blade.addColorStop(0, mix(d.eye, "#ffffff", 0.7));
        blade.addColorStop(1, mix(d.eye, "#000000", 0.35));
        g.fillStyle = blade;
        ink(g, 4.5);
        g.beginPath();
        g.moveTo(sx * w * 0.94, top - h * 0.14);
        g.quadraticCurveTo(sx * w * 0.2, top - h * 0.6, -sx * w * 0.1, top - h * 0.2);
        g.quadraticCurveTo(sx * w * 0.4, top - h * 0.32, sx * w * 0.94, top - h * 0.02);
        g.closePath();
        g.fill();
        g.stroke();
      }
      break;
    }
    case "drill": {
      // heavy conical drill head bolted to the skull
      const steel = g.createLinearGradient(-w * 0.4, top, w * 0.4, top - h * 0.4);
      steel.addColorStop(0, "#5d646f");
      steel.addColorStop(0.5, "#e3e9f0");
      steel.addColorStop(1, "#6b727d");
      g.fillStyle = steel;
      ink(g, 5.5);
      g.beginPath();
      g.moveTo(-w * 0.44, top + h * 0.18);
      g.lineTo(0, top - h * 0.52);
      g.lineTo(w * 0.44, top + h * 0.18);
      g.closePath();
      g.fill();
      g.stroke();
      g.save();
      g.globalAlpha = 0.5;
      g.lineWidth = 3;
      for (let i = 1; i <= 3; i++) {
        const t = i / 4;
        g.beginPath();
        g.moveTo(-w * 0.44 * (1 - t), top + h * (0.18 - 0.7 * t));
        g.lineTo(w * 0.44 * (1 - t), top + h * (0.1 - 0.7 * t));
        g.stroke();
      }
      g.restore();
      break;
    }
    case "megaphone": {
      // central speaker core ringed by psychic waves
      const cone = g.createLinearGradient(0, top - h * 0.3, 0, top + h * 0.2);
      cone.addColorStop(0, mix(d.eye, "#ffffff", 0.5));
      cone.addColorStop(1, mix(d.shade, "#000000", 0.2));
      g.fillStyle = cone;
      ink(g, 5);
      g.beginPath();
      g.moveTo(-w * 0.16, top + h * 0.22);
      g.lineTo(-w * 0.5, top - h * 0.34);
      g.lineTo(w * 0.5, top - h * 0.34);
      g.lineTo(w * 0.16, top + h * 0.22);
      g.closePath();
      g.fill();
      g.stroke();
      g.save();
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) {
        g.globalAlpha = 0.5 - i * 0.14;
        g.strokeStyle = mix(d.eye, "#ffffff", 0.4);
        g.lineWidth = 3.4 - i * 0.7;
        g.beginPath();
        g.arc(0, top - h * 0.34, w * (0.5 + i * 0.28), Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
      }
      g.restore();
      break;
    }
    case "hornsteel": {
      // oversized pneumatic ramming horn
      const chrome = g.createLinearGradient(0, top + h * 0.3, w * 0.9, top - h * 0.3);
      chrome.addColorStop(0, "#4f5866");
      chrome.addColorStop(0.45, "#eef3f8");
      chrome.addColorStop(1, "#79828f");
      g.fillStyle = chrome;
      ink(g, 6);
      g.beginPath();
      g.moveTo(w * 0.1, top + h * 0.44);
      g.quadraticCurveTo(w * 1.1, top + h * 0.2, w * 1.35, top - h * 0.24);
      g.quadraticCurveTo(w * 0.86, top + h * 0.22, w * 0.42, top + h * 0.56);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = mix(d.shade, "#ffffff", 0.3);
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.ellipse(sx * w * 0.5, top - h * 0.02, w * 0.14, h * 0.1, 0, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      break;
    }
    case "pavise": {
      // wide translucent energy shield carried in front
      g.save();
      g.translate(w * 0.86, top + h * 0.62);
      const en = g.createLinearGradient(-w * 0.2, -h * 0.6, w * 0.3, h * 0.5);
      en.addColorStop(0, "rgba(150,215,255,0.9)");
      en.addColorStop(0.5, "rgba(70,150,235,0.6)");
      en.addColorStop(1, "rgba(140,205,255,0.85)");
      g.fillStyle = en;
      ink(g, 5.5);
      g.beginPath();
      g.moveTo(-w * 0.1, -h * 0.72);
      g.quadraticCurveTo(w * 0.42, -h * 0.5, w * 0.44, 0);
      g.quadraticCurveTo(w * 0.42, h * 0.5, -w * 0.1, h * 0.66);
      g.closePath();
      g.fill();
      g.stroke();
      g.save();
      g.globalAlpha = 0.55;
      g.strokeStyle = "#eaf7ff";
      g.lineWidth = 2.6;
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(w * 0.04, i * h * 0.3);
        g.lineTo(w * 0.34, i * h * 0.26);
        g.stroke();
      }
      g.restore();
      g.restore();
      break;
    }
    default:
      break;
  }
}

function drawWings(g: CanvasRenderingContext2D, d: CritterDesign, w: number, h: number, flap: number) {
  ink(g, 5);
  for (const sx of [-1, 1]) {
    g.save();
    g.translate(sx * w * 0.5, -h * 0.68);
    g.rotate(sx * (0.2 + flap * 0.22));
    const grad = g.createLinearGradient(0, 0, sx * w * 0.9, -h * 0.3);
    grad.addColorStop(0, mix(d.shade, "#000000", 0.2));
    grad.addColorStop(1, mix(d.shade, "#ffffff", 0.15));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(sx * w * 0.5, -h * 0.52, sx * w * 0.94, -h * 0.3);
    g.quadraticCurveTo(sx * w * 0.7, -h * 0.24, sx * w * 0.78, -h * 0.02);
    g.quadraticCurveTo(sx * w * 0.5, -h * 0.1, sx * w * 0.36, h * 0.1);
    g.quadraticCurveTo(sx * w * 0.2, -h * 0.02, 0, 0);
    g.closePath();
    g.fill();
    g.stroke();
    g.save();
    g.globalAlpha = 0.4;
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(sx * w * 0.72, -h * 0.26);
    g.moveTo(0, 0);
    g.lineTo(sx * w * 0.62, -h * 0.04);
    g.stroke();
    g.restore();
    g.restore();
  }
}

function drawFace(g: CanvasRenderingContext2D, d: CritterDesign, w: number, h: number, blink: number) {
  const cy = -h * 0.6;
  // hostile roster gets predatory glowing optics instead of big cartoon eyes
  const hostile = d.key.startsWith("e_");
  const r = w * (d.eyes === 1 ? 0.27 : d.eyes === 3 ? 0.15 : 0.19) * (hostile ? 0.74 : 1);
  const xs =
    d.eyes === 0 ? [] : d.eyes === 1 ? [0] : d.eyes === 2 ? [-w * 0.24, w * 0.24] : [-w * 0.34, 0, w * 0.34];

  // eye sockets: a soft darker pool behind each eye grounds them in the body
  g.save();
  g.globalAlpha = hostile ? 0.5 : 0.22;
  g.fillStyle = mix(d.shade, "#000000", hostile ? 0.75 : 0.4);
  for (const x of xs) {
    g.beginPath();
    g.ellipse(x, cy + r * 0.1, r * (hostile ? 1.7 : 1.28), r * (hostile ? 1.5 : 1.2), 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  if (hostile) {
    for (const x of xs) {
      const open = 1 - blink * 0.85;
      const sx = x === 0 ? 0 : Math.sign(x);
      // angular slit optic: wedge shaped, tilted inward like a hunting insect
      g.save();
      g.beginPath();
      g.moveTo(x - r * 1.15, cy - r * 0.5 * open);
      g.lineTo(x + r * 1.15, cy - r * 0.95 * open + sx * r * 0.3 * open);
      g.lineTo(x + r * 0.95, cy + r * 0.8 * open);
      g.lineTo(x - r * 0.9, cy + r * 0.45 * open);
      g.closePath();
      g.fillStyle = mix(OUTLINE, "#000000", 0.4);
      g.fill();
      ink(g, 3.6);
      g.stroke();
      if (blink < 0.55) {
        g.clip();
        // emissive core burning inside the socket
        g.globalCompositeOperation = "lighter";
        const grad = g.createRadialGradient(x, cy, 0, x, cy, r * 1.4);
        grad.addColorStop(0, d.eye);
        grad.addColorStop(0.5, mix(d.eye, "#000000", 0.45));
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grad;
        g.fillRect(x - r * 1.6, cy - r * 1.6, r * 3.2, r * 3.2);
        g.fillStyle = d.eye;
        g.beginPath();
        g.ellipse(x, cy, r * 0.28, r * 0.72 * open, sx * 0.22, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
  } else
  for (const x of xs) {
    const open = 1 - blink * 0.9;
    g.beginPath();
    g.ellipse(x, cy, r, r * open, 0, 0, Math.PI * 2);
    g.fillStyle = "#fdfbff";
    g.fill();
    ink(g, 4.5);
    g.stroke();
    if (blink < 0.55) {
      // iris + slit pupil + two glints = the expressive part of the face
      g.save();
      g.beginPath();
      g.ellipse(x, cy, r, r * open, 0, 0, Math.PI * 2);
      g.clip();
      g.beginPath();
      g.arc(x + r * 0.14, cy + r * 0.12, r * 0.6, 0, Math.PI * 2);
      g.fillStyle = d.eye;
      g.fill();
      g.beginPath();
      g.ellipse(x + r * 0.14, cy + r * 0.12, r * 0.24, r * 0.42, 0, 0, Math.PI * 2);
      g.fillStyle = OUTLINE;
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.95)";
      g.beginPath();
      g.arc(x - r * 0.24, cy - r * 0.3, r * 0.22, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 0.6;
      g.beginPath();
      g.arc(x + r * 0.36, cy + r * 0.38, r * 0.11, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }


  // brows do most of the personality work
  if (d.brow && d.brow !== "none") {
    ink(g, r * 0.44);
    const lift = cy - r * 1.3;
    for (const x of xs) {
      const sx = x === 0 ? 1 : Math.sign(x);
      const drop = d.brow === "flat" ? 0 : r * 0.42 * (d.brow === "angry" ? 1 : -1);
      g.beginPath();
      g.moveTo(x - sx * r * 0.95, lift - drop);
      g.lineTo(x + sx * r * 0.95, lift + drop);
      g.stroke();
    }
  }

  const my = -h * 0.42;
  ink(g, 4.5);
  switch (d.mouth) {
    case "fangs": {
      // a small snarling mouth with two upper fangs
      g.beginPath();
      g.moveTo(-w * 0.26, my - h * 0.02);
      g.quadraticCurveTo(0, my + h * 0.1, w * 0.26, my - h * 0.02);
      g.quadraticCurveTo(0, my + h * 0.02, -w * 0.26, my - h * 0.02);
      g.closePath();
      g.fillStyle = "#2a0f1c";
      g.fill();
      g.stroke();
      g.save();
      g.beginPath();
      g.moveTo(-w * 0.26, my - h * 0.02);
      g.quadraticCurveTo(0, my + h * 0.1, w * 0.26, my - h * 0.02);
      g.quadraticCurveTo(0, my + h * 0.02, -w * 0.26, my - h * 0.02);
      g.closePath();
      g.clip();
      g.fillStyle = TOOTH;
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(sx * w * 0.19, my - h * 0.04);
        g.lineTo(sx * w * 0.12, my + h * 0.08);
        g.lineTo(sx * w * 0.06, my - h * 0.04);
        g.closePath();
        g.fill();
      }
      g.restore();
      break;
    }
    case "grin": {
      g.beginPath();
      g.moveTo(-w * 0.26, my - h * 0.03);
      g.quadraticCurveTo(0, my + h * 0.14, w * 0.26, my - h * 0.03);
      g.closePath();
      g.fillStyle = "#2a1020";
      g.fill();
      g.stroke();
      g.save();
      g.beginPath();
      g.moveTo(-w * 0.26, my - h * 0.03);
      g.quadraticCurveTo(0, my + h * 0.14, w * 0.26, my - h * 0.03);
      g.closePath();
      g.clip();
      g.fillStyle = TOOTH;
      for (let i = -3; i <= 3; i++) {
        g.beginPath();
        g.moveTo(i * w * 0.08 - w * 0.04, my - h * 0.04);
        g.lineTo(i * w * 0.08, my + h * 0.04);
        g.lineTo(i * w * 0.08 + w * 0.04, my - h * 0.04);
        g.closePath();
        g.fill();
      }
      g.restore();
      break;
    }
    case "smile":
      g.beginPath();
      g.moveTo(-w * 0.16, my - h * 0.02);
      g.quadraticCurveTo(0, my + h * 0.07, w * 0.16, my - h * 0.02);
      g.stroke();
      break;
    case "maw": {
      g.beginPath();
      g.ellipse(0, my + h * 0.04, w * 0.3, h * 0.13, 0, 0, Math.PI * 2);
      g.fillStyle = "#2a0f1c";
      g.fill();
      g.stroke();
      g.save();
      g.beginPath();
      g.ellipse(0, my + h * 0.04, w * 0.3, h * 0.13, 0, 0, Math.PI * 2);
      g.clip();
      // tongue
      g.fillStyle = "#c8456b";
      g.beginPath();
      g.ellipse(0, my + h * 0.15, w * 0.18, h * 0.08, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = TOOTH;
      for (let i = -3; i <= 3; i++) {
        g.beginPath();
        g.moveTo(i * w * 0.1 - w * 0.05, my - h * 0.1);
        g.lineTo(i * w * 0.1, my + h * 0.03);
        g.lineTo(i * w * 0.1 + w * 0.05, my - h * 0.1);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(i * w * 0.1 - w * 0.05, my + h * 0.19);
        g.lineTo(i * w * 0.1, my + h * 0.08);
        g.lineTo(i * w * 0.1 + w * 0.05, my + h * 0.19);
        g.closePath();
        g.fill();
      }
      g.restore();
      break;
    }
    default:
      break;
  }
}

/** skittering multi-leg rig: thin razor legs paddling out of phase */
function drawManyLegs(g: CanvasRenderingContext2D, d: CritterDesign, w: number, h: number, step: number) {
  g.lineCap = "round";
  const pairs = 3;
  for (const sx of [-1, 1]) {
    for (let i = 0; i < pairs; i++) {
      const phase = step * 1.6 + i * 1.1 + (sx > 0 ? Math.PI * 0.5 : 0);
      const swing = Math.sin(phase);
      const hipX = sx * w * (0.16 + i * 0.26);
      const hipY = -h * (0.3 - i * 0.03);
      const kneeX = hipX + sx * w * 0.3;
      const kneeY = hipY - h * 0.1 + swing * h * 0.05;
      const footX = hipX + sx * w * (0.34 + swing * 0.16);
      const footY = -Math.max(0, swing) * h * 0.05;
      for (const [col, lw] of [[OUTLINE, 8], [limbTone(d), 4]] as [string, number][]) {
        g.strokeStyle = col;
        g.lineWidth = lw;
        g.beginPath();
        g.moveTo(hipX, hipY);
        g.quadraticCurveTo(kneeX, kneeY, footX, footY);
        g.stroke();
      }
      // razor tip
      g.fillStyle = TOOTH;
      g.beginPath();
      g.moveTo(footX - sx * w * 0.02, footY - h * 0.02);
      g.lineTo(footX + sx * w * 0.1, footY + h * 0.005);
      g.lineTo(footX - sx * w * 0.02, footY + h * 0.02);
      g.closePath();
      g.fill();
    }
  }
}

function drawLegs(g: CanvasRenderingContext2D, d: CritterDesign, w: number, h: number, step: number) {
  if (d.legs === "none") return;
  if (d.legs === "many") return drawManyLegs(g, d, w, h, step);
  g.lineCap = "round";
  for (const sx of [-1, 1]) {
    const phase = step + (sx > 0 ? Math.PI : 0);
    // Short, close steps like the reference characters: the feet trade weight
    // without crossing the body or pulling the torso into a strut.
    const stride = Math.sin(phase);
    const footY = -Math.max(0, stride) * h * 0.012;
    const footX = sx * w * 0.28 + stride * w * 0.055;
    g.strokeStyle = OUTLINE;
    g.lineWidth = 11;
    g.beginPath();
    g.moveTo(sx * w * 0.26, -h * 0.16);
    g.quadraticCurveTo(sx * w * 0.3, -h * 0.08, footX, footY);
    g.stroke();
    g.strokeStyle = limbTone(d);
    g.lineWidth = 6.5;
    g.beginPath();
    g.moveTo(sx * w * 0.26, -h * 0.16);
    g.quadraticCurveTo(sx * w * 0.3, -h * 0.08, footX, footY);
    g.stroke();
    // foot
    g.fillStyle = limbTone(d);
    ink(g, 4);
    g.beginPath();
    g.ellipse(footX + sx * w * 0.03, footY, w * 0.14, h * 0.05, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    if (d.claws) {
      g.fillStyle = TOOTH;
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(footX + sx * w * 0.1 + i * w * 0.035, footY - h * 0.012);
        g.lineTo(footX + sx * w * 0.17 + i * w * 0.035, footY - h * 0.005);
        g.lineTo(footX + sx * w * 0.1 + i * w * 0.035, footY + h * 0.022);
        g.closePath();
        g.fill();
      }
    }
  }
}

function drawArms(g: CanvasRenderingContext2D, d: CritterDesign, w: number, h: number, step: number) {
  if (!d.arms) return;
  for (const sx of [-1, 1]) {
    const swing = Math.sin(step + (sx > 0 ? 0 : Math.PI)) * h * 0.025;
    const hx = sx * w * 0.72;
    const hy = -h * 0.32 + swing;
    g.strokeStyle = OUTLINE;
    g.lineWidth = 10.5;
    g.beginPath();
    g.moveTo(sx * w * 0.52, -h * 0.56);
    g.quadraticCurveTo(sx * w * 0.8, -h * 0.46 + swing, hx, hy);
    g.stroke();
    g.strokeStyle = limbTone(d);
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(sx * w * 0.52, -h * 0.56);
    g.quadraticCurveTo(sx * w * 0.8, -h * 0.46 + swing, hx, hy);
    g.stroke();
    // fist
    g.fillStyle = mix(d.body, "#000000", 0.15);
    ink(g, 4);
    g.beginPath();
    g.arc(hx, hy, w * 0.1, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    if (d.claws) {
      g.fillStyle = TOOTH;
      for (let i = -1; i <= 1; i++) {
        const a = Math.PI * 0.5 + i * 0.42;
        g.beginPath();
        g.moveTo(hx + Math.cos(a) * w * 0.07, hy + Math.sin(a) * w * 0.07);
        g.lineTo(hx + Math.cos(a) * w * 0.19, hy + Math.sin(a) * w * 0.19);
        g.lineTo(hx + Math.cos(a + 0.3) * w * 0.08, hy + Math.sin(a + 0.3) * w * 0.08);
        g.closePath();
        g.fill();
      }
    }
  }
}

function drawTail(g: CanvasRenderingContext2D, d: CritterDesign, w: number, h: number, step: number) {
  if (!d.tail) return;
  const sway = Math.sin(step) * h * 0.08;
  g.strokeStyle = OUTLINE;
  g.lineWidth = 12;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(-w * 0.6, -h * 0.24);
  g.quadraticCurveTo(-w * 1.3, -h * 0.24 + sway, -w * 1.16, -h * 0.66 + sway);
  g.stroke();
  g.strokeStyle = limbTone(d);
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(-w * 0.6, -h * 0.24);
  g.quadraticCurveTo(-w * 1.3, -h * 0.24 + sway, -w * 1.16, -h * 0.66 + sway);
  g.stroke();
  // spade tip
  g.fillStyle = mix(d.shade, "#ffffff", 0.2);
  ink(g, 4.5);
  g.beginPath();
  g.moveTo(-w * 1.16, -h * 0.86 + sway);
  g.lineTo(-w * 0.98, -h * 0.62 + sway);
  g.lineTo(-w * 1.34, -h * 0.62 + sway);
  g.closePath();
  g.fill();
  g.stroke();
}

function drawCritter(
  g: CanvasRenderingContext2D,
  d: CritterDesign,
  opts: { squash: number; step: number; lift: number; lean: number; blink: number },
) {
  const bulk = 0.86 + d.size * 0.16;
  const w = FRAME * 0.3 * bulk;
  const h = FRAME * 0.62 * (0.92 + d.size * 0.06);

  // ground shadow stays put while the body hops
  g.save();
  g.globalAlpha = 0.3;
  g.fillStyle = "#000";
  g.beginPath();
  g.ellipse(0, 2, w * 0.72 - opts.lift * 0.2, h * 0.07, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();

  if (d.glow) {
    g.save();
    g.globalCompositeOperation = "lighter";
    const halo = g.createRadialGradient(0, -h * 0.5, 0, 0, -h * 0.5, h * 0.9);
    halo.addColorStop(0, d.glow);
    halo.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = halo;
    g.fillRect(-h, -h * 1.5, h * 2, h * 2);
    g.restore();
  }

  g.save();
  g.translate(0, -opts.lift);
  g.rotate(opts.lean);

  drawTail(g, d, w, h, opts.step);
  if (d.wings) drawWings(g, d, w, h, Math.sin(opts.step));
  drawLegs(g, d, w, h, opts.step);

  // ---- body: flat base, cel shadow, rim light, pattern, outline
  bodyPath(g, d, w, h, opts.squash);
  g.save();
  g.fillStyle = d.body;
  g.fill();
  g.clip();

  // cel shadow on the lower-right third
  g.fillStyle = d.shade;
  g.globalAlpha = 0.85;
  g.beginPath();
  g.ellipse(w * 1.32, -h * 0.3, w * 0.95, h * 0.78, -0.28, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 0.5;
  g.beginPath();
  g.ellipse(0, h * 0.16, w * 1.1, h * 0.26, 0, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;

  drawPattern(g, d, w, h);

  // top-left rim light (kept dry: a waxy highlight makes creatures read as fruit)
  const gloss = d.key.startsWith("e_") ? 0.4 : 1;
  g.globalAlpha = 0.14 * gloss;
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.ellipse(-w * 0.46, -h * 0.82, w * 0.36, h * 0.12, -0.6, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 0.08 * gloss;
  g.beginPath();
  g.ellipse(-w * 0.72, -h * 0.45, w * 0.12, h * 0.26, 0.1, 0, Math.PI * 2);
  g.fill();

  g.restore();

  // unstable inner core: a pulsing emissive heart inside translucent hulls
  if (d.core) {
    g.save();
    bodyPath(g, d, w, h, opts.squash);
    g.clip();
    g.globalCompositeOperation = "lighter";
    const pulse = 0.72 + Math.sin(opts.step * 2) * 0.28;
    const core = g.createRadialGradient(0, -h * 0.5, 0, 0, -h * 0.5, w * 0.95 * pulse);
    core.addColorStop(0, d.core);
    core.addColorStop(0.45, mix(d.core, "#000000", 0.45));
    core.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = core;
    g.fillRect(-w * 2, -h * 1.6, w * 4, h * 2);
    g.restore();
  }

  bodyPath(g, d, w, h, opts.squash);
  ink(g, 6.5);
  g.stroke();

  // neon rim: trace the silhouette in glowing light
  if (d.neon) {
    g.save();
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.55 + Math.sin(opts.step * 1.5) * 0.15;
    g.strokeStyle = d.neon;
    g.lineWidth = 2.6;
    bodyPath(g, d, w, h, opts.squash);
    g.stroke();
    g.restore();
  }

  drawCrown(g, d, w, h);
  drawArms(g, d, w, h, opts.step);
  drawFace(g, d, w, h, opts.blink);
  g.restore();
}

/* --------------------------------- strips ---------------------------------- */

function makeStrip(d: CritterDesign, anim: "idle" | "walk" | "death"): HTMLCanvasElement {
  const frames = anim === "idle" ? IDLE_FRAMES : anim === "walk" ? WALK_FRAMES : DEATH_FRAMES;
  const c = document.createElement("canvas");
  c.width = FRAME * frames;
  c.height = FRAME;
  const g = c.getContext("2d")!;
  g.lineJoin = "round";

  for (let i = 0; i < frames; i++) {
    const t = i / frames;
    g.save();
    g.translate(FRAME * i + FRAME / 2, FRAME - 12);
    if (anim === "idle") {
      const p = Math.sin(t * Math.PI * 2);
      drawCritter(g, d, {
        squash: 1 + p * 0.05,
        step: t * Math.PI * 2,
        lift: Math.max(0, p) * 4,
        lean: p * 0.03,
        blink: i === frames - 1 ? 1 : 0,
      });
    } else if (anim === "walk") {
      // Keep the round torso level and let the tiny alternating feet sell the
      // motion. The reference characters do not roll their shoulders or hips.
      drawCritter(g, d, {
        squash: 1,
        step: t * Math.PI * 2,
        lift: 0,
        lean: 0,
        blink: 0,
      });
    } else {
      const k = i / (frames - 1);
      g.globalAlpha = Math.max(0, 1 - k * 1.05);
      g.rotate(k * 1.15);
      drawCritter(g, d, {
        squash: 1 - k * 0.55,
        step: k * 6,
        lift: Math.sin(k * Math.PI) * 12,
        lean: 0,
        blink: k > 0.25 ? 1 : 0,
      });
    }
    g.restore();
  }
  return c;
}

const urlCache = new Map<string, [string, string, string]>();

/** [idle, walk, death] data URLs for a design — generated once per session. */
export function critterSrc(d: CritterDesign): [string, string, string] {
  const hit = urlCache.get(d.key);
  if (hit) return hit;
  if (typeof document === "undefined") {
    const empty: [string, string, string] = ["", "", ""];
    return empty;
  }
  const out: [string, string, string] = [
    makeStrip(d, "idle").toDataURL(),
    makeStrip(d, "walk").toDataURL(),
    makeStrip(d, "death").toDataURL(),
  ];
  urlCache.set(d.key, out);
  return out;
}

export const CRITTER_MAP: Record<string, CritterDesign> = Object.fromEntries(
  [...CRITTER_ENEMIES, ...CRITTER_HEROES].map((d) => [d.key, d]),
);
