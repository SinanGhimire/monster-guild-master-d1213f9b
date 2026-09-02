import type { ClassKey } from "./classes";

export interface Vec {
  x: number;
  y: number;
}

import type { CritterEnemyKey } from "./critters";

/** The full procedural creature roster. */
export type Species = CritterEnemyKey;

export type WeaponKey =
  | "pistol"
  | "rifle"
  | "shotgun"
  | "minigun"
  | "smg"
  | "sniper"
  | "flak"
  | "plasma"
  | "rocket"
  | "laser"
  | "crossbow"
  | "chain"
  | "revolver"
  | "carbine"
  | "autoshotgun"
  | "grenadier"
  | "railgun"
  | "vulcan"
  /* ---- pack weapons ---- */
  | "scrapper"
  | "hornet"
  | "bulldog"
  | "ripper"
  | "warden"
  | "spitfire"
  | "marauder"
  | "tempest"
  | "reaper"
  | "havoc"
  | "vanguard"
  | "wraith"
  | "deagle"
  | "m16"
  | "mortar"
  | "hushpuppy"
  | "gatling"
  | "buzzsaw"
  | "cleaver"
  | "warblade"
  | "hammerfall";

export type CharacterKey =
  | "spike"
  | "punk"
  | "crown"
  | "bald"
  // unlockable heroes drawn from the same world as the home-screen cast
  | "templar"
  | "reaper"
  | "oracle"
  | "seraph"
  | "warchief"
  | "sprout"
  // class art keys (c_<class>), generated procedurally per class
  | (string & {});

export type WeaponRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type BulletVisual = "tracer" | "bolt" | "orb" | "beam" | "arrow" | "ring";

export interface Weapon {
  key: WeaponKey;
  name: string;
  color: string;
  /** secondary accent colour for the glow / trail edge */
  color2: string;
  sprite: import("./assets").SingleKey;
  rate: number;
  damage: number;
  pellets: number;
  spread: number;
  speed: number;
  bulletRadius: number;
  pierce: number;
  knock: number;
  shake: number;
  /** controls how the bullet is drawn on canvas */
  visual: BulletVisual;
  rarity: WeaponRarity;
  /** filled in by the engine at boot */
  class?: "gun";
  /** gun only: ammo art drawn for every projectile */
  bulletSprite?: string;
  /** gun only: how the barrel behaves — drives feel and bullet art */
  archetype?: "pistol" | "smg" | "rifle" | "shotgun" | "sniper" | "heavy" | "energy";
}

export interface Mods {
  extraProjectiles: number;
  pierce: number;
  knockMult: number;
  projSpeedMult: number;
  crit: number;
  critMult: number;
  lifesteal: number;
  explosive: number;
  spreadMult: number;
}

export function baseMods(): Mods {
  return {
    extraProjectiles: 0,
    pierce: 0,
    knockMult: 1,
    projSpeedMult: 1,
    crit: 0.05,
    critMult: 2,
    lifesteal: 0,
    explosive: 0,
    spreadMult: 1,
  };
}

export interface Player extends Vec {
  radius: number;
  speed: number;
  baseSpeed: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  aim: number;
  invuln: number;
  bob: number;
  moving: boolean;
  animT: number;
  /** loadout slot 1 — the equipped gun */
  weapon: WeaponKey;
  /** absorb shield */
  shield: number;
  damageMult: number;
  rateMult: number;
  character: CharacterKey;
  /** selected Brotato-style class */
  class: ClassKey;
  mods: Mods;
}

export interface Enemy extends Vec {
  radius: number;
  speed: number;
  hp: number;
  maxHp: number;
  species: Species;
  hurt: number;
  animT: number;
  scale: number;
  facing: 1 | -1;
  dying: boolean;
  deathT: number;
  attackCd: number;
  elite: boolean;
  xp: number;
  breed: string;
  name: string;
  tint: string;
  aura?: string | undefined;
  damage: number;
  /** behaviour role from the enemy blueprint */
  role: AiRole;
  /** current behaviour phase (wind-up, dashing, burrowed, ...) */
  state: EnemyState;
  stateT: number;
  /** primary / secondary ability cooldowns */
  cd: number;
  cd2: number;
  /** scripted velocity used by dashes, leaps and knockback moves */
  vx: number;
  vy: number;
  /** 0 = solid, 1 = fully faded out (cloak / burrow) */
  fade: number;
  /** cannot be hit or auto-targeted while true */
  untargetable: boolean;
  /** seconds left on the attack telegraph, plus the angle it points at */
  telegraph: number;
  telAng: number;
  /** live minions this enemy is responsible for */
  spawned: number;
  didSplit: boolean;
  /** buff timer granted by a Buffer / Hivemind */
  buffed: number;
  /** frontal energy barrier (Shielder / Gargoyle armour stance) */
  shielded: boolean;
  /** minion flag: spawned by another enemy, worth less */
  minion: boolean;
  /** walk-cycle phase in cycles, advanced by distance actually travelled */
  gaitT?: number;
  /** world speed this frame, used to pick idle vs walk animation */
  moveSpd?: number;
}

export type AiRole =
  | "chase" | "swarm" | "dash" | "charge" | "zigzag" | "shooter" | "mortar"
  | "split" | "healer" | "buffer" | "shield" | "spawner" | "flee" | "mine"
  | "leech" | "burrow" | "bomber" | "grapple" | "cloak" | "splitshot"
  | "orbit" | "trail" | "sapper" | "reaper" | "rhino" | "leap" | "spiral"
  | "gargoyle" | "teleport" | "hydra" | "siren" | "colossus" | "hivemind"
  | "titan" | "brood";

export type EnemyState = "walk" | "wind" | "dash" | "under" | "hidden" | "armor" | "fly" | "cast";

export type ShotKind = "bolt" | "mortar" | "orb" | "spike";

export interface EnemyShot extends Vec {
  vx: number;
  vy: number;
  radius: number;
  life: number;
  damage: number;
  color: string;
  kind: ShotKind;
  /** mortar shots arc to a marked impact point */
  tx?: number;
  ty?: number;
  arcT?: number;
  arcMax?: number;
  /** split-shooter payloads break apart mid-flight */
  splitIn?: number;
}

export type HazardKind = "mine" | "sludge" | "shock" | "crater";

export interface Hazard extends Vec {
  kind: HazardKind;
  radius: number;
  life: number;
  maxLife: number;
  damage: number;
  /** arming delay before a mine can trigger */
  arm: number;
}


export interface Bullet extends Vec {
  /** previous frame position, used for swept collision */
  px: number;
  py: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  angle: number;
  damage: number;
  pierce: number;
  color: string;
  color2: string;
  visual: BulletVisual;
  /** ammo art key from the bullet pack, drawn on top of the glow */
  sprite?: string | undefined;
  /** energy rounds weave along their flight path */
  wobble?: number | undefined;
  /** engine time the round left the barrel (drives wobble + spin) */
  born?: number | undefined;
  fromEcho: boolean;
  crit: boolean;
  knock: number;
  explosive: number;
  lifesteal: number;
  hits: Set<Enemy>;
}

export interface Particle extends Vec {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: string;
}

export interface Popup extends Vec {
  life: number;
  text: string;
}

export type DecorKind =
  | "rock1"
  | "rock2"
  | "rock3"
  /** painted deck panel marking */
  | "panel"
  /** hazard chevron lane stripe */
  | "chevron"
  /** round grate / vent set into the floor */
  | "vent"
  /** inset floor light stud */
  | "stud"
  | "glyph"
  | "crystal";


export interface Decor extends Vec {
  scale: number;
  kind: DecorKind;
  hue?: string;
  rot: number;
}

export type PickupKind = "health" | "weapon" | "speed" | "rate" | "damage" | "xp" | "upgrade";

export interface Pickup extends Vec {
  kind: PickupKind;
  weapon?: WeaponKey | undefined;
  /** upgrade id when kind === "upgrade" */
  upgrade?: string | undefined;
  life: number;
  bob: number;
  amount?: number;
  vx?: number;
  vy?: number;
}


export interface EchoFrame {
  x: number;
  y: number;
  aim: number;
  firing: boolean;
  moving: boolean;
}

export interface Echo {
  frames: EchoFrame[];
  t: number;
  x: number;
  y: number;
  aim: number;
  facing: 1 | -1;
  moving: boolean;
  animT: number;
  hp: number;
  maxHp: number;
  weapon: WeaponKey;
  damageMult: number;
  rateMult: number;
  cooldown: number;
  muzzle: number;
  character: CharacterKey;
  mods: Mods;
  fading: number;
  dead: boolean;
}

export type FloorTheme = "slab" | "tech" | "ash" | "moss" | "bone" | "dungeon";

/** Deployed gear (auto turret or proximity mine). */
export interface Turret extends Vec {
  hp: number;
  maxHp: number;
  life: number;
  aim: number;
  cd: number;
  muzzle: number;
  weapon: WeaponKey;
  /** "turret" shoots, "mine" detonates on contact */
  kind?: "turret" | "mine";
  /** mines cannot trigger until this reaches 0 */
  arm?: number;
}


export interface GameState {
  player: Player;
  cam: Vec;
  lootTimer: number;
  enemies: Enemy[];
  bullets: Bullet[];
  /** deployed gear */
  turrets: Turret[];
  /** projectiles fired by the horde */
  ebullets: EnemyShot[];
  /** floor hazards: mines, poison trails, shockwaves, craters */
  hazards: Hazard[];
  /** Siren: movement keys are inverted while this is above 0 */
  invertT: number;
  /** Sapper: focus-fire damage bonus is drained while this is above 0 */
  drainT: number;
  /** Hivemind: the whole horde is enraged while this is above 0 */
  enrageT: number;
  particles: Particle[];
  popups: Popup[];
  decor: Decor[];
  pickups: Pickup[];
  echoes: Echo[];
  recording: EchoFrame[];
  recordAcc: number;
  echoTimer: number;
  score: number;
  wave: number;
  waveTimer: number;
  spawnTimer: number;
  fireCooldown: number;
  /** true while the player is aiming manually (focus fire) */
  focusAim: boolean;
  mouseX: number;
  mouseY: number;
  muzzle: number;
  /** directional camera recoil kick, decays fast */
  kick: number;
  kickAng: number;
  /** hitmarker pulse on the crosshair */
  hitFlash: number;
  shake: number;

  over: boolean;
  won: boolean;
  breather: number;
  xp: number;
  xpToNext: number;
  level: number;
  kills: number;
  time: number;
  sfx: string[];
  takenUpgrades: Record<string, number>;
  paused: boolean;
  phase: "wave" | "shop";
  /** weapons bought/found this run, always includes the starting weapon */
  arsenal: WeaponKey[];
  /** weapons on sale in the between-wave shop */
  shopOffers: WeaponKey[];
  /** rerolls already bought in the current shop visit */
  shopRerolls: number;
  materials: number;
  /** run rules selected from the menu */
  mode: RunMode;
  /** randomized arena surface for this run */
  floor: FloorTheme;
  /** radius of the fixed arena border — grows each wave */
  arenaR: number;
  /** selected Brotato-style class for this run */
  class: ClassKey;
}

export type RunMode = "endless" | "boss" | "survival";
