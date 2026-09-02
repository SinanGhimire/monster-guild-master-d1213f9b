import { breedName, rollBreed } from "./breeds";
import type { ActorKey, AnimKey, Sprites, Strip } from "./assets";
import { PACK_KEYS } from "./assets";
import { firstFrame, visibleFrame } from "./sprite-frame";
import { baseMods } from "./types";
import { applyUpgrade, rollUpgrades, xpForLevel, RARITY_COLOR, UPGRADE_MAP } from "./upgrades";
import { CRITTER_KEYS, CRITTER_STATS, CRITTER_TIER } from "./critter-species";
import { AI_ROLE } from "./ai";
import { CLASSES, classForSkin, type ClassKey } from "./classes";
import { CLASS_DESIGNS, classArtKey } from "./class-critters";
import type {
  Bullet,
  Mods,
  CharacterKey,
  Decor,
  Echo,
  Enemy,
  GameState,
  Pickup,
  PickupKind,
  Species,
  FloorTheme,
  Turret,
  Weapon,
  WeaponKey,
  BulletVisual,
  RunMode,
  Vec,
} from "./types";

/**
 * Logical viewport size. Mutable so the canvas can match the device screen
 * (phone landscape is much wider than 16:9) instead of being letterboxed.
 */
export let WORLD_W = 1280;
export let WORLD_H = 720;

/** Resize the logical viewport; call on mount and on every screen resize. */
export function setViewport(w: number, h: number) {
  WORLD_W = Math.round(w);
  WORLD_H = Math.round(h);
}

/** Brotato pacing: short early waves that stretch out as the run deepens. */
export function waveLength(wave: number) {
  // Wave 1 is very short so the player sees the shop fast; waves ramp up after.
  if (wave <= 1) return 8;
  return Math.min(75, 20 + (wave - 1) * 3);
}



const WAVE_LENGTH = 8; // seconds (wave 1 — keep in sync with waveLength(1))
const ECHO_INTERVAL = 30; // seconds
const MAX_ECHOES = 3;
const RECORD_STEP = 1 / 30;
/** distance from the actor's gun anchor to the barrel tip (matches drawGun) */
const MUZZLE_DISTANCE = 64;
/**
 * Height of the shooting hands above an actor's feet. Actor sprites are drawn
 * bottom-anchored at 132px tall, so the grip sits a little above mid-chest.
 * Rendering AND bullet spawning both use this so shots leave the barrel.
 */
export const GUN_Y = 58;

/* ---- aim assist balance knobs ---- */
/** how far the auto-targeting can reach (world px) */
const AUTO_RANGE = 360;
/** turret swing speed of the auto-aim, rad/s */
const AIM_TURN_SPEED = 4.4;
/** auto-fire is slower than firing yourself */
const AUTO_RATE_PENALTY = 1.45;
/** damage bonus for aiming and firing manually */
const FOCUS_DAMAGE_BONUS = 1.35;


export interface Input {
  keys: Set<string>;
  mouse: { x: number; y: number };
  firing: boolean;
  /** left stick / analog move vector (-1..1) */
  moveX?: number;
  moveY?: number;
  /** right stick aim vector (-1..1); firing while held */
  aimX?: number;
  aimY?: number;
  /** touch play: lock the nearest zombie and fire automatically */
  autoAim?: boolean;
}

/* ---------------------------------- weapons --------------------------------- */

const BASE_WEAPONS: Record<string, Weapon> = {
  pistol: {
    key: "pistol",
    name: "Sidearm",
    color: "#5ec8ff",
    color2: "#b0e8ff",
    sprite: "fp1",
    rate: 0.24,
    damage: 7,
    pellets: 1,
    spread: 0.015,
    speed: 900,
    bulletRadius: 6,
    pierce: 0,    knock: 8,
    shake: 2,
    visual: "tracer",
    rarity: "common",
  },

  rifle: {
    key: "rifle",
    name: "Pulse Rifle",
    color: "#7bf2a8",
    color2: "#c0ffd8",
    sprite: "fp35",
    rate: 0.11,
    damage: 3,
    pellets: 1,
    spread: 0.045,
    speed: 980,
    bulletRadius: 5,
    pierce: 1,    knock: 5,
    shake: 2.5,
    visual: "tracer",
    rarity: "common",
  },

  shotgun: {
    key: "shotgun",
    name: "Scrap Shotgun",
    color: "#ffa34d",
    color2: "#ffe0a0",
    sprite: "fp23",
    rate: 0.62,
    damage: 2.6,
    pellets: 7,
    spread: 0.3,
    speed: 760,
    bulletRadius: 5,
    pierce: 0,    knock: 16,
    shake: 8,
    visual: "bolt",
    rarity: "uncommon",
  },

  minigun: {
    key: "minigun",
    name: "Hex Minigun",
    color: "#ff6ad5",
    color2: "#ffb8ec",
    sprite: "fp44",
    rate: 0.055,
    damage: 1.7,
    pellets: 1,
    spread: 0.13,
    speed: 900,
    bulletRadius: 4,
    pierce: 0,    knock: 3,
    shake: 2,
    visual: "tracer",
    rarity: "uncommon",
  },

  smg: {
    key: "smg",
    name: "Wasp SMG",
    color: "#ffe066",
    color2: "#fff4c0",
    sprite: "fp15",
    rate: 0.075,
    damage: 2.4,
    pellets: 1,
    spread: 0.09,
    speed: 940,
    bulletRadius: 4,
    pierce: 0,    knock: 4,
    shake: 2,
    visual: "tracer",
    rarity: "common",
  },

  sniper: {
    key: "sniper",
    name: "Void Lance",
    color: "#b98bff",
    color2: "#e0c8ff",
    sprite: "fp24",
    rate: 0.95,
    damage: 34,
    pellets: 1,
    spread: 0.004,
    speed: 1700,
    bulletRadius: 7,
    pierce: 4,    knock: 22,
    shake: 9,
    visual: "beam",
    rarity: "epic",
  },

  flak: {
    key: "flak",
    name: "Flak Cannon",
    color: "#ff7b4d",
    color2: "#ffd0b0",
    sprite: "fp41",
    rate: 0.8,
    damage: 3.4,
    pellets: 11,
    spread: 0.52,
    speed: 700,
    bulletRadius: 6,
    pierce: 1,    knock: 20,
    shake: 11,
    visual: "bolt",
    rarity: "rare",
  },

  plasma: {
    key: "plasma",
    name: "Plasma Coil",
    color: "#4dffd0",
    color2: "#b0ffee",
    sprite: "fp33",
    rate: 0.34,
    damage: 12,
    pellets: 1,
    spread: 0.02,
    speed: 620,
    bulletRadius: 12,
    pierce: 3,    knock: 14,
    shake: 5,
    visual: "orb",
    rarity: "epic",
  },

  rocket: {
    key: "rocket",
    name: "Hellfire Launcher",
    color: "#ff4444",
    color2: "#ffaa44",
    sprite: "fp38",
    rate: 0.9,
    damage: 22,
    pellets: 1,
    spread: 0.03,
    speed: 520,
    bulletRadius: 14,
    pierce: 0,    knock: 28,
    shake: 14,
    visual: "orb",
    rarity: "legendary",
  },

  laser: {
    key: "laser",
    name: "Neon Deathray",
    color: "#ff3dff",
    color2: "#ff9dff",
    sprite: "fp32",
    rate: 0.16,
    damage: 4,
    pellets: 1,
    spread: 0.008,
    speed: 1800,
    bulletRadius: 3,
    pierce: 6,    knock: 2,
    shake: 1.5,
    visual: "beam",
    rarity: "rare",
  },

  crossbow: {
    key: "crossbow",
    name: "Bone Bolt",
    color: "#e8e0d0",
    color2: "#ffffff",
    sprite: "fp40",
    rate: 0.5,
    damage: 18,
    pellets: 1,
    spread: 0.002,
    speed: 1400,
    bulletRadius: 4,
    pierce: 3,    knock: 18,
    shake: 6,
    visual: "arrow",
    rarity: "epic",
  },

  chain: {
    key: "chain",
    name: "Storm Coil",
    color: "#33ccff",
    color2: "#99eeff",
    sprite: "fp16",
    rate: 0.14,
    damage: 5,
    pellets: 1,
    spread: 0.025,
    speed: 1100,
    bulletRadius: 5,
    pierce: 2,
    knock: 6,
    shake: 3,
    visual: "ring",
    rarity: "legendary",
  },

  revolver: {
    key: "revolver",
    name: "Ironjaw Revolver",
    color: "#ffb347",
    color2: "#ffe6b0",
    sprite: "fp20",
    rate: 0.42,
    damage: 16,
    pellets: 1,
    spread: 0.01,
    speed: 1250,
    bulletRadius: 6,
    pierce: 1,
    knock: 20,
    shake: 6,
    visual: "tracer",
    rarity: "uncommon",
  },

  carbine: {
    key: "carbine",
    name: "Vector Carbine",
    color: "#8ef0ff",
    color2: "#d6fbff",
    sprite: "fp34",
    rate: 0.09,
    damage: 3.6,
    pellets: 1,
    spread: 0.035,
    speed: 1150,
    bulletRadius: 5,
    pierce: 1,
    knock: 6,
    shake: 2.5,
    visual: "tracer",
    rarity: "rare",
  },

  autoshotgun: {
    key: "autoshotgun",
    name: "Breaker Auto-12",
    color: "#ff8a5c",
    color2: "#ffd8bf",
    sprite: "fp39",
    rate: 0.34,
    damage: 2.2,
    pellets: 6,
    spread: 0.26,
    speed: 820,
    bulletRadius: 5,
    pierce: 0,
    knock: 12,
    shake: 6,
    visual: "bolt",
    rarity: "rare",
  },

  grenadier: {
    key: "grenadier",
    name: "Thumper Grenadier",
    color: "#ffd447",
    color2: "#fff0a8",
    sprite: "fp13",
    rate: 1.05,
    damage: 26,
    pellets: 1,
    spread: 0.02,
    speed: 560,
    bulletRadius: 13,
    pierce: 0,
    knock: 30,
    shake: 13,
    visual: "orb",
    rarity: "epic",
  },

  railgun: {
    key: "railgun",
    name: "Halo Railgun",
    color: "#9ad7ff",
    color2: "#eaf7ff",
    sprite: "fp30",
    rate: 1.25,
    damage: 52,
    pellets: 1,
    spread: 0.001,
    speed: 2200,
    bulletRadius: 6,
    pierce: 8,
    knock: 26,
    shake: 12,
    visual: "beam",
    rarity: "legendary",
  },

  vulcan: {
    key: "vulcan",
    name: "Vulcan Repeater",
    color: "#ff5f7e",
    color2: "#ffc2ce",
    sprite: "fp28",
    rate: 0.045,
    damage: 1.9,
    pellets: 1,
    spread: 0.11,
    speed: 1000,
    bulletRadius: 4,
    pierce: 0,
    knock: 3,
    shake: 2,
    visual: "tracer",
    rarity: "epic",
  },

  /* ------------------------- art-pack weapons ------------------------- */
  scrapper: {
    key: "scrapper", name: "Scrapper", color: "#c9d6e2", color2: "#f0f6ff", sprite: "fp3",
    rate: 0.3, damage: 8, pellets: 1, spread: 0.02, speed: 920, bulletRadius: 5,
    pierce: 0, knock: 9, shake: 2.5, visual: "tracer", rarity: "common",
  },
  hornet: {
    key: "hornet", name: "Hornet PDW", color: "#ffe066", color2: "#fff6c8", sprite: "fp7",
    rate: 0.07, damage: 2.2, pellets: 1, spread: 0.1, speed: 980, bulletRadius: 4,
    pierce: 0, knock: 3, shake: 2, visual: "tracer", rarity: "common",
  },
  bulldog: {
    key: "bulldog", name: "Bulldog", color: "#ff9a5c", color2: "#ffdcc0", sprite: "fp12",
    rate: 0.55, damage: 3.1, pellets: 6, spread: 0.28, speed: 780, bulletRadius: 5,
    pierce: 0, knock: 15, shake: 7, visual: "bolt", rarity: "uncommon",
  },
  ripper: {
    key: "ripper", name: "Ripper", color: "#ff5f7e", color2: "#ffc6d2", sprite: "fp18",
    rate: 0.06, damage: 2.1, pellets: 1, spread: 0.12, speed: 1020, bulletRadius: 4,
    pierce: 0, knock: 4, shake: 2, visual: "tracer", rarity: "uncommon",
  },
  warden: {
    key: "warden", name: "Warden", color: "#8ef0ff", color2: "#dcfbff", sprite: "fp22",
    rate: 0.13, damage: 4.2, pellets: 1, spread: 0.04, speed: 1120, bulletRadius: 5,
    pierce: 1, knock: 6, shake: 2.5, visual: "tracer", rarity: "rare",
  },
  spitfire: {
    key: "spitfire", name: "Spitfire", color: "#ffb347", color2: "#ffe7bb", sprite: "fp27",
    rate: 0.05, damage: 1.8, pellets: 1, spread: 0.14, speed: 960, bulletRadius: 4,
    pierce: 0, knock: 3, shake: 2, visual: "tracer", rarity: "rare",
  },
  marauder: {
    key: "marauder", name: "Marauder", color: "#b98bff", color2: "#e6d4ff", sprite: "fp31",
    rate: 0.7, damage: 26, pellets: 1, spread: 0.006, speed: 1500, bulletRadius: 6,
    pierce: 3, knock: 20, shake: 8, visual: "beam", rarity: "epic",
  },
  tempest: {
    key: "tempest", name: "Tempest", color: "#4dffd0", color2: "#c4fff0", sprite: "fp36",
    rate: 0.3, damage: 11, pellets: 1, spread: 0.02, speed: 660, bulletRadius: 11,
    pierce: 2, knock: 13, shake: 5, visual: "orb", rarity: "epic",
  },
  reaper: {
    key: "reaper", name: "Reaper", color: "#ff3d6e", color2: "#ffb3c6", sprite: "fp42",
    rate: 0.85, damage: 30, pellets: 1, spread: 0.01, speed: 1350, bulletRadius: 7,
    pierce: 2, knock: 24, shake: 10, visual: "beam", rarity: "legendary",
  },
  havoc: {
    key: "havoc", name: "Havoc", color: "#ff7043", color2: "#ffcbb2", sprite: "fp43",
    rate: 0.95, damage: 24, pellets: 1, spread: 0.03, speed: 540, bulletRadius: 13,
    pierce: 0, knock: 28, shake: 13, visual: "orb", rarity: "legendary",
  },
  vanguard: {
    key: "vanguard", name: "Vanguard AR", color: "#7bf2a8", color2: "#ccffdd", sprite: "fp11",
    rate: 0.1, damage: 3.4, pellets: 1, spread: 0.04, speed: 1000, bulletRadius: 5,
    pierce: 1, knock: 5, shake: 2.5, visual: "tracer", rarity: "uncommon",
  },
  wraith: {
    key: "wraith", name: "Wraith SMG", color: "#a0c4ff", color2: "#e2eeff", sprite: "fp17",
    rate: 0.065, damage: 2.3, pellets: 1, spread: 0.085, speed: 960, bulletRadius: 4,
    pierce: 0, knock: 4, shake: 2, visual: "tracer", rarity: "common",
  },
  deagle: {
    key: "deagle", name: "Desert Fang", color: "#ffd166", color2: "#fff0c2", sprite: "fp8",
    rate: 0.38, damage: 17, pellets: 1, spread: 0.012, speed: 1300, bulletRadius: 6,
    pierce: 1, knock: 19, shake: 6, visual: "tracer", rarity: "rare",
  },
  m16: {
    key: "m16", name: "M16 Relic", color: "#9adf8f", color2: "#e2ffd9", sprite: "fp29",
    rate: 0.095, damage: 3.5, pellets: 3, spread: 0.05, speed: 1080, bulletRadius: 4,
    pierce: 1, knock: 5, shake: 3, visual: "tracer", rarity: "epic",
  },
  mortar: {
    key: "mortar", name: "Pocket Mortar", color: "#ffb703", color2: "#ffe9a8", sprite: "fp37",
    rate: 1.15, damage: 28, pellets: 1, spread: 0.02, speed: 500, bulletRadius: 14,
    pierce: 0, knock: 30, shake: 14, visual: "orb", rarity: "epic",
  },
  hushpuppy: {
    key: "hushpuppy", name: "Hushpuppy", color: "#bdb2ff", color2: "#e9e4ff", sprite: "fp14",
    rate: 0.08, damage: 2.8, pellets: 1, spread: 0.06, speed: 1000, bulletRadius: 4,
    pierce: 0, knock: 4, shake: 1.8, visual: "tracer", rarity: "uncommon",
  },
  gatling: {
    key: "gatling", name: "Grave Gatling", color: "#ff6ad5", color2: "#ffc7ee", sprite: "fp26",
    rate: 0.04, damage: 1.7, pellets: 1, spread: 0.15, speed: 940, bulletRadius: 4,
    pierce: 0, knock: 3, shake: 2.5, visual: "tracer", rarity: "legendary",
  },
  buzzsaw: {
    key: "buzzsaw", name: "Buzzsaw", color: "#66d9ff", color2: "#d3f4ff", sprite: "fp25",
    rate: 0.055, damage: 2.0, pellets: 1, spread: 0.1, speed: 1000, bulletRadius: 4,
    pierce: 1, knock: 3, shake: 2, visual: "tracer", rarity: "rare",
  },
};

/* ------------------------ procedural pack weapons -------------------------- */
/* Every gun sprite shipped in the art packs becomes a usable weapon. */

const USED_SPRITES = new Set(Object.values(BASE_WEAPONS).map((w) => w.sprite as string));

const PREFIX = [
  "Iron", "Storm", "Crimson", "Vex", "Nova", "Ash", "Rift", "Hex", "Bright", "Grim",
  "Solar", "Void", "Frost", "Ember", "Onyx", "Quick", "Savage", "Echo", "Static", "Dread",
];
const SUFFIX = [
  "Repeater", "Lance", "Fang", "Breaker", "Cutter", "Talon", "Roar", "Spike", "Coil", "Maw",
  "Viper", "Shard", "Pounder", "Sting", "Wailer", "Blaster", "Reaver", "Howl", "Driver", "Kiss",
];
const RARITY_ORDER: Weapon["rarity"][] = ["common", "uncommon", "rare", "epic", "legendary"];
const VISUALS: BulletVisual[] = ["tracer", "bolt", "orb", "beam", "arrow", "ring"];

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makePackWeapon(sprite: string): Weapon {
  const h = hash32(sprite);
  const r = (n: number, mod: number) => Math.floor(h / 7 ** n) % mod;
  const tier = r(1, 100);
  const rarity =
    RARITY_ORDER[tier < 40 ? 0 : tier < 68 ? 1 : tier < 86 ? 2 : tier < 96 ? 3 : 4]!;
  const power = RARITY_ORDER.indexOf(rarity);
  const hue = r(2, 360);
  const name = `${PREFIX[r(3, PREFIX.length)]} ${SUFFIX[r(4, SUFFIX.length)]}`;
  const pellets = 1 + (r(5, 10) > 7 ? 1 + r(6, 4) : 0);

  return {
    key: sprite as WeaponKey,
    name,
    color: `hsl(${hue} 90% 62%)`,
    color2: `hsl(${(hue + 24) % 360} 95% 82%)`,
    sprite,
    rate: 0.09 + r(7, 40) / 100,
    damage: 4 + power * 4 + r(8, 6),
    pellets,
    spread: 0.01 + r(9, 12) / 100,
    speed: 780 + r(2, 400),
    bulletRadius: 4 + r(3, 4),
    pierce: r(4, 3),
    knock: 5 + r(5, 12),
    shake: 2 + power * 1.5,
    visual: VISUALS[r(6, VISUALS.length)]!,
    rarity,
  };
}

const PACK_WEAPONS: Record<string, Weapon> = Object.fromEntries(
  PACK_KEYS.filter((k: string) => !USED_SPRITES.has(k) && !BASE_WEAPONS[k]).map((k: string) => [k, makePackWeapon(k)]),
);

export const WEAPONS = { ...BASE_WEAPONS, ...PACK_WEAPONS } as Record<WeaponKey, Weapon>;

/* ------------------------- class pass: gun tuning -------------------------- */

/** Pick the ammo art that matches a gun's punch and fire rate. */
function bulletArtFor(w: Weapon): string {
  if (w.bulletRadius >= 10 || w.damage >= 24) return "bl_grenade";
  if (w.damage >= 14) return hash32(w.key) % 2 ? "bl_large_bullet" : "bl_large_bullet2";
  if (w.damage >= 6 || w.pellets > 1) {
    return hash32(w.key) % 2 ? "bl_medium_bullet" : "bl_medium_bullet2";
  }
  const small = ["bl_small_bullet", "bl_small_bullet2", "bl_small_bullet3"];
  return small[hash32(w.key) % 3]!;
}

function archetypeFor(w: Weapon): NonNullable<Weapon["archetype"]> {
  if (w.visual === "beam" || w.visual === "orb" || w.visual === "ring") return "energy";
  if (w.bulletRadius >= 10 || w.damage >= 22) return "heavy";
  if (w.pellets >= 4) return "shotgun";
  if (w.damage >= 14 && w.rate >= 0.3) return "sniper";
  if (w.rate <= 0.08) return "smg";
  if (w.rate >= 0.28) return "pistol";
  return "rifle";
}

function finishWeapon(w: Weapon) {
  w.class = "gun";
  w.archetype = archetypeFor(w);
  w.bulletSprite = bulletArtFor(w);
}

for (const w of Object.values(WEAPONS)) finishWeapon(w);

export const GUN_KEYS: WeaponKey[] = Object.keys(WEAPONS) as WeaponKey[];



/* ---------------------------------- shop ---------------------------------- */

/** Coin cost per rarity tier — the between-wave armoury only sells guns. */
export const RARITY_PRICE: Record<Weapon["rarity"], number> = {
  common: 30,
  uncommon: 55,
  rare: 95,
  epic: 150,
  legendary: 240,
};

/** Price scales a little with wave so late-run coins still mean something. */
export function weaponPrice(key: WeaponKey, wave: number): number {
  const w = WEAPONS[key];
  return Math.round(RARITY_PRICE[w.rarity] * (1 + (wave - 1) * 0.06));
}

export function rerollPrice(s: GameState): number {
  return 20 + s.shopRerolls * 15;
}

const SHOP_POOL: WeaponKey[] = Object.keys(WEAPONS) as WeaponKey[];

/** Weighted roll: later waves surface heavier hardware. */
function rollShopOffers(s: GameState, count = 4, only: (k: WeaponKey) => boolean = () => true): WeaponKey[] {
  const weight: Record<Weapon["rarity"], number> = {
    common: Math.max(0.4, 5 - s.wave * 0.25),
    uncommon: 4,
    rare: 1.2 + s.wave * 0.18,
    epic: 0.5 + s.wave * 0.16,
    legendary: 0.15 + s.wave * 0.1,
  };
  const pool = SHOP_POOL.filter((k) => !s.arsenal.includes(k) && only(k));
  const src = pool.length >= count ? pool : SHOP_POOL.filter(only);
  const out: WeaponKey[] = [];
  const bag = src.slice();
  while (out.length < count && bag.length) {
    const total = bag.reduce((n, k) => n + weight[WEAPONS[k].rarity], 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < bag.length; i++) {
      r -= weight[WEAPONS[bag[i]!].rarity];
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    out.push(bag.splice(idx, 1)[0]!);
  }
  return out;
}

/** Stock: five guns every visit. */
function rollSlotOffers(s: GameState): WeaponKey[] {
  return rollShopOffers(s, 5);
}

/** Freeze the fight and open the armoury between waves. */
export function openShop(s: GameState) {
  s.phase = "shop";
  s.shopRerolls = 0;
  s.shopOffers = rollSlotOffers(s);
  s.sfx.push("level");
}

export function rerollShop(s: GameState) {
  const cost = rerollPrice(s);
  if (s.materials < cost) return false;
  s.materials -= cost;
  s.shopRerolls += 1;
  s.shopOffers = rollSlotOffers(s);
  return true;
}

export function buyWeapon(s: GameState, key: WeaponKey) {
  if (s.arsenal.includes(key)) return false;
  const cost = weaponPrice(key, s.wave);
  if (s.materials < cost) return false;
  s.materials -= cost;
  s.arsenal.push(key);
  s.player.weapon = key;
  s.shopOffers = s.shopOffers.filter((k) => k !== key);
  s.sfx.push("pickup");
  return true;
}

export function equipWeapon(s: GameState, key: WeaponKey) {
  if (!s.arsenal.includes(key)) return false;
  s.player.weapon = key;
  return true;
}

/** Leave the armoury and drop straight into the next wave. */
export function closeShop(s: GameState) {
  s.phase = "wave";
  s.shopOffers = [];
  advanceWave(s);
}

/** weapons that can roll out of a loot crate */
const LOOT_WEAPONS: WeaponKey[] = [
  "pistol",
  "rifle",
  "shotgun",
  "minigun",
  "smg",
  "sniper",
  "flak",
  "plasma",
  "rocket",
  "laser",
  "crossbow",
  "chain",
];

/* -------------------------------- characters -------------------------------- */

export const CHARACTERS: Record<
  CharacterKey,
  { name: string; blurb: string; hp: number; speed: number; weapon: WeaponKey; damage: number }
> = {
  spike: {
    name: "Volt",
    blurb: "Balanced all-rounder with the Pulse Rifle.",
    hp: 100,
    speed: 268,
    weapon: "rifle",
    damage: 1,
  },
  punk: {
    name: "Rue",
    blurb: "Fragile speedster spraying the Hex Minigun.",
    hp: 80,
    speed: 312,
    weapon: "minigun",
    damage: 1,
  },
  crown: {
    name: "Regal",
    blurb: "Heavy tank hauling a Scrap Shotgun.",
    hp: 135,
    speed: 232,
    weapon: "shotgun",
    damage: 1.2,
  },
  bald: {
    name: "Nil",
    blurb: "Marksman — slow shots, heavy damage.",
    hp: 95,
    speed: 276,
    weapon: "pistol",
    damage: 1.6,
  },
  templar: {
    name: "Bone Templar",
    blurb: "Undead bulwark — huge health, steady shotgun.",
    hp: 160,
    speed: 224,
    weapon: "shotgun",
    damage: 1.15,
  },
  reaper: {
    name: "Soul Reaper",
    blurb: "Scythe-fast rifleman that never stops moving.",
    hp: 92,
    speed: 330,
    weapon: "rifle",
    damage: 1.25,
  },
  oracle: {
    name: "Dark Oracle",
    blurb: "Hex caster — minigun spray with cursed rounds.",
    hp: 88,
    speed: 288,
    weapon: "minigun",
    damage: 1.35,
  },
  seraph: {
    name: "Fallen Seraph",
    blurb: "Winged executioner with punishing pistol shots.",
    hp: 105,
    speed: 300,
    weapon: "pistol",
    damage: 1.9,
  },
  warchief: {
    name: "Orc Warchief",
    blurb: "Slow, immovable, shreds anything in front of it.",
    hp: 185,
    speed: 210,
    weapon: "shotgun",
    damage: 1.45,
  },
  sprout: {
    name: "Goblin Sprout",
    blurb: "Tiny, frantic, absurdly fast trigger finger.",
    hp: 68,
    speed: 352,
    weapon: "minigun",
    damage: 0.95,
  },
};

/* --------------------------------- species ---------------------------------- */

interface SpeciesStat {
  sprite: ActorKey;
  radius: number;
  speed: [number, number];
  hp: number;
  score: number;
  height: number;
  color: string;
  tint?: string;
  damage: number;
  minWave: number;
  weight: number;
}

const STATS: Record<Species, SpeciesStat> = {
  ...CRITTER_STATS,
};

// The playable roster deliberately uses the bold, outlined creatures shown in
// the home artwork. The imported pixel-doll horde remains available to the
// collection screen, but no longer mixes visual styles during a run.
const PLAYABLE_SPECIES: Species[] = [...CRITTER_KEYS];

export { STATS as SPECIES_STATS };

/* --------------------------------- helpers ---------------------------------- */

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const tintCache = new Map<string, HTMLCanvasElement>();

/** Crops the transparent padding off a sprite so pack art keeps sane proportions. */
const trimCache = new Map<string, { img: CanvasImageSource; w: number; h: number }>();

function trimmed(img: HTMLImageElement): { img: CanvasImageSource; w: number; h: number } {
  if (!img.width) return { img, w: img.width, h: img.height };
  const hit = trimCache.get(img.src);
  if (hit) return hit;
  const fallback = { img: img as CanvasImageSource, w: img.width, h: img.height };
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return fallback;
  g.drawImage(img, 0, 0);
  let data: ImageData;
  try {
    data = g.getImageData(0, 0, c.width, c.height);
  } catch {
    return fallback;
  }
  let minX = c.width;
  let minY = c.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (data.data[(y * c.width + x) * 4 + 3]! > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return fallback;
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const og = out.getContext("2d");
  if (!og) return fallback;
  og.drawImage(c, minX, minY, w, h, 0, 0, w, h);
  const res = { img: out as CanvasImageSource, w, h };
  trimCache.set(img.src, res);
  return res;
}


function tinted(img: HTMLImageElement, color: string, strength = 0.55): CanvasImageSource {
  if (!img.width) return img;
  const key = `${img.src}|${color}|${strength}`;
  const hit = tintCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  if (!g) return img;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "source-atop";
  g.globalAlpha = strength;
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  tintCache.set(key, c);
  return c;
}

/* ------------------------- procedural arena floor tile ---------------------- */

const floorTiles = new Map<FloorTheme, HTMLCanvasElement>();

interface FloorLook {
  base: [string, string, string];
  plate: string;
  hi: string;
  seam: string;
  grain: string;
  plates: boolean;
  sector: string;
}

const FLOOR_LOOKS: Record<FloorTheme, FloorLook> = {
  tech: {
    base: ["#26303f", "#1f2836", "#19212d"],
    plate: "170,205,245",
    hi: "rgba(210,235,255,0.13)",
    seam: "rgba(120,195,240,0.26)",
    grain: "190,220,255",
    plates: true,
    sector: "rgba(120,210,255,0.14)",
  },
  slab: {
    // cut stone slabs — cool grey granite, no mud
    base: ["#39404e", "#303744", "#282e3a"],
    plate: "206,218,236",
    hi: "rgba(232,240,255,0.14)",
    seam: "rgba(175,200,232,0.28)",
    grain: "214,226,246",
    plates: true,
    sector: "rgba(160,196,236,0.12)",
  },
  moss: {
    // overgrown ruin — damp green stone with lichen
    base: ["#2a3b32", "#23332b", "#1d2b25"],
    plate: "165,220,185",
    hi: "rgba(210,255,228,0.13)",
    seam: "rgba(130,235,180,0.26)",
    grain: "190,240,210",
    plates: true,
    sector: "rgba(120,240,180,0.12)",
  },
  bone: {
    // pale ceramic arena tiling with warm seam lights
    base: ["#40404b", "#383841", "#2f2f38"],
    plate: "240,234,220",
    hi: "rgba(255,252,242,0.14)",
    seam: "rgba(240,210,155,0.27)",
    grain: "248,242,226",
    plates: true,
    sector: "rgba(255,214,140,0.12)",
  },
  dungeon: {
    // hand-painted stone tileset from the art pack, drawn over this base
    base: ["#494036", "#3d372e", "#332e27"],
    plate: "214,198,170",
    hi: "rgba(255,244,222,0.10)",
    seam: "rgba(196,170,128,0.22)",
    grain: "228,214,186",
    plates: false,
    sector: "rgba(228,196,140,0.10)",
  },
  ash: {
    base: ["#2e2b3b", "#272334", "#201d2b"],
    plate: "190,180,214",
    hi: "rgba(232,226,248,0.13)",
    seam: "rgba(180,150,225,0.27)",
    grain: "224,218,242",
    plates: true,
    sector: "rgba(186,150,240,0.11)",
  },
};

export function floorSectorColor(theme: FloorTheme) {
  return FLOOR_LOOKS[theme]!.sector;
}

/** Seamless 256px arena surface: plated deck, packed dirt or ash flats. */
function arenaTile(theme: FloorTheme = "slab"): HTMLCanvasElement {
  const cached = floorTiles.get(theme);
  if (cached) return cached;
  const look = FLOOR_LOOKS[theme]!;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;

  // base gradient so tiles don't read as flat
  const base = g.createLinearGradient(0, 0, S, S);
  base.addColorStop(0, look.base[0]!);
  base.addColorStop(0.5, look.base[1]!);
  base.addColorStop(1, look.base[2]!);
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);

  const P = 64;
  if (look.plates) {
    // 64px plates with bevel: dark bottom-right, lighter top-left
    for (let y = 0; y < S; y += P) {
      for (let x = 0; x < S; x += P) {
        const shade = 0.05 + Math.random() * 0.09;
        g.fillStyle = `rgba(${look.plate},${shade.toFixed(3)})`;
        g.fillRect(x + 1, y + 1, P - 2, P - 2);
        g.fillStyle = look.hi;
        g.fillRect(x + 1, y + 1, P - 2, 1);
        g.fillRect(x + 1, y + 1, 1, P - 2);
        g.fillStyle = "rgba(0,0,0,0.22)";
        g.fillRect(x + 1, y + P - 2, P - 2, 1);
        g.fillRect(x + P - 2, y + 1, 1, P - 2);
        // rivets
        g.fillStyle = `rgba(${look.plate},0.16)`;
        const rivets: [number, number][] = [
          [x + 6, y + 6],
          [x + P - 6, y + 6],
          [x + 6, y + P - 6],
          [x + P - 6, y + P - 6],
        ];
        for (const [rx, ry] of rivets) {
          g.beginPath();
          g.arc(rx, ry, 1.6, 0, Math.PI * 2);
          g.fill();
        }
      }
    }

    // seam glow
    g.strokeStyle = look.seam;
    g.lineWidth = 1;
    for (let i = 0; i <= S; i += P) {
      g.beginPath();
      g.moveTo(i + 0.5, 0);
      g.lineTo(i + 0.5, S);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i + 0.5);
      g.lineTo(S, i + 0.5);
      g.stroke();
    }
  } else {
    // soft mottled patches so soil / ash read organic instead of tiled
    for (let i = 0; i < 46; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const r = 14 + Math.random() * 42;
      const a = 0.03 + Math.random() * 0.05;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${look.plate},${a.toFixed(3)})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      // draw 4 wrapped copies so patches tile seamlessly
      for (const [ox, oy] of [
        [0, 0],
        [S, 0],
        [0, S],
        [-S, 0],
        [0, -S],
      ] as [number, number][]) {
        g.save();
        g.translate(ox, oy);
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    }
    // pebbles
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const r = 0.7 + Math.random() * 1.6;
      g.fillStyle = `rgba(${look.grain},${(0.04 + Math.random() * 0.07).toFixed(3)})`;
      g.beginPath();
      g.ellipse(x, y, r * 1.4, r, Math.random() * 3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(0,0,0,0.22)";
      g.beginPath();
      g.ellipse(x, y + r * 0.8, r * 1.2, r * 0.6, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  // grain / gravel speckle
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const a = Math.random() * 0.06;
    g.fillStyle = Math.random() < 0.35 ? `rgba(0,0,0,${a * 1.6})` : `rgba(${look.grain},${a * 1.4})`;
    g.fillRect(x, y, 1, 1);
  }

  floorTiles.set(theme, c);
  return c;
}




/* ------------------------- brotato-style arena shell ----------------------- */

const mosaics = new Map<string, HTMLCanvasElement>();

const GROUND_LOOK: Record<FloorTheme, { base: string; dark: string; light: string; tuft: string }> = {
  slab: { base: "#9ab98a", dark: "#82a274", light: "#b9d3a4", tuft: "#cfe6b4" },
  moss: { base: "#8fba8b", dark: "#77a276", light: "#aed6a5", tuft: "#c8ecb8" },
  ash: { base: "#b3aab8", dark: "#9a92a0", light: "#cbc3cf", tuft: "#e0d9e3" },
  tech: { base: "#93a4c2", dark: "#7b8dab", light: "#b0bfd9", tuft: "#c9d6ec" },
  bone: { base: "#c2b291", dark: "#a99a7b", light: "#dbccab", tuft: "#efe2c4" },
  dungeon: { base: "#a099b8", dark: "#8a83a2", light: "#bdb6d2", tuft: "#d4cde6" },
};

/**
 * Soft painted ground: broad colour drifts, dirt patches and grass tufts.
 * No tile grid at all — the arena reads as one continuous painted field.
 */
function floorMosaic(_sprites: Sprites, theme: FloorTheme): HTMLCanvasElement {
  const hit = mosaics.get(theme);
  if (hit) return hit;
  const look = GROUND_LOOK[theme] ?? GROUND_LOOK.slab;
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  let seed = hash32(theme) || 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  g.fillStyle = look.base;
  g.fillRect(0, 0, S, S);

  // wrapped drawing so the texture tiles without a visible seam
  const wrap = (draw: (ox: number, oy: number) => void) => {
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) draw(ox, oy);
  };

  // broad colour drifts
  for (let i = 0; i < 40; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 60 + rnd() * 150;
    const col = rnd() < 0.5 ? look.dark : look.light;
    wrap((ox, oy) => {
      const grad = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      grad.addColorStop(0, col);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = 0.28;
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      g.fill();
    });
  }
  g.globalAlpha = 1;

  // scuffed dirt patches with soft irregular outlines
  for (let i = 0; i < 26; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 16 + rnd() * 40;
    const pts = 9;
    const wob = Array.from({ length: pts }, () => 0.6 + rnd() * 0.7);
    wrap((ox, oy) => {
      g.globalAlpha = 0.22 + rnd() * 0.12;
      g.fillStyle = look.dark;
      g.beginPath();
      for (let k = 0; k <= pts; k++) {
        const a = (k / pts) * Math.PI * 2;
        const rr = r * wob[k % pts]!;
        const px = x + ox + Math.cos(a) * rr;
        const py = y + oy + Math.sin(a) * rr * 0.75;
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill();
    });
  }
  g.globalAlpha = 1;

  // grass tufts / gravel flecks
  for (let i = 0; i < 520; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const tuft = rnd() < 0.38;
    wrap((ox, oy) => {
      g.globalAlpha = tuft ? 0.5 : 0.32;
      g.strokeStyle = tuft ? look.tuft : look.light;
      g.lineWidth = tuft ? 1.6 : 1;
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.lineTo(x + ox + (rnd() * 2 - 1) * 3, y + oy - (tuft ? 4 + rnd() * 4 : 2));
      g.stroke();
    });
  }
  g.globalAlpha = 1;

  // gentle vignette-free grain so it never looks flat under the lights
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.035)";
    g.fillRect(rnd() * S, rnd() * S, 1, 1);
  }

  mosaics.set(theme, c);
  return c;
}

/** Cached rugged outline: a rectangle chewed up by deterministic rock bites. */
let ruggedPts: [number, number][] | null = null;
function ruggedOutline(): [number, number][] {
  if (ruggedPts) return ruggedPts;
  const pts: [number, number][] = [];
  let seed = 987654321;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const STEP = 90;
  const jag = () => (rnd() * 2 - 1) * 26 - 6;
  for (let x = -ARENA_HW; x < ARENA_HW; x += STEP) pts.push([x, -ARENA_HH + jag()]);
  for (let y = -ARENA_HH; y < ARENA_HH; y += STEP) pts.push([ARENA_HW - jag(), y]);
  for (let x = ARENA_HW; x > -ARENA_HW; x -= STEP) pts.push([x, ARENA_HH - jag()]);
  for (let y = ARENA_HH; y > -ARENA_HH; y -= STEP) pts.push([-ARENA_HW + jag(), y]);
  ruggedPts = pts;
  return pts;
}

/** Traces the rugged arena boundary into the current path (world space). */
function ruggedPath(ctx: CanvasRenderingContext2D) {
  const pts = ruggedOutline();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.closePath();
}

/* ------------------------------- state factory ------------------------------ */

export function createState(
  character: CharacterKey = "spike",
  mode: RunMode = "survival",
  cls: ClassKey = classForSkin(character),
): GameState {
  const def = CLASSES[cls] ?? CLASSES.soldier;
  const artKey = classArtKey(cls);
  const skin = CLASS_DESIGNS[artKey] ? artKey : (def.skin ?? character);
  
  const decor: Decor[] = [];

  const maxHp = Math.round(def.hp * def.hpMult);
  const speed = Math.round(def.speed * def.speedMult);
  const mods = baseMods();
  mods.crit += def.crit;
  mods.lifesteal += def.lifesteal;

  const startTurrets: Turret[] = [];
  for (let i = 0; i < def.turrets; i++) {
    const a = (i / Math.max(1, def.turrets)) * Math.PI * 2;
    startTurrets.push({
      x: Math.cos(a) * 90,
      y: Math.sin(a) * 90,
      hp: 60,
      maxHp: 60,
      life: Number.POSITIVE_INFINITY,
      aim: a,
      cd: 0,
      muzzle: 0,
      weapon: WEAPONS[def.turretWeapon] ? def.turretWeapon : "pistol",
      kind: "turret",
    });
  }

  const state: GameState = {
    cam: { x: -WORLD_W / 2, y: -WORLD_H / 2 },
    lootTimer: 6,
    player: {
      x: 0,
      y: 0,
      radius: 22,
      speed,
      baseSpeed: speed,
      hp: maxHp,
      maxHp,
      facing: 1,
      aim: 0,
      invuln: 0,
      bob: 0,
      moving: false,
      animT: 0,
      weapon: WEAPONS[def.weapon] ? def.weapon : "pistol",
      shield: 0,
      damageMult: def.damage * def.damageMult,
      rateMult: 1,
      character: skin,
      class: cls,
      mods,
    },
    enemies: [],
    bullets: [],
    turrets: startTurrets,
    ebullets: [],
    hazards: [],
    invertT: 0,
    drainT: 0,
    enrageT: 0,
    particles: [],
    popups: [],
    decor,
    pickups: [],
    echoes: [],
    recording: [],
    recordAcc: 0,
    echoTimer: ECHO_INTERVAL,
    score: 0,
    wave: 1,
    waveTimer: WAVE_LENGTH,
    spawnTimer: 0.2,
    phase: "wave",
    arsenal: [WEAPONS[def.weapon] ? def.weapon : "pistol"],
    class: cls,
    shopOffers: [],
    shopRerolls: 0,
    materials: def.startingMaterials,
    mode,
    fireCooldown: 0,
    focusAim: false,
    mouseX: 200,
    mouseY: 0,
    muzzle: 0,
    kick: 0,
    kickAng: 0,
    hitFlash: 0,
    shake: 0,

    over: false,
    won: false,
    breather: 0,
    xp: 0,
    xpToNext: xpForLevel(1),
    level: 1,
    kills: 0,
    time: 0,
    sfx: [],
    takenUpgrades: {},
    paused: false,
    floor: "dungeon",
    arenaR: arenaRadius(1, 1),
  };
  // seed the arena lightly: a couple of scouts, not a crowd
  for (let i = 0; i < 2; i++) spawnEnemy(state);
  return state;
}

/** Danger tier for a species — drives how its spawn share moves with the wave. */
function speciesTier(k: Species): number {
  const critter = CRITTER_TIER[k as keyof typeof CRITTER_TIER];
  if (critter) return critter;
  const st = STATS[k];
  if (st.hp >= 40) return 5;
  if (st.hp >= 14) return 4;
  if (st.hp >= 8) return 3;
  if (st.hp >= 4) return 2;
  return 1;
}

/** Everything unlocked at this wave. */
export function speciesPool(wave: number): Species[] {
  return PLAYABLE_SPECIES.filter((k) => STATS[k].minWave <= wave);
}

/**
 * Spawn share for one species at a wave.
 * Low tiers never disappear (they just thin out) while high tiers ramp hard,
 * so the deeper you go the nastier — and the more varied — the crowd gets.
 */
export function speciesWeight(k: Species, wave: number): number {
  const st = STATS[k];
  if (wave < st.minWave) return 0;
  const tier = speciesTier(k);
  const age = wave - st.minWave;
  // deeper waves = a nastier bag. High tiers ramp hard and keep ramping,
  // low tiers thin out much faster once the wave count climbs.
  const ramp = 1 + age * (0.08 + tier * 0.12);
  const fade = Math.pow(0.86, Math.max(0, age - 2) * (6 - tier) * 0.4);
  // extra push for tier 4-5 in big waves so late fights are full of threats
  const lateBoost = tier >= 4 ? 1 + Math.max(0, wave - 8) * 0.14 : 1;
  const chaffCut = tier <= 2 ? 1 / (1 + Math.max(0, wave - 8) * 0.1) : 1;
  return Math.max(0.12, st.weight * ramp * fade * lateBoost * chaffCut);
}

/**
 * Shuffled weighted bag: every unlocked species gets used before any repeats,
 * so a wave always shows off the whole roster instead of the same two mobs.
 */
let speciesBag: Species[] = [];
let bagWave = -1;

function refillBag(wave: number) {
  bagWave = wave;
  speciesBag = [];
  for (const k of speciesPool(wave)) {
    const n = Math.max(1, Math.round(speciesWeight(k, wave) * 2));
    for (let i = 0; i < n; i++) speciesBag.push(k);
  }
  for (let i = speciesBag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = speciesBag[i]!;
    speciesBag[i] = speciesBag[j]!;
    speciesBag[j] = tmp;
  }
}

function chooseSpecies(wave: number): Species {
  if (wave !== bagWave || speciesBag.length === 0) refillBag(wave);
  return speciesBag.pop() ?? CRITTER_KEYS[0]!;
}

/**
 * Brotato-style arena: one fixed-size playfield for the whole run. It never
 * grows, so every wave is fought in the same tight, readable space and the
 * camera only has to pan a little to keep the player centred.
 */
/** Brotato-style rectangular playfield (half extents). */
export const ARENA_HW = 1080;
export const ARENA_HH = 740;
/** legacy radius used for coarse culling only */
export const ARENA_R = Math.hypot(ARENA_HW, ARENA_HH);
function arenaRadius(_wave: number, _level: number) {
  return ARENA_R;
}
export { arenaRadius };

/** Clamp any body inside the rectangular arena. */
export function clampArena(v: Vec, pad = 0) {
  const hw = ARENA_HW - pad;
  const hh = ARENA_HH - pad;
  v.x = Math.max(-hw, Math.min(hw, v.x));
  v.y = Math.max(-hh, Math.min(hh, v.y));
}

export function insideArena(x: number, y: number, pad = 0) {
  return Math.abs(x) <= ARENA_HW - pad && Math.abs(y) <= ARENA_HH - pad;
}

/** Random point inside the arena, keeping `pad` away from the rugged edge. */
export function arenaPoint(pad = 60): Vec {
  return {
    x: rand(-(ARENA_HW - pad), ARENA_HW - pad),
    y: rand(-(ARENA_HH - pad), ARENA_HH - pad),
  };
}

/** Random spawn point hugging the arena border. */
export function arenaEdgePoint(): Vec {
  const inset = rand(24, 90);
  const hw = ARENA_HW - inset;
  const hh = ARENA_HH - inset;
  const per = 2 * (hw + hh);
  let t = Math.random() * per;
  if (t < hw * 2) return { x: -hw + t, y: Math.random() < 0.5 ? -hh : hh };
  t -= hw * 2;
  return { x: t < hh ? -hw : hw, y: -hh + (t % hh) * 2 };
}



/**
 * How many enemies should be alive at once.
 * Grows slowly with wave/level, and ramps up *inside* each wave so the first
 * seconds after a wave flip are calm instead of an instant wall of bodies.
 */
function targetAlive(s: GameState) {
  // Endless keeps escalating instead of flattening into a capped late-game.
  // Survival is deliberately pressure-heavy so the 23-wave clear is earned.
  const base =
    4 +
    (s.wave - 1) * (s.mode === "endless" ? 1.8 : 1.65) +
    Math.max(0, s.wave - 8) * (s.mode === "endless" ? 1.15 : 1.05) +
    Math.max(0, s.wave - 16) * 0.8 +
    s.level * 0.45;
  // 0 -> 1 across the wave: pressure builds toward the end of the wave
  const progress = Math.min(1, 1 - s.waveTimer / waveLength(s.wave));
  const ramp = 0.45 + progress * 0.55;
  return Math.min(110, Math.round(base * ramp) + 2);
}




interface SpawnOpts {
  species?: Species;
  x?: number;
  y?: number;
  /** stat multiplier for minions and hydra clones */
  scale?: number;
  minion?: boolean;
}

function spawnEnemy(s: GameState, forceElite = false, opts: SpawnOpts = {}) {
  // spawn spread evenly along the rugged arena border
  const edge = arenaEdgePoint();
  const x = opts.x ?? edge.x;
  const y = opts.y ?? edge.y;

  const species = opts.species ?? chooseSpecies(s.wave);
  const st = STATS[species];
  const elite =
    forceElite || (s.wave >= 5 && Math.random() < Math.min(0.16, 0.02 + (s.wave - 5) * 0.012));
  const breed = rollBreed(s.wave);
  const mul = opts.scale ?? 1;
  const endlessRamp = s.mode === "endless" ? Math.pow(1.035, Math.max(0, s.wave - 1)) : 1;
  const survivalRamp = s.mode === "survival" ? 1 + Math.max(0, s.wave - 1) * 0.018 : 1;
  // Both modes keep getting tougher; Endless has no late-game ceiling.
  const hp = Math.round(
    st.hp *
      3.4 *
      (1 + (s.wave - 1) * 0.28 + Math.max(0, s.wave - 12) * 0.12) *
      endlessRamp *
      survivalRamp *
      breed.hpMul *
      (elite ? 2.8 : 1) *
      mul,
  );

  const e: Enemy = {
    x,
    y,
    radius: st.radius * breed.scaleMul * (elite ? 1.22 : 1) * mul,
    speed:
      (rand(st.speed[0], st.speed[1]) * 0.82 + s.wave * 1.6) *
      breed.speedMul *
      (elite ? 1.1 : 1),



    hp,
    maxHp: hp,
    species,
    hurt: 0,
    animT: Math.random(),
    scale: rand(0.94, 1.08) * breed.scaleMul * (elite ? 1.25 : 1) * mul,
    facing: 1,
    dying: false,
    deathT: 0,
    attackCd: 0,
    elite,
    xp: Math.max(1, Math.round((st.score * breed.scoreMul) / 8)) * (elite ? 4 : 1),
    breed: breed.id,
    name: breedName(breed, species),
    tint: "",
    aura: breed.aura,
    damage:
      st.damage *
      breed.dmgMul *
      (1 + (s.wave - 1) * 0.055 + Math.max(0, s.wave - 12) * 0.025) *
      (opts.minion ? 0.8 : 1),

    role: AI_ROLE[species],
    state: "walk",
    stateT: 0,
    cd: rand(0.6, 2.2),
    cd2: rand(1, 3),
    vx: 0,
    vy: 0,
    fade: 0,
    untargetable: false,
    telegraph: 0,
    telAng: 0,
    spawned: 0,
    didSplit: false,
    buffed: 0,
    shielded: false,
    minion: opts.minion ?? false,
  };
  s.enemies.push(e);
  return e;
}

/** Minion helper used by spawners, splitters and hydras. */
function spawnMinion(s: GameState, host: Enemy, species: Species, scale = 1) {
  const a = Math.random() * Math.PI * 2;
  const e = spawnEnemy(s, false, {
    species,
    x: host.x + Math.cos(a) * (host.radius + 14),
    y: host.y + Math.sin(a) * (host.radius + 10),
    scale,
    minion: true,
  });
  e.xp = Math.max(1, Math.round(e.xp * 0.5));
  burst(s, e.x, e.y - 10, 8, STATS[species].color, 200);
  return e;
}

/** Horde projectile. */
function enemyShot(
  s: GameState,
  e: Enemy,
  ang: number,
  speed: number,
  damage: number,
  kind: "bolt" | "orb" | "spike" = "bolt",
) {
  if (s.ebullets.length > 220) return;
  s.ebullets.push({
    x: e.x,
    y: e.y - e.radius * 0.9,
    vx: Math.cos(ang) * speed,
    vy: Math.sin(ang) * speed,
    radius: kind === "orb" ? 10 : 7,
    life: 3.4,
    damage,
    color: STATS[e.species].color,
    kind,
  });
}

/** High-arc mortar shell that lands on a marked spot. */
function mortarShot(s: GameState, e: Enemy, tx: number, ty: number, damage: number) {
  if (s.ebullets.length > 220) return;
  const flight = 1.15;
  s.ebullets.push({
    x: e.x,
    y: e.y - e.radius,
    vx: 0,
    vy: 0,
    radius: 12,
    life: flight + 0.05,
    damage,
    color: STATS[e.species].color,
    kind: "mortar",
    tx,
    ty,
    arcT: 0,
    arcMax: flight,
  });
}

function dropHazard(
  s: GameState,
  x: number,
  y: number,
  kind: "mine" | "sludge" | "shock" | "crater",
  radius: number,
  damage: number,
  life: number,
) {
  if (s.hazards.length > 90) s.hazards.shift();
  s.hazards.push({ x, y, kind, radius, damage, life, maxLife: life, arm: kind === "mine" ? 0.7 : 0 });
}


/** Small welcome pulse when a wave starts (kept light — pressure is gradual). */
function waveBurst(s: GameState) {
  const n = Math.min(12, 2 + Math.round(s.wave * 0.55));
  for (let i = 0; i < n; i++) spawnEnemy(s);
  const survivalBoss =
    s.mode === "survival" &&
    (s.wave === 5 || s.wave === 10 || s.wave === 16 || s.wave === 20 || s.wave === 23);
  const regularBoss = s.mode === "boss" && s.wave % 3 === 0;
  if (survivalBoss || regularBoss) {
    // Bosses alternate between the stone titan and the NightBorne revenant.
    const bossSpecies = s.wave % 2 === 0 ? "e_nightborne" : "e_demon_slime";
    spawnEnemy(s, true, {
      species: bossSpecies,
      scale: s.wave === 5 ? 1.35 : s.wave === 10 || s.wave === 16 ? 1.8 : 2.35,
    });
    s.popups.push({
      x: s.player.x,
      y: s.player.y - 150,
      life: 2.4,
      text: `${s.wave === 5 ? "EASY" : s.wave === 16 ? "ELITE" : s.wave === 23 ? "FINAL" : "NORMAL"} BOSS`,
    });
  }
}

function dropXp(s: GameState, x: number, y: number, amount: number) {
  const orbs = Math.min(6, 1 + Math.floor(amount / 4));
  const per = Math.max(1, Math.round(amount / orbs));
  for (let i = 0; i < orbs; i++) {
    const a = Math.random() * Math.PI * 2;
    s.pickups.push({
      x: x + Math.cos(a) * rand(2, 20),
      y: y + Math.sin(a) * rand(2, 14),
      kind: "xp",
      life: 26,
      bob: Math.random() * Math.PI * 2,
      amount: per,
      vx: Math.cos(a) * rand(40, 120),
      vy: Math.sin(a) * rand(30, 90),
    });
  }
}

function dropUpgradePack(s: GameState, x: number, y: number) {
  const [id] = rollUpgrades(s.takenUpgrades, 1);
  if (!id) return;
  const a = Math.random() * Math.PI * 2;
  s.pickups.push({
    x: x + Math.cos(a) * rand(40, 90),
    y: y + Math.sin(a) * rand(30, 70),
    kind: "upgrade",
    upgrade: id,
    life: 60,
    bob: Math.random() * Math.PI * 2,
  });
}

function grantXp(s: GameState, amount: number) {
  s.xp += amount;
  s.materials += amount;
  while (s.xp >= s.xpToNext) {
    s.xp -= s.xpToNext;
    s.level += 1;
    s.xpToNext = xpForLevel(s.level);
    dropUpgradePack(s, s.player.x, s.player.y);
    s.sfx.push("level");
    s.popups.push({ x: s.player.x, y: s.player.y - 130, life: 1.4, text: `LEVEL ${s.level}` });
    burst(s, s.player.x, s.player.y - 20, 26, "#ffd166", 240);
  }
}


function burst(s: GameState, x: number, y: number, count: number, hue: string, power = 180) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(power * 0.25, power);
    const life = rand(0.2, 0.55);
    s.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life,
      maxLife: life,
      size: rand(2, 5),
      hue,
    });
  }
}

/** Small AoE from Volatile Rounds. */
function explode(s: GameState, x: number, y: number, radius: number, damage: number, skip: Enemy) {
  burst(s, x, y, 16, "#ffb347", 300);
  s.shake = Math.max(s.shake, 6);
  for (const o of s.enemies) {
    if (o === skip || o.dying) continue;
    if (Math.hypot(o.x - x, o.y - BODY_Y - y) < radius + o.radius) {
      o.hp -= damage;
      o.hurt = 0.1;
    }
  }
}

/** Single funnel for every source of player damage (contact, shots, hazards). */
function hurtPlayer(s: GameState, damage: number, iframe = 0.45) {
  const p = s.player;
  if (p.invuln > 0 || s.over) return false;
  p.hp -= damage;
  p.invuln = iframe;
  s.sfx.push("hurt");
  s.shake = Math.max(s.shake, 10);
  burst(s, p.x, p.y - 14, 10, "#ff8f6a", 200);
  if (p.hp <= 0) {
    p.hp = 0;
    if (!s.over) s.sfx.push("death");
    s.over = true;
  }
  return true;
}

function dropPickup(s: GameState, x: number, y: number, species: Species) {
  const roll = Math.random();
  const bigKill = STATS[species].hp >= 20;
  if (!bigKill && roll > 0.16) return;
  if (bigKill && roll > 0.6) return;
  let kind: PickupKind;
  let weapon: WeaponKey | undefined;
  const r2 = Math.random();
  if (r2 < 0.2) kind = "health";
  else if (r2 < 0.34) {
    kind = "weapon";
    weapon = pick(LOOT_WEAPONS);
  } else if (r2 < 0.6) kind = "speed";
  else if (r2 < 0.8) kind = "rate";
  else kind = "damage";

  s.pickups.push({
    x,
    y,
    kind,
    weapon,
    life: 18,
    bob: Math.random() * Math.PI * 2,
  });
}

/** Random loot that just lies on the floor around the player. */
function scatterLoot(s: GameState) {
  const pt = arenaPoint(70);
  const x = pt.x;
  const y = pt.y;
  const r = Math.random();
  let kind: PickupKind;
  let weapon: WeaponKey | undefined;
  if (r < 0.18) kind = "health";
  else if (r < 0.34) {
    kind = "weapon";
    weapon = pick(LOOT_WEAPONS);
  } else if (r < 0.6) kind = "speed";
  else if (r < 0.8) kind = "rate";
  else kind = "damage";
  s.pickups.push({ x, y, kind, weapon, life: 30, bob: Math.random() * Math.PI * 2 });
}

/* --------------------------------- shooting --------------------------------- */

function fire(
  s: GameState,
  x: number,
  y: number,
  aim: number,
  weaponKey: WeaponKey,
  damageMult: number,
  fromEcho: boolean,
  mods: Mods,
  /** extra spread multiplier: >1 when firing on the move, <1 when focus aiming */
  accuracy = 1,
) {
  const w = WEAPONS[weaponKey];
  const arch = w.archetype ?? "rifle";
  const pellets = w.pellets + mods.extraProjectiles;
  const baseSpread =
    (w.spread * mods.spreadMult + (pellets > 1 ? 0.02 * mods.extraProjectiles : 0)) * accuracy;

  // Every barrel type behaves differently: cone width, muzzle velocity,
  // travel time, projectile size and how the round dies on impact.
  const feel = {
    pistol: { spread: 0.8, speed: 1, life: 1.6, size: 1, wobble: 0, fan: false },
    smg: { spread: 1.5, speed: 0.92, life: 1.1, size: 0.8, wobble: 0, fan: false },
    rifle: { spread: 0.85, speed: 1.1, life: 1.8, size: 0.95, wobble: 0, fan: false },
    shotgun: { spread: 2.4, speed: 0.82, life: 0.38, size: 0.85, wobble: 0, fan: true },
    sniper: { spread: 0.18, speed: 1.9, life: 2.6, size: 0.7, wobble: 0, fan: false },
    heavy: { spread: 0.6, speed: 0.55, life: 2.4, size: 1.7, wobble: 0, fan: false },
    energy: { spread: 0.7, speed: 0.8, life: 2.2, size: 1.35, wobble: 5, fan: false },
  }[arch];

  const spread = baseSpread * feel.spread;
  const speed = w.speed * mods.projSpeedMult * feel.speed;
  for (let i = 0; i < pellets; i++) {
    // shotguns throw an even fan, everything else jitters inside its cone
    const off = feel.fan && pellets > 1 ? (i / (pellets - 1) - 0.5) * spread * 2 : rand(-spread, spread);
    const a = aim + off + (feel.fan ? rand(-0.03, 0.03) : 0);
    const crit = Math.random() < mods.crit;
    const spd = speed * (arch === "shotgun" ? rand(0.85, 1.15) : 1);
    const mx = x + Math.cos(a) * MUZZLE_DISTANCE;
    const my = y + Math.sin(a) * MUZZLE_DISTANCE;
    const b: Bullet = {
      x: mx,
      y: my,
      px: mx,
      py: my,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      radius: Math.max(5, w.bulletRadius * 1.5 * feel.size),
      life: feel.life,
      angle: a,
      damage: w.damage * damageMult * (crit ? mods.critMult : 1),
      // bullets phase through everything and damage every enemy they touch
      pierce: Infinity,

      color: crit ? "#ffe066" : w.color,
      color2: crit ? "#fff8d0" : w.color2,
      visual: w.visual,
      sprite: w.bulletSprite,
      wobble: feel.wobble,
      born: s.time,
      fromEcho,
      crit,
      knock: w.knock * mods.knockMult,
      explosive: mods.explosive + (arch === "heavy" ? 1.5 : 0),
      lifesteal: mods.lifesteal,
      hits: new Set<Enemy>(),
    };
    s.bullets.push(b);
  }
  const mx = x + Math.cos(aim) * MUZZLE_DISTANCE;
  const my = y + Math.sin(aim) * MUZZLE_DISTANCE;
  if (!fromEcho) {
    s.sfx.push("shoot");
    s.muzzle = 0.075;
    s.shake = Math.max(s.shake, w.shake);
    // punchy directional recoil: camera nudges back along the shot
    s.kick = Math.min(14, s.kick + (weaponKey === "shotgun" ? 11 : 4.5));
    s.kickAng = aim;
    // hot brass flying out of the ejection port
    const side = aim + Math.PI * 0.5;
    for (let i = 0; i < (weaponKey === "shotgun" ? 1 : 1); i++) {
      const sp = rand(110, 210);
      s.particles.push({
        x: mx - Math.cos(aim) * 12,
        y: my - Math.sin(aim) * 12,
        vx: Math.cos(side) * sp - Math.cos(aim) * 40,
        vy: Math.sin(side) * sp - Math.sin(aim) * 40 - 60,
        life: 0.5,
        maxLife: 0.5,
        size: rand(2, 3.4),
        hue: "#ffd27a",
      });
    }
  }
  // muzzle sparks cone
  for (let i = 0; i < (fromEcho ? 2 : 7); i++) {
    const a = aim + rand(-0.28, 0.28);
    const sp = rand(150, 420);
    const life = rand(0.06, 0.18);
    s.particles.push({
      x: mx,
      y: my,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life,
      maxLife: life,
      size: rand(1.6, 3.6),
      hue: i % 3 === 0 ? "#fff3c4" : w.color,
    });
  }

}

/* --------------------------------- turrets --------------------------------- */

function updateTurrets(s: GameState, dt: number) {
  const p = s.player;
  for (let i = s.turrets.length - 1; i >= 0; i--) {
    const t = s.turrets[i]!;
    t.life -= dt;
    if (t.muzzle > 0) t.muzzle -= dt;
    if (t.life <= 0 || t.hp <= 0) {
      burst(s, t.x, t.y - 10, 10, "#9fd8ff", 200);
      s.turrets.splice(i, 1);
      continue;
    }

    if (t.kind === "mine") {
      if (t.arm && t.arm > 0) t.arm -= dt;
      let boom: Enemy | null = null;
      for (const e of s.enemies) {
        if (e.dying || e.untargetable) continue;
        if (Math.hypot(e.x - t.x, e.y - BODY_Y - t.y) < e.radius + 34) {
          boom = e;
          break;
        }
      }
      if (boom && (!t.arm || t.arm <= 0)) {
        explode(s, t.x, t.y, 140, 46 * p.damageMult, boom);
        boom.hp -= 46 * p.damageMult;
        boom.hurt = 0.15;
        if (boom.hp <= 0) killEnemy(s, boom);
        s.turrets.splice(i, 1);
      }
      continue;
    }

    // auto turret: lock the closest live target and burp out rounds
    let best: Enemy | null = null;
    let bestD = 640;
    for (const e of s.enemies) {
      if (e.dying || e.untargetable) continue;
      const d = Math.hypot(e.x - t.x, e.y - BODY_Y - t.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    t.cd -= dt;
    if (!best) continue;
    const want = Math.atan2(best.y - BODY_Y - t.y, best.x - t.x);
    let da = want - t.aim;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    t.aim += da * Math.min(1, dt * 9);
    if (Math.abs(da) < 0.25 && t.cd <= 0) {
      const w = WEAPONS[t.weapon];
      t.cd = Math.max(0.12, w.rate * 1.5);
      t.muzzle = 0.07;
      fire(s, t.x, t.y - 24, t.aim, t.weapon, p.damageMult * 0.55, true, p.mods, 1);
    }
  }
}


// swept circle-vs-circle so fast bullets never phase through zombies
export const BODY_Y = 16;

function sweptHit(b: Bullet, prevX: number, prevY: number, e: Enemy) {
  const ey = e.y - BODY_Y;
  const r = b.radius + e.radius * 1.15 + 4;
  const dx = b.x - prevX;
  const dy = b.y - prevY;
  const fx = prevX - e.x;
  const fy = prevY - ey;
  const a = dx * dx + dy * dy;
  const bq = 2 * (fx * dx + fy * dy);
  const cq = fx * fx + fy * fy - r * r;
  if (cq <= 0) return true;
  if (a <= 0.0001) return false;
  const disc = bq * bq - 4 * a * cq;
  if (disc < 0) return false;
  const sq = Math.sqrt(disc);
  const t1 = (-bq - sq) / (2 * a);
  const t2 = (-bq + sq) / (2 * a);
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

/* ---------------------------------- update ---------------------------------- */

/* --------------------------- spatial hash for speed ------------------------- */

const CELL = 110;
const grid = new Map<number, Enemy[]>();

function cellKey(cx: number, cy: number) {
  return (cx + 5000) * 20000 + (cy + 5000);
}

function buildGrid(enemies: Enemy[]) {
  grid.clear();
  for (const e of enemies) {
    if (e.dying) continue;
    const k = cellKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
    const bucket = grid.get(k);
    if (bucket) bucket.push(e);
    else grid.set(k, [e]);
  }
}

function killEnemy(s: GameState, e: Enemy) {
  const st = STATS[e.species];
  e.dying = true;
  e.deathT = 0;
  s.score += st.score * (e.elite ? 3 : 1);
  s.kills += 1;
  s.sfx.push("kill");
  burst(s, e.x, e.y - 12, e.radius > 30 ? 22 : 10, st.color, 260);
  dropXp(s, e.x, e.y - 10, e.xp);
  dropPickup(s, e.x, e.y, e.species);
  // perks come from the horde now: elites always cough one up, fodder rarely
  if (e.elite || e.radius > 40) dropUpgradePack(s, e.x, e.y);
  else if (Math.random() < 0.035) dropUpgradePack(s, e.x, e.y);
  if (e.radius > 34) s.shake = Math.max(s.shake, 10);

  // ---- blueprint death mechanics
  if (e.role === "split" && !e.minion) {
    const spawn = e.species === "e_blob_gray" ? "e_blob_pup" : "e_imp_violet";
    for (let i = 0; i < 3; i++) spawnMinion(s, e, spawn, 0.85);
    s.popups.push({ x: e.x, y: e.y - 70, life: 0.9, text: "SPLIT!" });
  }
  if (e.role === "bomber") {
    explode(s, e.x, e.y, 130, e.damage * 1.6, e);
    if (Math.hypot(s.player.x - e.x, s.player.y - e.y) < 130) hurtPlayer(s, e.damage * 1.6);
    burst(s, e.x, e.y - 10, 26, "#ffb347", 340);
    s.shake = Math.max(s.shake, 9);
  }
  if (e.role === "flee") {
    // Looter bounty: a fat pile of xp if you actually hunt it down
    dropXp(s, e.x, e.y - 10, Math.round(e.xp * 5));
    s.popups.push({ x: e.x, y: e.y - 80, life: 1.3, text: "BOUNTY!" });
  }
  if (e.role === "rhino" || e.role === "titan") {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      dropHazard(s, e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70, "crater", 54, e.damage * 0.5, 1.1);
    }
  }
  if (e.role === "brood") s.popups.push({ x: e.x, y: e.y - 90, life: 2, text: "NEST DESTROYED" });
  if (s.mode === "survival" && s.wave === 23 && (e.species === "e_demon_slime" || e.species === "e_nightborne")) {
    s.won = true;
    s.over = true;
    s.popups.push({ x: e.x, y: e.y - 120, life: 3, text: "SURVIVAL CLEARED!" });
  }
}

/* ---------------------------------- update ---------------------------------- */

export function update(s: GameState, input: Input, dt: number) {
  const p = s.player;
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 26);
  if (s.muzzle > 0) s.muzzle -= dt;
  if (s.kick > 0) s.kick = Math.max(0, s.kick - dt * 90);
  if (s.hitFlash > 0) s.hitFlash = Math.max(0, s.hitFlash - dt * 5);

  // hard caps keep the frame budget stable no matter how wild the fight gets
  if (s.particles.length > 380) s.particles.splice(0, s.particles.length - 380);
  if (s.popups.length > 40) s.popups.splice(0, s.popups.length - 40);
  if (s.bullets.length > 200) s.bullets.splice(0, s.bullets.length - 200);

  for (let i = s.popups.length - 1; i >= 0; i--) {
    const u = s.popups[i]!;
    u.y -= dt * 34;
    u.life -= dt;
    if (u.life <= 0) s.popups.splice(i, 1);
  }
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const q = s.particles[i]!;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vx *= 0.92;
    q.vy *= 0.92;
    q.life -= dt;
    if (q.life <= 0) s.particles.splice(i, 1);
  }
  if (s.over || s.paused || s.phase === "shop") return;
  s.time += dt;

  /* -------------------------------- movement ------------------------------- */
  let dx = input.moveX ?? 0;
  let dy = input.moveY ?? 0;
  if (input.keys.has("w") || input.keys.has("arrowup")) dy -= 1;
  if (input.keys.has("s") || input.keys.has("arrowdown")) dy += 1;
  if (input.keys.has("a") || input.keys.has("arrowleft")) dx -= 1;
  if (input.keys.has("d") || input.keys.has("arrowright")) dx += 1;
  // Siren psychic ring: controls read backwards for a couple of seconds
  if (s.invertT > 0) {
    s.invertT -= dt;
    dx = -dx;
    dy = -dy;
  }
  if (s.drainT > 0) s.drainT -= dt;
  // sludge slow wears off smoothly
  if (p.speed < p.baseSpeed) p.speed = Math.min(p.baseSpeed, p.speed + p.baseSpeed * 0.9 * dt);
  if (s.enrageT > 0) s.enrageT -= dt;
  const len = Math.hypot(dx, dy);
  p.moving = len > 0.08;
  if (len > 1) {
    dx /= len;
    dy /= len;
  }
  p.animT += dt * (p.moving ? 1 : 0.6);
  p.bob += dt * (p.moving ? 12 : 3);
  p.x += dx * p.speed * dt;
  p.y += dy * p.speed * dt;

  // fixed rectangular border, same size for the whole run (Brotato-style arena)
  s.arenaR = arenaRadius(s.wave, s.level);
  clampArena(p, p.radius + 10);
  if (p.invuln > 0) p.invuln -= dt;

  // camera follows the player, then clamps to the arena so the view never
  // drifts off into empty space past the border
  const k = 1 - Math.pow(0.0001, dt);
  s.cam.x += (p.x - WORLD_W / 2 - s.cam.x) * k;
  s.cam.y += (p.y - WORLD_H / 2 - s.cam.y) * k;
  const pad = 90;
  const limX = ARENA_HW + pad - WORLD_W / 2;
  const limY = ARENA_HH + pad - WORLD_H / 2;
  s.cam.x = Math.max(-WORLD_W / 2 - limX, Math.min(-WORLD_W / 2 + limX, s.cam.x));
  s.cam.y = Math.max(-WORLD_H / 2 - limY, Math.min(-WORLD_H / 2 + limY, s.cam.y));


  buildGrid(s.enemies);

  /* ------------------- aiming — assisted, not automated -------------------- */
  // Auto-aim only reaches so far, turns like a turret and gets sloppy on the move.
  // Aiming yourself (mouse / right stick) is always sharper and hits harder,
  // so positioning and manual focus fire still decide the fight.
  const stickLen = Math.hypot(input.aimX ?? 0, input.aimY ?? 0);
  const manual = stickLen > 0.25 || input.firing === true;
  s.focusAim = manual;


  let best = Infinity;
  let tx = 0;
  let ty = 0;
  let hasTarget = false;
  for (const e of s.enemies) {
    if (e.dying || e.untargetable) continue;
    const d = (e.x - p.x) ** 2 + (e.y - (p.y - BODY_Y)) ** 2;
    if (d < best && d < AUTO_RANGE * AUTO_RANGE) {
      best = d;
      tx = e.x;
      ty = e.y - BODY_Y;
      hasTarget = true;
    }
  }

  let onTarget = false;
  if (manual) {
    // player takes over: instant aim, tight spread, bonus damage
    if (stickLen > 0.25) {
      p.aim = Math.atan2(input.aimY!, input.aimX!);
      s.mouseX = p.x + Math.cos(p.aim) * 260;
      s.mouseY = p.y - BODY_Y + Math.sin(p.aim) * 260;
    } else {
      s.mouseX = input.mouse.x + s.cam.x;
      s.mouseY = input.mouse.y + s.cam.y;
      p.aim = Math.atan2(s.mouseY - (p.y - BODY_Y), s.mouseX - p.x);
    }
    onTarget = true;
  } else if (hasTarget) {
    const want = Math.atan2(ty - (p.y - BODY_Y), tx - p.x);
    let diff = want - p.aim;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const step = Math.min(Math.abs(diff), AIM_TURN_SPEED * dt) * Math.sign(diff);
    p.aim += step;
    // only shoots once the barrel has actually swung onto the target
    onTarget = Math.abs(diff) - Math.abs(step) < 0.10;
    s.mouseX = tx;
    s.mouseY = ty;
  } else {
    // nothing in reach: the gun drifts to where the player is heading
    const mvx = input.moveX ?? 0;
    const mvy = input.moveY ?? 0;
    if (p.moving && (mvx !== 0 || mvy !== 0)) p.aim = Math.atan2(mvy, mvx);

    s.mouseX = p.x + Math.cos(p.aim) * 260;
    s.mouseY = p.y - BODY_Y + Math.sin(p.aim) * 260;
  }
  p.facing = Math.cos(p.aim) >= 0 ? 1 : -1;

  /* -------------------------------- shooting ------------------------------- */
  s.fireCooldown -= dt;
  const wantsFire = (manual || hasTarget) && onTarget;
  if (wantsFire && s.fireCooldown <= 0) {
    // manual = tighter cone + damage bonus; auto on the move = sloppy cone
    const accuracy = manual ? (p.moving ? 0.85 : 0.6) : p.moving ? 1.8 : 1.15;
    const dmg = p.damageMult * (manual && s.drainT <= 0 ? FOCUS_DAMAGE_BONUS : 1);
    s.fireCooldown = (WEAPONS[p.weapon].rate / p.rateMult) * (manual ? 1 : AUTO_RATE_PENALTY);
    fire(s, p.x, p.y - GUN_Y, p.aim, p.weapon, dmg, false, p.mods, accuracy);
  }



  /* --------------------------------- turrets -------------------------------- */
  updateTurrets(s, dt);

  /* ------------------------------ echo recorder ----------------------------- */
  s.recordAcc += dt;
  while (s.recordAcc >= RECORD_STEP) {
    s.recordAcc -= RECORD_STEP;
    if (s.recording.length < 1200)
      s.recording.push({ x: p.x, y: p.y, aim: p.aim, firing: wantsFire, moving: p.moving });
  }
  s.echoTimer -= dt;
  if (s.echoTimer <= 0) {
    s.echoTimer = ECHO_INTERVAL;
    if (s.recording.length > 10) {
      const first = s.recording[0]!;
      const echo: Echo = {
        frames: s.recording,
        t: 0,
        x: first.x,
        y: first.y,
        aim: first.aim,
        facing: 1,
        moving: false,
        animT: 0,
        hp: p.maxHp * 0.5,
        maxHp: p.maxHp * 0.5,
        weapon: p.weapon,
        damageMult: p.damageMult,
        rateMult: p.rateMult,
        cooldown: 0,
        muzzle: 0,
        character: p.character,
        mods: { ...p.mods },
        fading: 0,
        dead: false,
      };
      s.echoes.push(echo);
      s.sfx.push("echo");
      if (s.echoes.length > MAX_ECHOES) s.echoes.shift();
      s.popups.push({ x: p.x, y: p.y - 150, life: 1.4, text: "ECHO CREATED" });
      burst(s, echo.x, echo.y - 20, 18, "#9fd8ff", 220);
    }
    s.recording = [];
  }

  /* -------------------------------- echoes --------------------------------- */
  for (let i = s.echoes.length - 1; i >= 0; i--) {
    const e = s.echoes[i]!;
    if (e.dead) {
      e.fading += dt;
      if (e.fading > 0.7) s.echoes.splice(i, 1);
      continue;
    }
    e.t += dt;
    const idx = Math.floor(e.t / RECORD_STEP) % e.frames.length;
    const f = e.frames[idx]!;
    e.x = f.x;
    e.y = f.y;
    e.aim = f.aim;
    e.moving = f.moving;
    e.facing = Math.cos(f.aim) >= 0 ? 1 : -1;
    e.animT += dt;
    e.cooldown -= dt;
    if (e.muzzle > 0) e.muzzle -= dt;
    if (f.firing && e.cooldown <= 0) {
      e.cooldown = WEAPONS[e.weapon].rate / e.rateMult;
      e.muzzle = 0.06;
      fire(s, e.x, e.y - GUN_Y, e.aim, e.weapon, e.damageMult * 0.8, true, e.mods);
    }
  }

  /* --------------------------------- waves --------------------------------- */
  s.waveTimer -= dt;
  if (s.waveTimer <= 0) {
    if (s.mode === "survival" && s.wave >= 23) {
      // Wave 23 only ends when its final boss is defeated.
      s.waveTimer = 9999;
    } else {
      // wave cleared: hold the fight and open the between-wave armoury
      openShop(s);
      return;
    }
  }

  const alive = s.enemies.reduce((n, e) => n + (e.dying ? 0 : 1), 0);
  const target = targetAlive(s);
  if (s.breather > 0) {
    s.breather -= dt;
  } else {
    s.spawnTimer -= dt;
    if (s.spawnTimer <= 0 && alive < target) {
      // gradual trickle: pressure ramps smoothly instead of dumping a mob on you
      s.spawnTimer = Math.max(0.75, 3.2 - s.wave * 0.075);
      const batch = 1 + Math.floor(s.wave / 12);
      for (let i = 0; i < batch && alive + i < target; i++) spawnEnemy(s);
    }
  }

  /* -------------------------------- bullets -------------------------------- */
  for (let i = s.bullets.length - 1; i >= 0; i--) {
    const b = s.bullets[i]!;
    b.px = b.x;
    b.py = b.y;
    if (b.wobble) {
      // energy rounds weave instead of flying dead straight
      const t = s.time - (b.born ?? 0);
      const n = b.angle + Math.PI / 2;
      const k = Math.cos(t * 16) * b.wobble * 14;
      b.x += Math.cos(n) * k * dt;
      b.y += Math.sin(n) * k * dt;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    // bullets pierce everything, they only die on timeout or at the border
    if (b.life <= 0 || Math.hypot(b.x, b.y) > s.arenaR + 90) {
      s.bullets.splice(i, 1);
      continue;
    }

    // swept collision against nearby cells only — this is what keeps it smooth
    const minX = Math.min(b.px, b.x) - 60;
    const maxX = Math.max(b.px, b.x) + 60;
    const minY = Math.min(b.py, b.y) - 60;
    const maxY = Math.max(b.py, b.y) + 60;
    for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++) {
      for (let cy = Math.floor(minY / CELL); cy <= Math.floor(maxY / CELL); cy++) {
        const bucket = grid.get(cellKey(cx, cy));
        if (!bucket) continue;
        for (const e of bucket) {
          if (e.dying || b.hits.has(e) || e.untargetable) continue;
          if (!sweptHit(b, b.px, b.py, e)) continue;
          b.hits.add(e);
          // Shielder / Gargoyle stone stance: the frontal barrier eats the shot
          if (e.shielded) {
            const face = Math.atan2(p.y - e.y, p.x - e.x) + Math.PI;
            if (Math.cos(b.angle - face) > 0.25) {
              burst(s, b.x, b.y, 5, "#bfe6ff", 200);
              s.sfx.push("hit");
              continue;
            }
          }
          e.hp -= b.damage;
          e.hurt = 0.12;
          const knock = b.knock / Math.max(1, e.radius / 16);
          e.x += Math.cos(b.angle) * knock;
          e.y += Math.sin(b.angle) * knock;
          const color = STATS[e.species].color;
          burst(s, b.x, b.y, b.crit ? 8 : 4, b.crit ? "#ffe066" : color, b.crit ? 240 : 170);
          if (!b.fromEcho) {
            s.hitFlash = 1;
            s.shake = Math.max(s.shake, b.crit ? 3 : 1.2);
          }
          if (b.explosive > 0) explode(s, b.x, b.y, 70 + b.explosive * 22, b.damage * 0.6, e);
          if (b.lifesteal > 0 && !b.fromEcho) {
            p.hp = Math.min(p.maxHp, p.hp + b.damage * b.lifesteal);
          }
          if (e.hp <= 0) killEnemy(s, e);
        }
      }
    }
  }

  /* -------------------------------- pickups -------------------------------- */
  s.lootTimer -= dt;
  if (s.lootTimer <= 0) {
    s.lootTimer = rand(6, 10);
    if (s.pickups.length < 24) scatterLoot(s);
  }

  for (let i = s.pickups.length - 1; i >= 0; i--) {
    const it = s.pickups[i]!;
    it.life -= dt;
    it.bob += dt * 3;
    if (it.life <= 0) {
      s.pickups.splice(i, 1);
      continue;
    }
    if (it.kind === "xp") {
      it.vx = (it.vx ?? 0) * 0.88;
      it.vy = (it.vy ?? 0) * 0.88;
      const dxo = p.x - it.x;
      const dyo = p.y - it.y;
      const dist = Math.hypot(dxo, dyo) || 1;
      if (dist < 240) {
        const pullPower = 620 * (1 - dist / 300);
        it.vx = (it.vx ?? 0) + (dxo / dist) * pullPower * dt * 6;
        it.vy = (it.vy ?? 0) + (dyo / dist) * pullPower * dt * 6;
      }
      it.x += (it.vx ?? 0) * dt;
      it.y += (it.vy ?? 0) * dt;
      if (dist < p.radius + 18) {
        s.pickups.splice(i, 1);
        grantXp(s, it.amount ?? 1);
      }
      continue;
    }
    if (it.kind === "upgrade") {
      // gently drift toward the player so a perk is never missed
      const dxo = p.x - it.x;
      const dyo = p.y - it.y;
      const dist = Math.hypot(dxo, dyo) || 1;
      if (dist < 150) {
        it.x += (dxo / dist) * 90 * dt;
        it.y += (dyo / dist) * 90 * dt;
      }
    }
    if (Math.hypot(p.x - it.x, p.y - it.y) < p.radius + 22) {
      s.pickups.splice(i, 1);
      s.sfx.push("pickup");
      let text = "";
      if (it.kind === "upgrade" && it.upgrade) {
        const u = UPGRADE_MAP[it.upgrade];
        if (u) {
          applyUpgrade(s, it.upgrade);
          text = u.name.toUpperCase();
          s.sfx.push("level");
          burst(s, it.x, it.y, 26, RARITY_COLOR[u.rarity], 260);
          s.popups.push({ x: it.x, y: it.y - 56, life: 1.4, text: u.desc.toUpperCase() });
        }
      } else if (it.kind === "health") {
        p.hp = Math.min(p.maxHp, p.hp + 28);
        text = "+28 HP";
      } else if (it.kind === "weapon" && it.weapon) {
        p.weapon = it.weapon;
        if (!s.arsenal.includes(it.weapon)) s.arsenal.push(it.weapon);
        text = WEAPONS[it.weapon].name.toUpperCase();
      } else if (it.kind === "speed") {
        p.baseSpeed += 14;
        p.speed = p.baseSpeed;
        text = "+SPEED";
      } else if (it.kind === "rate") {
        p.rateMult = Math.min(3, p.rateMult + 0.12);
        text = "+FIRE RATE";
      } else {
        p.damageMult += 0.25;
        text = "+DAMAGE";
      }
      s.popups.push({ x: it.x, y: it.y - 30, life: 1, text });
      burst(s, it.x, it.y, 8, "#ffe9a8", 160);
    }
  }

  /* -------------------------------- enemies -------------------------------- */
  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i]!;
    if (e.dying) {
      e.deathT += dt;
      if (e.deathT > 0.62) s.enemies.splice(i, 1);
      continue;
    }

    let tx = p.x;
    let ty = p.y;
    let best = Math.hypot(p.x - e.x, p.y - e.y);
    let targetEcho: Echo | null = null;
    for (const ec of s.echoes) {
      if (ec.dead) continue;
      const d = Math.hypot(ec.x - e.x, ec.y - e.y);
      if (d < best) {
        best = d;
        tx = ec.x;
        ty = ec.y;
        targetEcho = ec;
      }
    }

    const ang = Math.atan2(ty - e.y, tx - e.x);
    const dist = Math.hypot(tx - e.x, ty - e.y);
    e.animT += dt;
    if (e.hurt > 0) e.hurt -= dt;
    if (e.attackCd > 0) e.attackCd -= dt;
    if (e.buffed > 0) e.buffed -= dt;
    if (e.telegraph > 0) e.telegraph -= dt;
    e.cd -= dt;
    e.cd2 -= dt;
    e.stateT += dt;

    /* ---- behaviour state machine (one branch per blueprint role) ---- */
    // mv: forward speed multiplier, steer: angle offset from "straight at target"
    let mv = 1;
    let steer = 0;
    const boost = (e.buffed > 0 ? 1.28 : 1) * (s.enrageT > 0 ? 1.3 : 1);
    const dmg = e.damage * (e.buffed > 0 ? 1.3 : 1) * (s.enrageT > 0 ? 1.25 : 1);
    e.untargetable = false;

    switch (e.role) {
      case "swarm":
        // tight pack rush with a little jitter so the pack breathes
        steer = Math.sin(s.time * 4 + e.animT * 9) * 0.25;
        mv = 1.05;
        break;

      case "shooter":
      case "splitshot": {
        // hold at range and fire
        mv = dist < 260 ? -0.35 : dist > 340 ? 0.9 : 0;
        if (e.cd <= 0 && dist < 420) {
          e.cd = e.role === "splitshot" ? rand(2.1, 2.9) : rand(1.3, 2);
          if (e.role === "splitshot") {
            enemyShot(s, e, ang, 210, dmg * 0.7, "orb");
            const last = s.ebullets[s.ebullets.length - 1];
            if (last) last.splitIn = 0.45;
          } else {
            enemyShot(s, e, ang, 260, dmg * 0.8);
          }
          s.sfx.push("hit");
        }
        break;
      }

      case "mortar":
        mv = dist < 300 ? -0.3 : 0.7;
        if (e.cd <= 0 && dist < 520) {
          e.cd = rand(2.2, 3.2);
          mortarShot(s, e, tx + rand(-30, 30), ty + rand(-30, 30), dmg);
          dropHazard(s, tx, ty, "shock", 8, 0, 1.2); // ground marker
        }
        break;

      case "dash":
        // long stalk, then a blistering short sprint
        if (e.state === "walk") {
          mv = 0.55;
          if (e.cd <= 0 && dist < 380) {
            e.state = "dash";
            e.stateT = 0;
            e.telegraph = 0.18;
            e.telAng = ang;
          }
        } else {
          mv = 3.4;
          if (e.stateT > 0.55) {
            e.state = "walk";
            e.cd = rand(1.2, 2.2);
          }
        }
        break;

      case "charge":
      case "rhino": {
        const heavy = e.role === "rhino";
        if (e.state === "walk") {
          mv = heavy ? 0.5 : 0.6;
          if (e.cd <= 0 && dist < (heavy ? 520 : 400)) {
            e.state = "wind";
            e.stateT = 0;
            e.telAng = ang;
            e.telegraph = heavy ? 0.9 : 0.7;
          }
        } else if (e.state === "wind") {
          mv = -0.15;
          e.telAng = e.telAng * 0.85 + ang * 0.15;
          if (e.stateT > (heavy ? 0.9 : 0.7)) {
            e.state = "dash";
            e.stateT = 0;
            s.sfx.push("hit");
          }
        } else {
          // committed charge along the marked lane — no steering
          steer = e.telAng - ang;
          mv = heavy ? 4.2 : 3.2;
          if (heavy) dropHazard(s, e.x, e.y, "crater", 26, dmg * 0.3, 0.5);
          if (e.stateT > (heavy ? 1.5 : 1)) {
            e.state = "walk";
            e.cd = rand(1.6, 2.8);
            if (heavy) {
              s.shake = Math.max(s.shake, 12);
              for (let k = 0; k < 5; k++) {
                const a2 = ang + rand(-0.8, 0.8);
                dropHazard(s, e.x + Math.cos(a2) * 90, e.y + Math.sin(a2) * 90, "crater", 48, dmg * 0.5, 1);
              }
            }
          }
        }
        break;
      }

      case "zigzag":
        steer = Math.sin(s.time * 5.5 + e.animT * 3) * 1.15;
        mv = 1.15;
        break;

      case "split":
      case "chase":
        mv = 1;
        break;

      case "healer":
        mv = dist < 300 ? -0.5 : 0.75;
        if (e.cd <= 0) {
          e.cd = 3.4;
          burst(s, e.x, e.y - 12, 16, "#8ef0b8", 220);
          for (const o of s.enemies) {
            if (o === e || o.dying) continue;
            if (Math.hypot(o.x - e.x, o.y - e.y) < 220) {
              o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.18);
              burst(s, o.x, o.y - 12, 4, "#8ef0b8", 140);
            }
          }
        }
        break;

      case "buffer":
      case "hivemind": {
        mv = e.role === "hivemind" ? 0.7 : 0.85;
        if (e.cd <= 0) {
          e.cd = e.role === "hivemind" ? 6 : 2;
          if (e.role === "hivemind") {
            s.enrageT = 4;
            s.popups.push({ x: e.x, y: e.y - 80, life: 1.2, text: "HORDE ENRAGED" });
            burst(s, e.x, e.y - 14, 30, "#ff5f8f", 320);
          } else {
            for (const o of s.enemies) {
              if (o === e || o.dying) continue;
              if (Math.hypot(o.x - e.x, o.y - e.y) < 200) o.buffed = 2.4;
            }
          }
        }
        break;
      }

      case "shield":
        mv = 0.8;
        e.shielded = true;
        break;

      case "spawner":
      case "brood": {
        const nest = e.role === "brood";
        mv = nest ? 0 : 0.55;
        if (e.cd <= 0 && e.spawned < (nest ? 14 : 5)) {
          e.cd = nest ? 1.1 : 3.6;
          e.spawned++;
          spawnMinion(s, e, nest && Math.random() < 0.35 ? "e_imp_crimson" : "e_gnat", nest ? 0.9 : 0.8);
        }
        break;
      }

      case "flee":
        // loot goblin: sprints away, and leaves for good if ignored too long
        mv = dist < 320 ? -1.7 : -0.5;
        steer = 0.5;
        if (e.cd2 <= -18) {
          burst(s, e.x, e.y - 12, 14, "#ffe08a", 240);
          s.enemies.splice(i, 1);
          continue;
        }
        break;

      case "mine":
        mv = 0.9;
        if (e.cd <= 0) {
          e.cd = rand(1.5, 2.4);
          dropHazard(s, e.x, e.y, "mine", 46, dmg * 1.2, 9);
        }
        break;

      case "trail":
        mv = 1;
        if (e.cd <= 0) {
          e.cd = 0.22;
          dropHazard(s, e.x, e.y, "sludge", 30, dmg * 0.35, 4.5);
        }
        break;

      case "leech":
        mv = 1.15;
        break;

      case "burrow":
        if (e.state === "under") {
          e.untargetable = true;
          e.fade = Math.min(1, e.fade + dt * 4);
          mv = 0;
          // travels underground, pops up right under the target
          e.x += (tx - e.x) * Math.min(1, dt * 2.2);
          e.y += (ty - e.y) * Math.min(1, dt * 2.2);
          if (e.stateT > 1.6) {
            e.state = "walk";
            e.stateT = 0;
            e.cd = rand(3.5, 5);
            burst(s, e.x, e.y, 18, "#c8a06a", 260);
            s.shake = Math.max(s.shake, 6);
          }
        } else {
          e.fade = Math.max(0, e.fade - dt * 4);
          mv = 0.8;
          if (e.cd <= 0 && dist > 120) {
            e.state = "under";
            e.stateT = 0;
            burst(s, e.x, e.y, 14, "#c8a06a", 200);
          }
        }
        break;

      case "bomber":
        // accelerates the whole way in and detonates on contact
        mv = 1 + Math.min(1.6, e.animT * 0.12);
        if (dist < 90) e.telegraph = 0.2;
        if (dist < e.radius + 26) {
          killEnemy(s, e);
          continue;
        }
        break;

      case "grapple":
        mv = dist < 340 ? 0 : 0.8;
        if (e.cd <= 0 && dist < 340) {
          e.cd = rand(3, 4.2);
          e.telegraph = 0.35;
          e.telAng = ang;
          // tongue yanks the player back toward the enemy
          const pull = 150;
          p.x += Math.cos(ang) * pull;
          p.y += Math.sin(ang) * pull;
          burst(s, p.x, p.y - 14, 10, "#ff9ad5", 220);
          s.sfx.push("hit");
        }
        break;

      case "cloak":
        if (dist > 170) {
          e.fade = Math.min(0.9, e.fade + dt * 2);
          mv = 1.25;
        } else {
          e.fade = Math.max(0, e.fade - dt * 6);
          mv = 1.5;
        }
        break;

      case "orbit": {
        // circles at a fixed radius and slowly tightens the noose
        const want = 150 + Math.sin(s.time * 0.6 + e.animT) * 40;
        mv = dist > want ? 1 : -0.4;
        steer = Math.PI * 0.42;
        if (e.cd <= 0 && dist < 300) {
          e.cd = 2.4;
          enemyShot(s, e, ang, 200, dmg * 0.6, "spike");
        }
        break;
      }

      case "sapper":
        mv = dist < 300 ? 0 : 0.8;
        if (dist < 320) {
          s.drainT = 0.3;
          e.telegraph = 0.12;
          e.telAng = ang;
        }
        break;

      case "reaper":
        mv = p.hp / p.maxHp < 0.3 ? 1.5 : 1;
        break;

      case "leap":
        if (e.state === "fly") {
          mv = 0;
          e.untargetable = true;
          if (e.stateT > 0.85) {
            e.state = "walk";
            e.stateT = 0;
            e.cd = rand(2.6, 3.6);
            
            e.x += (tx - e.x) * 0.9;
            e.y += (ty - e.y) * 0.9;
            dropHazard(s, e.x, e.y, "crater", 90, dmg, 0.7);
            s.shake = Math.max(s.shake, 12);
            burst(s, e.x, e.y, 22, "#7fd6a0", 320);
          }
        } else {
          mv = 0.85;
          if (e.cd <= 0 && dist < 420) {
            e.state = "fly";
            e.stateT = 0;
            e.telegraph = 0.85;
            burst(s, e.x, e.y, 10, "#7fd6a0", 200);
          }
        }
        break;

      case "spiral":
        mv = dist < 260 ? 0 : 0.55;
        if (e.cd <= 0) {
          e.cd = 0.13;
          e.telAng += 0.42;
          enemyShot(s, e, e.telAng, 175, dmg * 0.5, "orb");
        }
        break;

      case "gargoyle":
        if (e.state === "armor") {
          e.shielded = true;
          mv = 0.35;
          if (e.stateT > 3.4) {
            e.state = "fly";
            e.stateT = 0;
            e.shielded = false;
          }
        } else {
          e.shielded = false;
          mv = 1.9;
          if (e.stateT > 2.6) {
            e.state = "armor";
            e.stateT = 0;
            burst(s, e.x, e.y - 12, 12, "#9fb6c8", 200);
          }
        }
        break;

      case "teleport":
        mv = 0.9;
        if (e.cd <= 0 && dist > 140) {
          e.cd = rand(3.2, 4.6);
          burst(s, e.x, e.y - 12, 14, "#b28cff", 240);
          // reappears behind the player's back
          const back = p.aim + Math.PI + rand(-0.4, 0.4);
          e.x = p.x + Math.cos(back) * 70;
          e.y = p.y + Math.sin(back) * 70;
          burst(s, e.x, e.y - 12, 14, "#b28cff", 240);
          s.sfx.push("hit");
        }
        break;

      case "hydra":
        mv = 1;
        if (!e.didSplit && !e.minion && e.hp < e.maxHp * 0.5) {
          e.didSplit = true;
          for (let k = 0; k < 2; k++) {
            const c = spawnMinion(s, e, "e_imp_violet", 0.55);
            c.didSplit = true;
          }
          
          s.popups.push({ x: e.x, y: e.y - 80, life: 1.1, text: "HYDRA SPLITS" });
        }
        break;

      case "siren":
        mv = dist < 300 ? -0.4 : 0.7;
        if (e.cd <= 0 && dist < 380) {
          e.cd = 5.5;
          s.invertT = 2.4;
          burst(s, e.x, e.y - 14, 24, "#7ce7ff", 300);
          s.popups.push({ x: p.x, y: p.y - 80, life: 1.4, text: "CONTROLS INVERTED" });
        }
        break;

      case "colossus":
        mv = 0.45;
        // continuous sweeping heat ray
        e.telAng += dt * 1.1;
        e.telegraph = 0.2;
        if (e.cd <= 0) {
          e.cd = 0.08;
          enemyShot(s, e, e.telAng, 320, dmg * 0.35, "bolt");
        }
        break;

      case "titan":
        mv = 0.5;
        if (e.cd <= 0) {
          e.cd = 3.6;
          s.shake = Math.max(s.shake, 14);
          for (let k = 0; k < 4; k++) {
            const a2 = (k / 4) * Math.PI * 2 + e.animT;
            for (let r = 60; r <= 260; r += 65) {
              dropHazard(s, e.x + Math.cos(a2) * r, e.y + Math.sin(a2) * r, "shock", 46, dmg * 0.8, 0.9);
            }
          }
        }
        break;

      default:
        mv = 1;
    }

    const moveAng = ang + steer;
    const stepSpd = e.speed * boost * mv;
    e.x += Math.cos(moveAng) * stepSpd * dt;
    e.y += Math.sin(moveAng) * stepSpd * dt;
    // walk cycle advances with distance travelled, so big slow enemies lumber
    // and small fast ones scurry without ever looking like they slide
    e.moveSpd = stepSpd;
    e.gaitT = (e.gaitT ?? Math.random()) + (stepSpd / Math.max(18, e.radius * 3.4)) * dt;
    e.facing = tx < e.x ? -1 : 1;


    // separation against neighbours in the same grid cell only (cheap + spreads them)
    const bucket = grid.get(cellKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL)));
    if (bucket) {
      for (const o of bucket) {
        if (o === e || o.dying) continue;
        const ox = e.x - o.x;
        const oy = e.y - o.y;
        const d = Math.hypot(ox, oy);
        const min = (e.radius + o.radius) * 1.15;
        if (d > 0.001 && d < min) {
          const push = (min - d) / 2;
          e.x += (ox / d) * push;
          e.y += (oy / d) * push;
          o.x -= (ox / d) * push;
          o.y -= (oy / d) * push;
        }
      }
    }

    // zombies stay inside the arena too
    clampArena(e, 12);

    // contact damage — echoes can be mauled, but the player is ALWAYS in danger
    if (
      targetEcho &&
      e.attackCd <= 0 &&
      !targetEcho.dead &&
      Math.hypot(targetEcho.x - e.x, targetEcho.y - e.y) < e.radius + 20
    ) {
      e.attackCd = 0.55;
      targetEcho.hp -= e.damage;
      burst(s, targetEcho.x, targetEcho.y - 14, 6, "#9fd8ff", 180);
      if (targetEcho.hp <= 0 && !targetEcho.dead) {
        targetEcho.dead = true;
        burst(s, targetEcho.x, targetEcho.y - 18, 18, "#9fd8ff", 260);
      }
    }

    if (!e.untargetable && Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius + 4) {
      // Reaper executes wounded prey; Leech drinks what it deals
      const low = p.hp / p.maxHp < 0.3;
      const contact = e.role === "reaper" && low ? dmg * 2 : dmg;
      if (hurtPlayer(s, contact)) {
        if (e.role === "leech") {
          e.hp = Math.min(e.maxHp, e.hp + contact * 2);
          burst(s, e.x, e.y - 12, 6, "#ff6f9c", 160);
        }
        if (e.role === "bomber") killEnemy(s, e);
      }
    }
  }

  /* ----------------------------- enemy projectiles ---------------------------- */
  for (let i = s.ebullets.length - 1; i >= 0; i--) {
    const b = s.ebullets[i]!;
    b.life -= dt;
    if (b.kind === "mortar") {
      // parabolic arc onto the marked impact point
      b.arcT = (b.arcT ?? 0) + dt;
      const t = Math.min(1, b.arcT / (b.arcMax ?? 1));
      b.x = b.x + ((b.tx ?? b.x) - b.x) * Math.min(1, dt / Math.max(0.05, (b.arcMax ?? 1) - b.arcT));
      b.y = b.y + ((b.ty ?? b.y) - b.y) * Math.min(1, dt / Math.max(0.05, (b.arcMax ?? 1) - b.arcT));
      if (t >= 1) {
        dropHazard(s, b.tx ?? b.x, b.ty ?? b.y, "shock", 62, b.damage, 0.55);
        burst(s, b.x, b.y, 16, b.color, 280);
        s.ebullets.splice(i, 1);
        continue;
      }
    } else {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.splitIn !== undefined) {
        b.splitIn -= dt;
        if (b.splitIn <= 0) {
          const base = Math.atan2(b.vy, b.vx);
          const sp = Math.hypot(b.vx, b.vy);
          for (let k = -1; k <= 1; k++) {
            if (s.ebullets.length > 220) break;
            const a2 = base + k * 0.32;
            s.ebullets.push({
              x: b.x,
              y: b.y,
              vx: Math.cos(a2) * sp,
              vy: Math.sin(a2) * sp,
              radius: 6,
              life: 2.4,
              damage: b.damage,
              color: b.color,
              kind: "bolt",
            });
          }
          burst(s, b.x, b.y, 6, b.color, 160);
          s.ebullets.splice(i, 1);
          continue;
        }
      }
      if (Math.hypot(p.x - b.x, p.y - BODY_Y - b.y) < p.radius + b.radius) {
        hurtPlayer(s, b.damage, 0.3);
        burst(s, b.x, b.y, 8, b.color, 200);
        s.ebullets.splice(i, 1);
        continue;
      }
    }
    if (b.life <= 0 || Math.hypot(b.x, b.y) > s.arenaR + 60) s.ebullets.splice(i, 1);
  }

  /* -------------------------------- hazards --------------------------------- */
  for (let i = s.hazards.length - 1; i >= 0; i--) {
    const h = s.hazards[i]!;
    h.life -= dt;
    if (h.arm > 0) h.arm -= dt;
    const near = Math.hypot(p.x - h.x, p.y - h.y) < h.radius + p.radius;
    if (h.damage > 0 && near && h.arm <= 0) {
      if (h.kind === "mine") {
        hurtPlayer(s, h.damage, 0.5);
        explode(s, h.x, h.y, h.radius + 20, h.damage, s.enemies[0] ?? ({} as Enemy));
        s.hazards.splice(i, 1);
        continue;
      }
      if (h.kind === "sludge") {
        // slows and chips instead of a burst hit
        p.speed = Math.max(p.baseSpeed * 0.55, p.speed - 400 * dt);
        hurtPlayer(s, h.damage * dt * 6, 0.12);
      } else {
        hurtPlayer(s, h.damage, 0.4);
      }
    }
    if (h.life <= 0) s.hazards.splice(i, 1);
  }
}


/* ---------------------------------- render ---------------------------------- */

function drawFrame(
  ctx: CanvasRenderingContext2D,
  strip: Strip,
  frame: number,
  x: number,
  y: number,
  height: number,
  flip = false,
  tint?: string,
) {
  const img = strip.img;
  if (!img.width) return;
  const src = tint ? tinted(img, tint, 0.85) : img;
  const fw = img.width / strip.frames;
  const fh = img.height;
  const h = height;
  const w = h * (fw / fh);
  const i = Math.max(0, Math.min(strip.frames - 1, Math.floor(frame)));
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(src, i * fw, 0, fw, fh, -w / 2, -h, w, h);
  ctx.restore();
}

function drawImageCentered(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  w0: number,
  h0: number,
  x: number,
  y: number,
  height: number,
  rot = 0,
  alpha = 1,
) {
  if (!w0) return;
  const w = height * (w0 / h0);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -height / 2, w, height);
  ctx.restore();
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number) {
  ctx.save();
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = "#0d0b14";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const LEGACY_GUN_SPRITES = new Set(["gun", "gunRifle", "gunPistol", "gunShotgun"]);

function gunImage(sprites: Sprites, weapon: WeaponKey) {
  const w = WEAPONS[weapon];
  const key = w.sprite as string;
  const own = sprites.singles[key];
  const img = own && own.width ? own : sprites.singles.gun;
  const legacy = LEGACY_GUN_SPRITES.has(key) || img === sprites.singles.gun;
  // Pack art is already fully coloured — only tint the plain legacy silhouettes.
  if (legacy) return { img: tinted(img, w.color, 0.62), w: img.width, h: img.height };
  // Pack art often ships as an animation strip with big transparent margins and
  // near-black pixels; slice out the first frame, tint it towards the weapon
  // colour and rim it so the gun stays visible on the dark arena floor.
  return visibleFrame(img, w.color);
}



function drawGun(
  ctx: CanvasRenderingContext2D,
  sprites: Sprites,
  weapon: WeaponKey,
  x: number,
  y: number,
  aim: number,
  facing: 1 | -1,
  recoil: number,
  muzzle: boolean,
) {
  const g = gunImage(sprites, weapon);
  if (!g.w || !g.h) return;
  const w = WEAPONS[weapon];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(aim);
  if (facing === -1) ctx.scale(1, -1);
  // grip sits just in front of the chest so the weapon reads as held, not worn
  ctx.translate(9, 2);
  const maxLen = w.archetype === "pistol" ? 54 : 86;
  let gunH = w.archetype === "pistol" ? 36 : 46;
  let gunW = gunH * (g.w / g.h);
  if (gunW > maxLen) {
    gunH *= maxLen / gunW;
    gunW = maxLen;
  }
  const gx = -gunW * 0.26 - recoil;
  const gy = -gunH / 2;

  // forward arm + fist so the weapon is visibly held
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(16,12,22,0.9)";
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(-15, 4);
  ctx.lineTo(gunW * 0.12, 3);
  ctx.stroke();
  ctx.strokeStyle = "#e6b285";
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(-15, 4);
  ctx.lineTo(gunW * 0.12, 3);
  ctx.stroke();
  // fist wrapped around the grip
  ctx.fillStyle = "#2b2130";
  ctx.beginPath();
  ctx.arc(gunW * 0.12, 3, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // dark rim + weapon-colour glow keeps the silhouette readable on the dark
  // arena floor (most pack sprites are near-black otherwise)
  ctx.save();
  ctx.shadowColor = "rgba(6,5,10,0.95)";
  ctx.shadowBlur = 6;
  ctx.drawImage(g.img, gx, gy, gunW, gunH);
  ctx.drawImage(g.img, gx, gy, gunW, gunH);
  ctx.shadowColor = `${w.color}`;
  ctx.shadowBlur = 14;
  ctx.drawImage(g.img, gx, gy, gunW, gunH);
  ctx.drawImage(g.img, gx, gy, gunW, gunH);
  ctx.restore();

  // bright barrel highlight so the gun pops out of the character silhouette
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(g.img, gx, gy, gunW, gunH);
  ctx.restore();


  if (muzzle) {
    const m = sprites.singles.muzzle;
    drawImageCentered(ctx, m, m.width, m.height, gunW * 0.7 - recoil, 0, 34, Math.PI);
  }
  ctx.restore();
}

function drawPickup(ctx: CanvasRenderingContext2D, sprites: Sprites, it: Pickup, time: number) {
  if (it.kind === "xp") {
    const yy = it.y - 14 - Math.sin(it.bob * 2) * 3;
    ctx.save();

    ctx.fillStyle = "#7cf2c8";
    ctx.beginPath();
    ctx.moveTo(it.x, yy - 8);
    ctx.lineTo(it.x + 6, yy);
    ctx.lineTo(it.x, yy + 8);
    ctx.lineTo(it.x - 6, yy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }
  const y = it.y - 18 - Math.sin(it.bob) * 4;
  const blink = it.life < 4 && Math.floor(time * 8) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;
  drawShadow(ctx, it.x, it.y, 14);

  if (it.kind === "weapon" && it.weapon) {
    const g = gunImage(sprites, it.weapon);
    ctx.save();
    ctx.globalAlpha *= 0.9;
    ctx.fillStyle = "rgba(20,18,32,0.75)";
    ctx.strokeStyle = WEAPONS[it.weapon].color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(it.x - 26, y - 18, 52, 34, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (g.w) drawImageCentered(ctx, g.img, g.w, g.h, it.x, y, 20);
  } else if (it.kind === "upgrade" && it.upgrade) {
    const u = UPGRADE_MAP[it.upgrade];
    const col = u ? RARITY_COLOR[u.rarity] : "#ffd166";
    const pulse = 0.5 + 0.5 * Math.sin(time * 4 + it.bob);
    ctx.save();
    // ground glow
    const grd = ctx.createRadialGradient(it.x, y, 2, it.x, y, 54);
    grd.addColorStop(0, col);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.22 + pulse * 0.16;
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(it.x, y, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // rotating rarity ring
    ctx.translate(it.x, y);
    ctx.rotate(time * 0.9);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5 + pulse * 0.4;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, 24 + pulse * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(-time * 0.9);
    // crystal body
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(16,14,26,0.92)";
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(15, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(-15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = "800 15px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(u?.icon ?? "★", 0, 1);
    ctx.restore();
    // label
    if (u) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = col;
      ctx.font = "800 10px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(u.name.toUpperCase(), it.x, y - 32);
      ctx.restore();
    }
  } else {
    const colors: Record<string, string> = {
      health: "#ff5f7e",
      speed: "#6ff0ff",
      rate: "#ffd166",
      damage: "#ff9f4d",
    };
    const col = colors[it.kind] ?? "#fff";
    ctx.save();

    ctx.fillStyle = "rgba(18,16,28,0.85)";
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(it.x - 15, y - 15, 30, 30, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col;
    if (it.kind === "health") {
      ctx.fillRect(it.x - 8, y - 3, 16, 6);
      ctx.fillRect(it.x - 3, y - 8, 6, 16);
    } else {
      ctx.font = "800 15px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(it.kind === "speed" ? "»" : it.kind === "rate" ? "⚡" : "✦", it.x, y + 1);
    }
    ctx.restore();
  }
  ctx.restore();
}

/** Deployed turret / mine. */
function drawTurret(
  ctx: CanvasRenderingContext2D,
  sprites: Sprites,
  t: Turret,
  time: number,
) {
  drawShadow(ctx, t.x, t.y, t.kind === "mine" ? 12 : 20);
  if (t.kind === "mine") {
    const armed = !t.arm || t.arm <= 0;
    const pulse = 0.5 + 0.5 * Math.sin(time * (armed ? 9 : 3));
    ctx.save();
    ctx.fillStyle = "#2a2434";
    ctx.beginPath();
    ctx.ellipse(t.x, t.y, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = armed ? "#ff9a5c" : "#7a6a55";
    ctx.globalAlpha = 0.4 + pulse * 0.6;
    ctx.beginPath();
    ctx.arc(t.x, t.y - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const fade = t.life < 2.5 && Math.floor(time * 8) % 2 === 0 ? 0.45 : 1;
  ctx.save();
  ctx.globalAlpha = fade;
  // base
  ctx.fillStyle = "#241f31";
  ctx.strokeStyle = "#8fd6ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(t.x, t.y, 20, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // post + gun
  ctx.fillStyle = "#3a3350";
  ctx.fillRect(t.x - 5, t.y - 20, 10, 18);
  drawGun(ctx, sprites, t.weapon, t.x, t.y - 24, t.aim, Math.cos(t.aim) >= 0 ? 1 : -1, 0, t.muzzle > 0);
  // health pip
  const hp = Math.max(0, t.hp / t.maxHp);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(t.x - 16, t.y - 36, 32, 4);
  ctx.fillStyle = "#8fd6ff";
  ctx.fillRect(t.x - 16, t.y - 36, 32 * hp, 4);
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, s: GameState, sprites: Sprites, time: number) {
  const p = s.player;
  const cam = s.cam;
  const wrap = (v: number, center: number, span: number) =>
    v + Math.round((center - v) / span) * span;

  ctx.save();
  if (s.shake > 0.2) {
    ctx.translate(rand(-s.shake, s.shake) * 0.5, rand(-s.shake, s.shake) * 0.5);
  }
  if (s.kick > 0.1) {
    // camera recoils opposite the shot direction
    ctx.translate(-Math.cos(s.kickAng) * s.kick * 0.45, -Math.sin(s.kickAng) * s.kick * 0.45);
  }

  // void beyond the arena
  ctx.fillStyle = "#07070d";
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // ground — pixel tileset mosaic, clipped to the rugged arena shape
  const floor = floorMosaic(sprites, s.floor);
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  ctx.beginPath();
  ruggedPath(ctx);
  ctx.clip();
  const tw = floor.width;
  const th = floor.height;
  const startX = Math.floor(-ARENA_HW / tw) * tw;
  const startY = Math.floor(-ARENA_HH / th) * th;
  for (let x = startX; x < ARENA_HW + tw; x += tw) {
    for (let y = startY; y < ARENA_HH + th; y += th) {
      ctx.drawImage(floor, x, y, tw, th);
    }
  }
  // soft vignette inside the walls so the edge reads as sunken stone
  const vg = ctx.createLinearGradient(0, -ARENA_HH, 0, ARENA_HH);
  vg.addColorStop(0, "rgba(0,0,0,0.22)");
  vg.addColorStop(0.18, "rgba(0,0,0,0)");
  vg.addColorStop(0.82, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = vg;
  ctx.fillRect(-ARENA_HW, -ARENA_HH, ARENA_HW * 2, ARENA_HH * 2);
  ctx.restore();

  // everything below scrolls with the camera
  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  /* --------------------------- rugged arena edge ---------------------------- */
  ctx.save();
  ctx.beginPath();
  ruggedPath(ctx);
  ctx.lineJoin = "round";
  ctx.lineWidth = 16;
  ctx.strokeStyle = "#15121d";
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#3b3450";
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(180,205,255,0.35)";
  ctx.stroke();
  ctx.restore();


  // arena furniture decals — panels, lane chevrons, vents and inset lights
  const accent = floorSectorColor(s.floor);
  for (const d of s.decor) {
    if (d.kind === "rock1" || d.kind === "rock2" || d.kind === "rock3" || d.kind === "crystal")
      continue;
    const dx = wrap(d.x, cam.x + WORLD_W / 2, WORLD_W);
    const dy = wrap(d.y, cam.y + WORLD_H / 2, WORLD_H);
    ctx.save();
    ctx.translate(dx, dy);
    if (d.kind === "panel") {
      // painted deck panel: filled pad, bright outline, corner registration ticks
      const w = 210 * d.scale;
      const h = 130 * d.scale;
      ctx.rotate(d.rot);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 14);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 5;
      const tick = 22 * d.scale;
      for (const [sx2, sy2] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as [number, number][]) {
        ctx.beginPath();
        ctx.moveTo((sx2 * w) / 2 - sx2 * tick, (sy2 * h) / 2);
        ctx.lineTo((sx2 * w) / 2, (sy2 * h) / 2);
        ctx.lineTo((sx2 * w) / 2, (sy2 * h) / 2 - sy2 * tick);
        ctx.stroke();
      }
    } else if (d.kind === "chevron") {
      // hazard chevron pointing outward along a lane
      ctx.rotate(d.rot);
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 8;
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      ctx.beginPath();
      ctx.moveTo(-22, -26);
      ctx.lineTo(14, 0);
      ctx.lineTo(-22, 26);
      ctx.stroke();
    } else if (d.kind === "vent") {
      // recessed grate: dark well with louvre bars and a rim
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "rgba(6,8,14,0.72)";
      ctx.beginPath();
      ctx.arc(0, 0, 34 * d.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 4;
      for (let i = -2; i <= 2; i++) {
        const off = i * 11 * d.scale;
        const half = Math.sqrt(Math.max(0, (30 * d.scale) ** 2 - off ** 2));
        ctx.beginPath();
        ctx.moveTo(-half, off);
        ctx.lineTo(half, off);
        ctx.stroke();
      }
    } else if (d.kind === "stud") {
      // inset perimeter light, breathing slowly
      const glow = 0.45 + Math.sin(time * 2 + d.rot * 3) * 0.2;
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
      halo.addColorStop(0, `rgba(150,225,255,${(0.3 * glow).toFixed(3)})`);
      halo.addColorStop(1, "rgba(150,225,255,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(-26, -26, 52, 52);
      ctx.fillStyle = `rgba(210,245,255,${(0.5 + glow * 0.4).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // sector gate glyph etched into the deck
      ctx.globalAlpha = 0.26 + Math.sin(time * 1.6 + d.x) * 0.05;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.rotate(d.rot);
      ctx.beginPath();
      ctx.arc(0, 0, 46 * d.scale, -Math.PI * 0.62, Math.PI * 0.62);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 30 * d.scale, Math.PI * 0.4, Math.PI * 1.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  // pickups sit on the ground under the actors
  for (const it of s.pickups) drawPickup(ctx, sprites, it, time);

  // stone blocks
  const props = s.decor.filter(
    (d) => d.kind === "rock1" || d.kind === "rock2" || d.kind === "rock3",
  );
  props.sort((a, b) => a.y - b.y);
  for (const d of props) {
    const img = sprites.singles[d.kind as "rock1" | "rock2" | "rock3"];
    const h = 80 * d.scale;
    const dx = wrap(d.x, cam.x + WORLD_W / 2, WORLD_W);
    const dy = wrap(d.y, cam.y + WORLD_H / 2, WORLD_H);
    drawShadow(ctx, dx, dy, h * 0.28);
    if (img && img.width) {
      const w = h * (img.width / img.height);
      ctx.drawImage(img, dx - w / 2, dy - h, w, h);
    }
  }

  // glowing crystal clusters: chunky faceted shards with a bloom halo
  for (const d of s.decor) {
    if (d.kind !== "crystal") continue;
    const dx = wrap(d.x, cam.x + WORLD_W / 2, WORLD_W);
    const dy = wrap(d.y, cam.y + WORLD_H / 2, WORLD_H);
    const glow = 0.5 + Math.sin(time * 1.8 + d.x * 0.03) * 0.18;
    ctx.save();
    ctx.translate(dx, dy);
    drawShadow(ctx, 0, 0, 20 * d.scale);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const halo = ctx.createRadialGradient(0, -18 * d.scale, 0, 0, -18 * d.scale, 68 * d.scale);
    halo.addColorStop(0, `rgba(130,220,255,${(0.22 * glow).toFixed(3)})`);
    halo.addColorStop(1, "rgba(130,220,255,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(-70 * d.scale, -90 * d.scale, 140 * d.scale, 140 * d.scale);
    ctx.restore();
    const shards: [number, number, number][] = [
      [-13, 34, 0.8],
      [0, 54, 1],
      [12, 30, 0.7],
    ];
    for (const [ox, hh, w] of shards) {
      const sh = hh * d.scale;
      const sw = 9 * w * d.scale;
      const x = ox * d.scale;
      ctx.beginPath();
      ctx.moveTo(x, -sh);
      ctx.lineTo(x + sw, -sh * 0.42);
      ctx.lineTo(x + sw * 0.6, 0);
      ctx.lineTo(x - sw * 0.6, 0);
      ctx.lineTo(x - sw, -sh * 0.42);
      ctx.closePath();
      const grad = ctx.createLinearGradient(x - sw, 0, x + sw, -sh);
      grad.addColorStop(0, "#1b4f6e");
      grad.addColorStop(0.55, `rgba(96,200,247,${(0.85 * glow + 0.15).toFixed(3)})`);
      grad.addColorStop(1, "#d8f6ff");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "rgba(8,16,26,0.85)";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, -sh);
      ctx.lineTo(x, 0);
      ctx.strokeStyle = "rgba(226,250,255,0.35)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  }




  const drawEnemy = (e: Enemy) => {
    const st = STATS[e.species];
    const h = st.height * e.scale;
    const strips = sprites.strips[st.sprite];
    if (e.dying) {
      const strip = strips.death;
      const k = Math.min(1, e.deathT / 0.62);
      const f = k * strip.frames;
      // death squash + a short white blow-out on the first beat
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - k * 0.9);
      drawFrame(ctx, strip, f, e.x, e.y, h, e.facing === -1);
      if (k < 0.22) {
        ctx.globalAlpha = (1 - k / 0.22) * 0.75;
        drawFrame(ctx, strip, f, e.x, e.y, h, e.facing === -1, "#ffffff");
      }
      ctx.restore();
      return;
    }
    const moving = (e.moveSpd ?? 0) > 6 && e.state !== "wind" && e.state !== "under";
    const strip = moving ? strips.walk : strips.idle;

    // ---- burrow mound / cloak shimmer: enemy is fully or partly out of phase
    if (e.fade > 0.05) {
      ctx.save();
      ctx.globalAlpha = 0.35 * e.fade;
      ctx.fillStyle = st.color;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, e.radius * (1 + e.fade * 0.3), e.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ---- charge / leap / beam telegraph drawn on the floor
    if (e.telegraph > 0) {
      ctx.save();
      ctx.globalAlpha = 0.22 + Math.sin(time * 26) * 0.12;
      ctx.fillStyle = e.role === "sapper" ? "#7ce7ff" : "#ff6b5c";
      const reach = e.role === "colossus" ? 460 : 320;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - 6);
      ctx.lineTo(e.x + Math.cos(e.telAng - 0.11) * reach, e.y + Math.sin(e.telAng - 0.11) * reach);
      ctx.lineTo(e.x + Math.cos(e.telAng + 0.11) * reach, e.y + Math.sin(e.telAng + 0.11) * reach);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (e.aura) {
      ctx.save();
      ctx.globalAlpha = 0.28 + Math.sin(time * 3 + e.animT * 5) * 0.08;
      ctx.fillStyle = e.aura;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, e.radius * 1.5, e.radius * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ---- buff / enrage ring pulsing under boosted aliens
    if (e.buffed > 0 || s.enrageT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(time * 9 + e.animT * 4) * 0.15;
      ctx.strokeStyle = e.buffed > 0 ? "#ffd166" : "#ff5f8f";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, e.radius * 1.35, e.radius * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawShadow(ctx, e.x, e.y, e.radius * 0.95);

    // wind-up crouch / dash stretch read straight off the state machine
    const windK = e.state === "wind" ? Math.min(1, e.stateT * 4) : 0;
    const dashK = e.state === "dash" ? 1 : 0;
    const hurtK = Math.max(0, Math.min(1, e.hurt / 0.18));
    const sx = 1 + windK * 0.1 + dashK * 0.08 + hurtK * 0.07;
    const sy = 1 - windK * 0.12 + dashK * 0.06 - hurtK * 0.06;

    const frame = moving
      ? ((e.gaitT ?? e.animT) * strip.frames) % strip.frames
      : (e.animT * 4.5) % strip.frames;

    ctx.save();
    ctx.globalAlpha = Math.max(0.08, 1 - e.fade);
    ctx.translate(e.x, e.y);
    ctx.scale(sx, sy);
    drawFrame(ctx, strip, frame, 0, 0, h, e.facing === -1);
    if (hurtK > 0.01) {
      // hit flash: silhouette-matched white pop instead of a washed-out blend
      ctx.globalAlpha = hurtK * 0.85 * Math.max(0.08, 1 - e.fade);
      drawFrame(ctx, strip, frame, 0, 0, h, e.facing === -1, "#ffffff");
    }
    ctx.restore();

    // ---- frontal energy barrier
    if (e.shielded && e.fade < 0.5) {
      const face = Math.atan2(p.y - e.y, p.x - e.x);
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(time * 5) * 0.12;
      ctx.strokeStyle = "#bfe6ff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(e.x, e.y - h * 0.45, e.radius * 1.5, face - 0.9, face + 0.9);
      ctx.stroke();
      ctx.restore();
    }


    if (e.elite) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.font = "bold 11px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillStyle = e.aura ?? "#ffd166";
      ctx.fillText(e.name.toUpperCase(), e.x, e.y - h - 20);
      ctx.restore();
    }

    // health bar for the big ones
    if ((e.maxHp >= 20 || e.elite) && e.hp < e.maxHp) {
      const w = e.radius * 2.2;
      ctx.save();
      ctx.fillStyle = "rgba(10,8,16,0.8)";
      ctx.fillRect(e.x - w / 2, e.y - h - 12, w, 6);
      ctx.fillStyle = e.aura ?? st.color;
      ctx.fillRect(e.x - w / 2, e.y - h - 12, (w * e.hp) / e.maxHp, 6);
      ctx.restore();
    }
  };

  const drawEcho = (e: Echo) => {
    const alpha = e.dead ? Math.max(0, 1 - e.fading / 0.7) * 0.6 : 0.55;
    ctx.save();
    ctx.globalAlpha = alpha;
    drawShadow(ctx, e.x, e.y, 16);
    const strips = sprites.playerSkins[e.character] ?? sprites.playerSkins["spike"]!;
    const strip = e.moving ? strips.walk : strips.idle;
    const glitch = e.dead ? rand(-4, 4) : 0;
    drawFrame(
      ctx,
      strip,
      (e.animT * (e.moving ? 8 : 6)) % strip.frames,
      e.x + glitch,
      e.y,
      200,
      e.facing === -1,
      "#6fd0ff",
    );
    if (!e.dead) {
      drawGun(ctx, sprites, e.weapon, e.x, e.y - GUN_Y, e.aim, e.facing, 0, e.muzzle > 0);
      // echo hp bar
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "rgba(10,8,16,0.8)";
      ctx.fillRect(e.x - 22, e.y - 104, 44, 5);
      ctx.fillStyle = "#6fd0ff";
      ctx.fillRect(e.x - 22, e.y - 104, (44 * Math.max(0, e.hp)) / e.maxHp, 5);
    }
    ctx.restore();
  };

  // floor hazards drawn beneath every actor
  for (const hz of s.hazards) {
    const t = Math.max(0, Math.min(1, hz.life / hz.maxLife));
    ctx.save();
    if (hz.kind === "mine") {
      ctx.globalAlpha = hz.arm > 0 ? 0.35 : 0.55 + Math.sin(time * 12) * 0.2;
      ctx.strokeStyle = "#ff6b5c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(hz.x, hz.y, hz.radius, hz.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#ff6b5c";
      ctx.beginPath();
      ctx.arc(hz.x, hz.y - 4, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (hz.kind === "sludge") {
      ctx.globalAlpha = 0.34 * t;
      ctx.fillStyle = "#8ef06a";
      ctx.beginPath();
      ctx.ellipse(hz.x, hz.y, hz.radius, hz.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (hz.kind === "shock") {
      ctx.globalAlpha = 0.5 * t + 0.2;
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(hz.x, hz.y, hz.radius * (1.25 - t), hz.radius * 0.5 * (1.25 - t), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.4 * t;
      ctx.fillStyle = "#c8a06a";
      ctx.beginPath();
      ctx.ellipse(hz.x, hz.y, hz.radius * (1.2 - t * 0.2), hz.radius * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // deployed gear sits on the floor under the fight
  for (const t of s.turrets) drawTurret(ctx, sprites, t, time);

  const actors = [...s.enemies].sort((a, b) => a.y - b.y);
  for (const e of actors) if (e.y <= p.y) drawEnemy(e);
  for (const e of s.echoes) if (e.y <= p.y) drawEcho(e);

  // player
  drawShadow(ctx, p.x, p.y, p.radius);
  ctx.save();
  if (p.invuln > 0 && Math.floor(time * 20) % 2 === 0) ctx.globalAlpha = 0.45;
  const pAnim: AnimKey = s.over ? "death" : p.moving ? "walk" : "idle";
  const pStrip = (sprites.playerSkins[p.character] ?? sprites.playerSkins["spike"]!)[pAnim];
  drawFrame(
    ctx,
    pStrip,
    (p.animT * (p.moving ? 8 : 6)) % pStrip.frames,
    p.x,
    p.y,
    212,
    p.facing === -1,
  );

  if (!s.over) {
    const rate = WEAPONS[p.weapon].rate / p.rateMult;
    const recoil = Math.max(0, s.fireCooldown / rate - 0.55) * 10;
    drawGun(ctx, sprites, p.weapon, p.x, p.y - GUN_Y, p.aim, p.facing, recoil, s.muzzle > 0);
  }
  ctx.restore();


  for (const e of s.echoes) if (e.y > p.y) drawEcho(e);
  for (const e of actors) if (e.y > p.y) drawEnemy(e);

  // bullets — each weapon visual gets a distinct rendering style
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const b of s.bullets) {
    ctx.save();
    ctx.globalAlpha = b.fromEcho ? 0.6 : 1;
    const tail = Math.min(90, Math.hypot(b.vx, b.vy) * 0.075);
    const tx = b.x - Math.cos(b.angle) * tail;
    const ty = b.y - Math.sin(b.angle) * tail;

    switch (b.visual) {
      case "tracer": {
        // Smooth tapered tracer with gradient tail
        const trail = ctx.createLinearGradient(tx, ty, b.x, b.y);
        trail.addColorStop(0, "rgba(255,255,255,0)");
        trail.addColorStop(0.6, b.color2);
        trail.addColorStop(1, b.color);
        ctx.strokeStyle = trail;
        ctx.lineCap = "round";
        ctx.lineWidth = b.radius * 1.7;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha *= 0.9;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "bolt": {
        // Chunky shotgun-style pellet with bright halo
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha *= 0.85;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "orb": {
        // Pulsing energy orb with outer ring
        const pulse = 1 + Math.sin(time * 18) * 0.15;
        const r = b.radius * pulse;
        const outerGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 2.5);
        outerGrad.addColorStop(0, b.color);
        outerGrad.addColorStop(0.4, b.color2);
        outerGrad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha *= 0.95;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "beam": {
        // Long laser beam with bright center
        const beamLen = Math.min(120, Math.hypot(b.vx, b.vy) * 0.1);
        const bx2 = b.x - Math.cos(b.angle) * beamLen;
        const by2 = b.y - Math.sin(b.angle) * beamLen;
        ctx.strokeStyle = b.color2;
        ctx.lineCap = "round";
        ctx.lineWidth = b.radius * 3;
        ctx.globalAlpha *= 0.3;
        ctx.beginPath();
        ctx.moveTo(bx2, by2);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.radius * 1.2;
        ctx.globalAlpha = b.fromEcho ? 0.6 : 1;
        ctx.beginPath();
        ctx.moveTo(bx2, by2);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.lineWidth = b.radius * 0.4;
        ctx.globalAlpha *= 0.8;
        ctx.beginPath();
        ctx.moveTo(bx2, by2);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        break;
      }
      case "arrow": {
        // Crossbow bolt — sharp diamond shape with bone-white
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.moveTo(b.radius * 3, 0);
        ctx.lineTo(-b.radius * 1.5, -b.radius * 0.8);
        ctx.lineTo(-b.radius * 0.5, 0);
        ctx.lineTo(-b.radius * 1.5, b.radius * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = b.color2;
        ctx.globalAlpha *= 0.7;
        ctx.beginPath();
        ctx.moveTo(b.radius * 2.5, 0);
        ctx.lineTo(-b.radius * 0.5, -b.radius * 0.3);
        ctx.lineTo(-b.radius * 0.5, b.radius * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
      case "ring": {
        // Chain lightning — crackling ring with orbiting sparks
        const r2 = b.radius * 1.8;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = b.color2;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r2 * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        // 3 orbiting sparks
        for (let i = 0; i < 3; i++) {
          const ang = time * 20 + (i * Math.PI * 2) / 3;
          const sx = b.x + Math.cos(ang) * r2;
          const sy = b.y + Math.sin(ang) * r2;
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.arc(sx, sy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        // core
        ctx.fillStyle = b.color;
        ctx.globalAlpha = b.fromEcho ? 0.6 : 1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
  ctx.restore();

  // ammo art on top of the glow: every gun class throws its own round
  for (const b of s.bullets) {
    if (!b.sprite) continue;
    const art = sprites.singles[b.sprite];
    if (!art || !art.width) continue;
    const f = firstFrame(art);
    const h = Math.max(9, b.radius * 2.1);
    const w2 = h * (f.w / f.h);
    ctx.save();
    ctx.globalAlpha = b.fromEcho ? 0.55 : 1;
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle + Math.PI / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(f.img, -w2 / 2, -h / 2, w2, h);
    ctx.restore();
  }


  // enemy projectiles — glowing orbs, bolts and arcing mortar shells
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const b of s.ebullets) {
    if (b.kind === "mortar") {
      const t = Math.min(1, (b.arcT ?? 0) / (b.arcMax ?? 1));
      const lift = Math.sin(t * Math.PI) * 130;
      // ground marker for the incoming shell
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(time * 14) * 0.15;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(b.tx ?? b.x, b.ty ?? b.y, 30 + t * 22, 14 + t * 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y - lift, b.radius, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const tail = Math.min(60, Math.hypot(b.vx, b.vy) * 0.07);
    const ang = Math.atan2(b.vy, b.vx);
    const gx = b.x - Math.cos(ang) * tail;
    const gy = b.y - Math.sin(ang) * tail;
    const g = ctx.createLinearGradient(gx, gy, b.x, b.y);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(1, b.color);
    ctx.strokeStyle = g;
    ctx.lineCap = "round";
    ctx.lineWidth = b.radius * 1.4;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * (b.kind === "orb" ? 1.1 : 0.85), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // muzzle light spilling onto the deck while firing
  if (s.muzzle > 0 && !s.over) {
    const mx = p.x + Math.cos(p.aim) * MUZZLE_DISTANCE;
    const my = p.y - GUN_Y + Math.sin(p.aim) * MUZZLE_DISTANCE;
    const light = ctx.createRadialGradient(mx, my, 0, mx, my, 190);
    const col = WEAPONS[p.weapon].color;
    light.addColorStop(0, "rgba(255,246,214,0.28)");
    light.addColorStop(0.35, `${col}22`);
    light.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, s.muzzle / 0.075);
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(mx, my, 190, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }


  // particles
  for (const q of s.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, q.life / q.maxLife);
    ctx.fillStyle = q.hue;
    ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    ctx.restore();
  }

  // floating text
  for (const u of s.popups) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, u.life * 2);
    ctx.textAlign = "center";
    const big = u.text.startsWith("WAVE") || u.text.startsWith("ECHO");
    ctx.font = `800 ${big ? 44 : 20}px ui-sans-serif, system-ui, sans-serif`;
    ctx.lineWidth = big ? 7 : 4;
    ctx.strokeStyle = "rgba(12,10,18,0.9)";
    ctx.strokeText(u.text, u.x, u.y);
    ctx.fillStyle = u.text.startsWith("ECHO") ? "#9fd8ff" : big ? "#ffd98a" : "#fff3cf";
    ctx.fillText(u.text, u.x, u.y);
    ctx.restore();
  }




  // reticle: dim while the gun auto-tracks, bright when you take manual aim
  if (!s.over) {
    const ch = sprites.singles.crosshair;
    const focus = s.focusAim;
    const chSize = (focus ? 42 : 30) + s.hitFlash * 8;
    if (focus || s.enemies.some((e) => !e.dying))
      drawImageCentered(
        ctx,
        ch,
        ch.width,
        ch.height,
        s.mouseX,
        s.mouseY,
        chSize,
        0,
        focus ? 0.95 : 0.4,
      );
  }


  if (s.hitFlash > 0.01) {
    // hitmarker: four ticks snapping outward on a confirmed hit
    ctx.save();
    ctx.globalAlpha = Math.min(1, s.hitFlash);
    ctx.strokeStyle = "#fff6d0";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    const r0 = 9 + (1 - s.hitFlash) * 8;
    const r1 = r0 + 8;
    for (const a of [0.25, 0.75, 1.25, 1.75]) {
      const ang = a * Math.PI;
      ctx.beginPath();
      ctx.moveTo(s.mouseX + Math.cos(ang) * r0, s.mouseY + Math.sin(ang) * r0);
      ctx.lineTo(s.mouseX + Math.cos(ang) * r1, s.mouseY + Math.sin(ang) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }


  ctx.restore(); // end camera transform

  // low-health pulse
  if (p.hp / p.maxHp < 0.34 && !s.over) {
    ctx.save();
    ctx.globalAlpha = 0.12 + Math.sin(time * 6) * 0.06;
    ctx.fillStyle = "#ff3b3b";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.restore();
  }

  ctx.restore();
}


/* ------------------------------ endless wave roll ----------------------------- */

/**
 * No shop, no break. When the wave timer runs out the next wave rolls straight
 * in on top of the fight; perks only ever arrive as drops on the floor.
 */
export function advanceWave(s: GameState) {
  const p = s.player;
  s.wave += 1;
  s.waveTimer = waveLength(s.wave);
  s.spawnTimer = 0.4;
  p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.08));
  s.sfx.push("level");
  s.popups.push({ x: p.x, y: p.y - 120, life: 1.8, text: `WAVE ${s.wave}` });

  // every wave guarantees one perk drop so progression never stalls
  dropUpgradePack(s, p.x, p.y);
  waveBurst(s);
}
