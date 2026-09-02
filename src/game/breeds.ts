import type { Species } from "./types";
import { CRITTER_NAME } from "./critter-species";

/**
 * A small tier system layered on the 5 monster species — 4 tiers, not 168 skins,
 * so every variant actually matches the art it is drawn with.
 */
export interface Breed {
  id: string;
  /** Display prefix, e.g. "Feral" -> "Feral Troll" */
  prefix: string;
  tint: string;
  hpMul: number;
  speedMul: number;
  dmgMul: number;
  scaleMul: number;
  scoreMul: number;
  minWave: number;
  weight: number;
  /** Optional glow ring colour drawn under the sprite. */
  aura?: string;
}

export const BREEDS: Breed[] = [
  { id: "common", prefix: "", tint: "", hpMul: 1, speedMul: 1, dmgMul: 1, scaleMul: 1, scoreMul: 1, minWave: 1, weight: 4 },
  { id: "feral", prefix: "Feral", tint: "", hpMul: 0.85, speedMul: 1.35, dmgMul: 1, scaleMul: 0.94, scoreMul: 1.4, minWave: 1, weight: 3 },
  { id: "hulking", prefix: "Hulking", tint: "", hpMul: 1.8, speedMul: 0.8, dmgMul: 1.35, scaleMul: 1.2, scoreMul: 1.8, minWave: 2, weight: 2.4 },
  { id: "cursed", prefix: "Cursed", tint: "", hpMul: 1.5, speedMul: 1.15, dmgMul: 1.4, scaleMul: 1.05, scoreMul: 2.4, minWave: 3, weight: 2 },
];

export const BREED_MAP: Record<string, Breed> = Object.fromEntries(
  BREEDS.map((b) => [b.id, b]),
);

export const SPECIES_NAME: Record<Species, string> = { ...CRITTER_NAME };

export function totalEnemyVariants(speciesCount: number) {
  return speciesCount * BREEDS.length;
}

export function rollBreed(wave: number): Breed {
  const pool = BREEDS.filter((b) => b.minWave <= wave);
  const total = pool.reduce((sum, b) => sum + b.weight, 0);
  let roll = Math.random() * total;
  for (const b of pool) {
    roll -= b.weight;
    if (roll <= 0) return b;
  }
  return pool[0]!;
}

export function breedName(breed: Breed, species: Species) {
  const base = SPECIES_NAME[species];
  return breed.prefix ? `${breed.prefix} ${base}` : base;
}
