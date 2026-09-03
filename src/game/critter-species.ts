import { CRITTER_ENEMIES, type CritterEnemyKey } from "./critters";

export interface HordeStat {
  sprite: CritterEnemyKey;
  radius: number;
  speed: [number, number];
  hp: number;
  score: number;
  height: number;
  color: string;
  damage: number;
  minWave: number;
  weight: number;
}

/** Gameplay tuning for the hand-designed chibi horde (tier 1 fodder -> tier 5 nightmares). */
/** Global silhouette scale — the horde is drawn chunky so it reads at a glance. */
const SIZE_BOOST = 1.3;

interface CritterTuning {
  tier: 1 | 2 | 3 | 4 | 5;
  radius: number;
  speed: [number, number];
  hp: number;
  score: number;
  height: number;
  damage: number;
  minWave: number;
  weight: number;
}

const TUNING: Record<CritterEnemyKey, CritterTuning> = {
  // ---- critters
  e_mushroom: { tier: 2, radius: 24, speed: [96, 126], hp: 11, score: 34, height: 112, damage: 12, minWave: 3, weight: 2.2 },

  e_imp_violet: { tier: 1, radius: 25, speed: [136, 176], hp: 8, score: 13, height: 120, damage: 9, minWave: 1, weight: 3.4 },
  e_imp_bile: { tier: 2, radius: 27, speed: [116, 150], hp: 12, score: 26, height: 128, damage: 11, minWave: 2, weight: 2.6 },
  e_imp_crimson: { tier: 3, radius: 29, speed: [124, 160], hp: 17, score: 46, height: 138, damage: 14, minWave: 3, weight: 2.0 },
  e_gnat: { tier: 1, radius: 19, speed: [132, 172], hp: 6, score: 15, height: 94, damage: 8, minWave: 1, weight: 2.8 },

  // ---- undead
  e_skel_white: { tier: 2, radius: 24, speed: [92, 122], hp: 13, score: 30, height: 132, damage: 13, minWave: 5, weight: 2.0 },
  e_skel_gold: { tier: 3, radius: 26, speed: [110, 154], hp: 19, score: 48, height: 140, damage: 16, minWave: 7, weight: 1.6 },

  // ---- golems: heavy late-wave threats

  // ---- vermin & arcane
  e_bat: { tier: 1, radius: 18, speed: [140, 184], hp: 7, score: 18, height: 92, damage: 8, minWave: 2, weight: 2.6 },

  // ---- bosses
  e_sticklooter: { tier: 1, radius: 22, speed: [112, 146], hp: 9, score: 16, height: 100, damage: 9, minWave: 1, weight: 3.0 },
  e_slime_skull: { tier: 3, radius: 25, speed: [118, 150], hp: 16, score: 50, height: 112, damage: 14, minWave: 4, weight: 1.8 },
  e_demon_slime: { tier: 5, radius: 46, speed: [70, 92], hp: 175, score: 600, height: 226, damage: 32, minWave: 999, weight: 0 },
  e_nightborne: { tier: 5, radius: 42, speed: [86, 112], hp: 165, score: 560, height: 220, damage: 30, minWave: 999, weight: 0 },

  // ---- graveyard shift
  e_blob_gray: { tier: 2, radius: 28, speed: [78, 100], hp: 18, score: 38, height: 116, damage: 11, minWave: 2, weight: 2.2 },
  e_blob_pup: { tier: 1, radius: 17, speed: [120, 158], hp: 5, score: 10, height: 78, damage: 7, minWave: 2, weight: 0.6 },
  e_zombie: { tier: 2, radius: 26, speed: [72, 96], hp: 22, score: 36, height: 136, damage: 15, minWave: 2, weight: 2.6 },
  e_ghost: { tier: 3, radius: 24, speed: [104, 134], hp: 14, score: 55, height: 126, damage: 14, minWave: 6, weight: 1.4 },
  e_hound: { tier: 3, radius: 25, speed: [150, 190], hp: 15, score: 52, height: 112, damage: 15, minWave: 4, weight: 1.6 },

  // ---- guardian
};

export const CRITTER_KEYS = CRITTER_ENEMIES.map((d) => d.key) as CritterEnemyKey[];

export const CRITTER_NAME: Record<CritterEnemyKey, string> = Object.fromEntries(
  CRITTER_ENEMIES.map((d) => [d.key, d.name]),
) as Record<CritterEnemyKey, string>;

export const CRITTER_TIER: Record<CritterEnemyKey, number> = Object.fromEntries(
  CRITTER_KEYS.map((k) => [k, TUNING[k].tier]),
) as Record<CritterEnemyKey, number>;

export const CRITTER_STATS: Record<CritterEnemyKey, HordeStat> = Object.fromEntries(
  CRITTER_ENEMIES.map((d) => {
    const t = TUNING[d.key as CritterEnemyKey];
    // Brotato-style readability: everything is drawn chunkier, and the nastier
    // the tier the more screen space it owns so threats read at a glance.
    const bulk = SIZE_BOOST * (1 + (t.tier - 1) * 0.06);
    return [
      d.key,
      {
        sprite: d.key as CritterEnemyKey,
        radius: Math.round(t.radius * bulk),
        speed: t.speed,
        hp: t.hp,
        score: t.score,
        height: Math.round(t.height * bulk),
        color: d.body,
        damage: t.damage,
        minWave: t.minWave,
        weight: t.weight,
      } satisfies HordeStat,
    ];
  }),
) as Record<CritterEnemyKey, HordeStat>;
