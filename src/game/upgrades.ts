import type { GameState } from "./types";

export type Rarity = "common" | "rare" | "epic";

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  icon: string;
  rarity: Rarity;
  /** how many times this upgrade may be taken in one run */
  maxStacks: number;
  apply: (s: GameState) => void;
}

const RARITY_WEIGHT: Record<Rarity, number> = { common: 6, rare: 3, epic: 1.2 };

export const RARITY_COLOR: Record<Rarity, string> = {
  common: "#9fd8ff",
  rare: "#c77dff",
  epic: "#ffd166",
};

export const UPGRADES: Upgrade[] = [
  {
    id: "damage",
    name: "Hollow Point",
    desc: "+20% bullet damage",
    icon: "◈",
    rarity: "common",
    maxStacks: 8,
    apply: (s) => {
      s.player.damageMult *= 1.2;
    },
  },
  {
    id: "rate",
    name: "Overclock",
    desc: "+15% fire rate",
    icon: "⟶",
    rarity: "common",
    maxStacks: 8,
    apply: (s) => {
      s.player.rateMult = Math.min(4, s.player.rateMult * 1.15);
    },
  },
  {
    id: "multishot",
    name: "Split Barrel",
    desc: "+1 projectile per shot",
    icon: "⁙",
    rarity: "rare",
    maxStacks: 4,
    apply: (s) => {
      s.player.mods.extraProjectiles += 1;
      s.player.mods.spreadMult += 0.35;
    },
  },
  {
    id: "velocity",
    name: "Hot Loads",
    desc: "+25% projectile speed, tighter spread",
    icon: "↯",
    rarity: "common",
    maxStacks: 4,
    apply: (s) => {
      s.player.mods.projSpeedMult *= 1.25;
      s.player.mods.spreadMult *= 0.85;
    },
  },
  {
    id: "hp",
    name: "Iron Lungs",
    desc: "+25% max HP and heal for it",
    icon: "✚",
    rarity: "common",
    maxStacks: 5,
    apply: (s) => {
      const gain = Math.round(s.player.maxHp * 0.25);
      s.player.maxHp += gain;
      s.player.hp = Math.min(s.player.maxHp, s.player.hp + gain);
    },
  },
  {
    id: "speed",
    name: "Light Step",
    desc: "+15% movement speed",
    icon: "»",
    rarity: "common",
    maxStacks: 5,
    apply: (s) => {
      s.player.baseSpeed *= 1.15;
      s.player.speed = s.player.baseSpeed;
    },
  },
  {
    id: "knock",
    name: "Heavy Slugs",
    desc: "+60% knockback",
    icon: "⇴",
    rarity: "common",
    maxStacks: 4,
    apply: (s) => {
      s.player.mods.knockMult += 0.6;
    },
  },
  {
    id: "pierce",
    name: "Rail Core",
    desc: "Bullets pierce 1 extra enemy",
    icon: "⌁",
    rarity: "rare",
    maxStacks: 4,
    apply: (s) => {
      s.player.mods.pierce += 1;
    },
  },
  {
    id: "explosive",
    name: "Volatile Rounds",
    desc: "Bullets explode on impact",
    icon: "✺",
    rarity: "epic",
    maxStacks: 3,
    apply: (s) => {
      s.player.mods.explosive += 1;
    },
  },
  {
    id: "crit",
    name: "Weak Points",
    desc: "+12% critical chance",
    icon: "✦",
    rarity: "rare",
    maxStacks: 5,
    apply: (s) => {
      s.player.mods.crit = Math.min(0.85, s.player.mods.crit + 0.12);
    },
  },
  {
    id: "critdmg",
    name: "Executioner",
    desc: "+0.75x critical damage",
    icon: "☠",
    rarity: "rare",
    maxStacks: 4,
    apply: (s) => {
      s.player.mods.critMult += 0.75;
    },
  },
  {
    id: "lifesteal",
    name: "Leech Rounds",
    desc: "Heal 1 HP per 6 kills worth of damage",
    icon: "❥",
    rarity: "epic",
    maxStacks: 3,
    apply: (s) => {
      s.player.mods.lifesteal += 0.08;
    },
  },
];

export const UPGRADE_MAP: Record<string, Upgrade> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);

/** Roll three distinct upgrade offers, respecting stack limits and rarity weight. */
export function rollUpgrades(taken: Record<string, number>, count = 3): string[] {
  const pool = UPGRADES.filter((u) => (taken[u.id] ?? 0) < u.maxStacks);
  const out: string[] = [];
  const bag = [...pool];
  while (out.length < count && bag.length) {
    const total = bag.reduce((sum, u) => sum + RARITY_WEIGHT[u.rarity], 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < bag.length; i++) {
      roll -= RARITY_WEIGHT[bag[i]!.rarity];
      if (roll <= 0) {
        idx = i;
        break;
      }
    }
    out.push(bag[idx]!.id);
    bag.splice(idx, 1);
  }
  return out;
}

export function applyUpgrade(s: GameState, id: string) {
  const u = UPGRADE_MAP[id];
  if (!u) return;
  u.apply(s);
  s.takenUpgrades[id] = (s.takenUpgrades[id] ?? 0) + 1;
  s.paused = false;
}

export function xpForLevel(level: number) {
  return Math.round(6 + level * 4 + level * level * 0.6);
}
