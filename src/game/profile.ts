import { useCallback, useEffect, useState } from "react";

export interface Profile {
  coins: number;
  gems: number;
  energy: number;
  maxEnergy: number;
  xp: number;
  lastEnergyAt: number;
  /** ISO date strings of claimed daily-reward days, in order */
  dailyClaimed: number;
  lastDailyAt: number;
  lastGiftAt: number;
  claimedMissions: string[];
  claimedAchievements: string[];
  claimedPass: number[];
  owned: string[];
}

const KEY = "echo:profile";
const ENERGY_MS = 90_000;

export const DEFAULT_PROFILE: Profile = {
  coins: 12450,
  gems: 250,
  energy: 85,
  maxEnergy: 100,
  xp: 650,
  lastEnergyAt: 0,
  dailyClaimed: 0,
  lastDailyAt: 0,
  lastGiftAt: 0,
  claimedMissions: [],
  claimedAchievements: [],
  claimedPass: [],
  owned: [],
};

export function levelFor(xp: number) {
  return Math.floor(xp / 1200) + 1;
}
export function xpInLevel(xp: number) {
  return xp % 1200;
}
export const XP_PER_LEVEL = 1200;

function load(): Profile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

/** Regenerate energy for elapsed real time. */
function regen(p: Profile): Profile {
  const now = Date.now();
  if (!p.lastEnergyAt) return { ...p, lastEnergyAt: now };
  if (p.energy >= p.maxEnergy) return { ...p, lastEnergyAt: now };
  const gained = Math.floor((now - p.lastEnergyAt) / ENERGY_MS);
  if (gained <= 0) return p;
  return {
    ...p,
    energy: Math.min(p.maxEnergy, p.energy + gained),
    lastEnergyAt: p.lastEnergyAt + gained * ENERGY_MS,
  };
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  useEffect(() => {
    setProfile(regen(load()));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setProfile((p) => regen(p)), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const patch = useCallback((fn: (p: Profile) => Profile) => {
    setProfile((prev) => {
      const next = fn(prev);
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setProfile({ ...DEFAULT_PROFILE, lastEnergyAt: Date.now() });
  }, []);

  return { profile, patch, reset };
}

export function isNewDay(ts: number) {
  if (!ts) return true;
  const a = new Date(ts);
  const b = new Date();
  return a.toDateString() !== b.toDateString();
}
