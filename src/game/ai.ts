import type { AiRole } from "./types";
import type { CritterEnemyKey } from "./critters";

/**
 * Behaviour role per enemy. The engine reads this once at spawn time and drives
 * the enemy's state machine from it, so art, tuning and mechanics stay in three
 * readable places instead of one giant table.
 */
export const AI_ROLE: Record<CritterEnemyKey, AiRole> = {

  // critters
  e_imp_violet: "swarm",
  e_imp_bile: "chase",
  e_imp_crimson: "dash",
  e_gnat: "zigzag",
  e_mushroom: "trail",

  // undead
  e_skel_white: "chase",
  e_skel_gold: "charge",

  // golems

  // vermin & arcane
  e_bat: "zigzag",

  // bosses
  e_nightborne: "dash",
  e_demon_slime: "rhino",

  // slimes & roots
  e_sticklooter: "swarm",
  e_slime_skull: "leap",

  // graveyard shift
  e_blob_gray: "split",
  e_blob_pup: "swarm",
  e_zombie: "leech",
  e_ghost: "cloak",
  e_hound: "dash",

  // boss
};

/** One-line mechanic blurb — used by the bestiary UI. */
export const AI_BLURB: Record<AiRole, string> = {
  chase: "Marches straight at you and swings.",
  swarm: "Rushes in tight packs. Dies fast, never alone.",
  dash: "Sprints in sudden ultra-fast bursts.",
  charge: "Marks a lane, then charges down it.",
  zigzag: "Weaves hard to break your auto-aim.",
  shooter: "Hovers at range and snipes bolts at you.",
  mortar: "Lobs high-arc shells at marked ground.",
  split: "Bursts into three lesser vermin when killed.",
  healer: "Keeps distance, pulses healing waves.",
  buffer: "Aura boosts nearby foes' speed and damage.",
  shield: "Frontal barrier blocks shots from the front.",
  spawner: "Passively drips out fresh vermin.",
  flee: "Runs away. Huge bounty if you catch it.",
  mine: "Bolts proximity mines to the floor.",
  leech: "Heals itself for every hit it lands on you.",
  burrow: "Digs under, invulnerable, resurfaces at your feet.",
  bomber: "Accelerates at you and detonates.",
  grapple: "Grabs and drags you backwards.",
  cloak: "Invisible until it enters striking range.",
  splitshot: "Fires payloads that split into three.",
  orbit: "Spawns in pairs and tightens the ring.",
  trail: "Leaves toxic sludge to cut off escapes.",
  sapper: "Beam drains your focus-fire damage bonus.",
  reaper: "Deals double damage once you drop below 30%.",
  rhino: "Rams the border and showers debris.",
  leap: "Leaps high, then craters the ground.",
  spiral: "Hovers and spins out a bullet-hell spiral.",
  gargoyle: "Alternates stone armour with flying swoops.",
  teleport: "Vanishes and reappears behind your back.",
  hydra: "Splits into two half-scale clones at 50%.",
  siren: "Psychic rings invert your controls.",
  colossus: "Sweeps a continuous heat ray across the zone.",
  hivemind: "Flashes to enrage the entire horde.",
  titan: "Slams cross-shaped shockwaves through the arena.",
  brood: "Rooted nest, endlessly floods the field with mobs.",
};
