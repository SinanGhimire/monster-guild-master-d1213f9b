import { useEffect, useMemo, useState } from "react";
import {
  Bolt,
  Check,
  ClipboardList,
  Coins,
  Crown,
  Flame,
  Gem,
  Heart,
  Lock,
  Package,
  Rocket,
  Shield,
  Skull,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { SpriteIcon } from "@/components/SpriteIcon";
import { PLAYER_CHARACTERS } from "@/game/assets";
import { CHARACTERS, WEAPONS } from "@/game/engine";
import { RARITY_COLOR, UPGRADES } from "@/game/upgrades";
import { isNewDay, levelFor, useProfile, XP_PER_LEVEL, xpInLevel } from "@/game/profile";
import type { CharacterKey } from "@/game/types";
import { CLASSES, CLASS_KEYS, type ClassKey } from "@/game/classes";
import { classPortrait } from "@/game/assets";

const IDLE_FRAMES = 6;

/** Rarity tones for gun cards, matched to the in-run armoury. */
const WEAPON_RARITY_COLOR: Record<string, string> = {
  common: "#9fd8ff",
  uncommon: "#7bf2a8",
  rare: "#c77dff",
  epic: "#ffd166",
  legendary: "#ff7b4d",
};

export type PanelKey =
  | "shop"
  | "missions"
  | "achievements"
  | "gift"
  | "starter"
  | "leaderboard"
  | "settings"
  | "profile"
  | "character"
  | "classes"
  | "weapons"
  | "upgrades"
  | "echoes";

const TITLES: Record<PanelKey, string> = {
  shop: "Shop",
  missions: "Missions",
  achievements: "Awards",
  gift: "Daily",
  starter: "Starter",
  leaderboard: "Ranks",
  settings: "Settings",
  profile: "Profile",
  character: "Heroes",
  classes: "Classes",
  weapons: "Weapons",
  upgrades: "Perks",
  echoes: "Echoes",
};

type Cur = "coins" | "gems";

interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  cur: Cur;
  icon: typeof Coins;
  tint: "gold" | "violet";
  repeat?: boolean;
  tag?: string;
  grant: {
    coins?: number;
    gems?: number;
    energy?: number;
    maxEnergy?: number;
    xp?: number;
    fillEnergy?: boolean;
  };
}

const SHOP_SECTIONS: { title: string; items: ShopItem[] }[] = [
  {
    title: "Currency",
    items: [
      { id: "coin-pouch", name: "Coin Pouch", desc: "+5,000 coins", cost: 50, cur: "gems", icon: Coins, tint: "gold", repeat: true, grant: { coins: 5000 } },
      { id: "coin-chest", name: "Coin Chest", desc: "+25,000 coins", cost: 200, cur: "gems", icon: Coins, tint: "gold", repeat: true, tag: "Best value", grant: { coins: 25000 } },
      { id: "gem-cache", name: "Gem Cache", desc: "+100 gems", cost: 8000, cur: "coins", icon: Gem, tint: "violet", repeat: true, grant: { gems: 100 } },
      { id: "gem-vault", name: "Gem Vault", desc: "+400 gems", cost: 28000, cur: "coins", icon: Gem, tint: "violet", repeat: true, grant: { gems: 400 } },
    ],
  },
  {
    title: "Energy",
    items: [
      { id: "energy-refill", name: "Refill", desc: "Energy to full", cost: 400, cur: "coins", icon: Zap, tint: "gold", repeat: true, grant: { fillEnergy: true } },
      { id: "energy-surge", name: "Surge", desc: "+50 energy now", cost: 25, cur: "gems", icon: Bolt, tint: "gold", repeat: true, grant: { energy: 50 } },
      { id: "energy-core", name: "Power Core", desc: "+25 max energy", cost: 150, cur: "gems", icon: Heart, tint: "violet", tag: "Permanent", grant: { maxEnergy: 25, energy: 25 } },
      { id: "xp-tonic", name: "XP Tonic", desc: "+1,200 XP", cost: 60, cur: "gems", icon: Star, tint: "gold", repeat: true, grant: { xp: 1200 } },
    ],
  },
  {
    title: "Crates",
    items: [
      { id: "crate", name: "Echo Crate", desc: "1,500 & 25", cost: 30, cur: "gems", icon: Package, tint: "gold", repeat: true, grant: { coins: 1500, gems: 25 } },
      { id: "crate-rare", name: "Rift Crate", desc: "6,000, 60, 25 EN", cost: 90, cur: "gems", icon: Sparkles, tint: "violet", repeat: true, grant: { coins: 6000, gems: 60, energy: 25 } },
      { id: "crate-legend", name: "Void Crate", desc: "20k, 200, XP", cost: 260, cur: "gems", icon: Flame, tint: "violet", repeat: true, tag: "Legendary", grant: { coins: 20000, gems: 200, xp: 2400 } },
      { id: "warchest", name: "War Chest", desc: "Full top-up", cost: 45000, cur: "coins", icon: Shield, tint: "gold", tag: "One-time", grant: { gems: 500, energy: 100, xp: 3600 } },
    ],
  },
];

const HERO_COST: Partial<Record<CharacterKey, { cost: number; cur: Cur }>> = {
  templar: { cost: 6000, cur: "coins" },
  reaper: { cost: 12000, cur: "coins" },
  oracle: { cost: 120, cur: "gems" },
  seraph: { cost: 240, cur: "gems" },
  warchief: { cost: 24000, cur: "coins" },
  sprout: { cost: 3000, cur: "coins" },
};

const DAILY = [
  { icon: Coins, v: 500, label: "500", kind: "coins" as const },
  { icon: Gem, v: 50, label: "50", kind: "gems" as const },
  { icon: Package, v: 1, label: "Crate", kind: "crate" as const },
  { icon: Zap, v: 100, label: "100", kind: "energy" as const },
  { icon: Gem, v: 100, label: "100", kind: "gems" as const },
];


function Sprite({
  src,
  className,
  flip,
}: {
  src: string;
  className?: string;
  flip?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: `${IDLE_FRAMES * 100}% 100%`,
        backgroundPosition: "0% 50%",
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        transform: flip ? "scaleX(-1)" : undefined,
      }}
    />
  );
}

/** Dark price capsule with a currency coin, exactly like the shop art. */
function Price({ cur, children }: { cur?: "coins" | "gems" | "cash"; children: React.ReactNode }) {
  return (
    <span className="pop-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1">
      {cur === "gems" ? (
        <Gem className="h-4 w-4 text-violet" />
      ) : cur === "coins" ? (
        <Coins className="h-4 w-4 text-gold" />
      ) : null}
      <span className="text-sm font-black tabular-nums text-white">{children}</span>
    </span>
  );
}

function BuyButton({
  children,
  onClick,
  disabled,
  size = "md",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: "md" | "sm";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`pop-buy w-full rounded-full font-black uppercase tracking-wider ${
        size === "sm" ? "px-3 py-1.5 text-xs leading-5" : "px-4 py-2.5 text-base leading-6"
      }`}
    >
      {children}
    </button>
  );
}

function QuietButton({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`pop-quiet w-full rounded-full px-4 py-2.5 text-xs leading-6 font-black uppercase tracking-widest ${
        tone === "danger" ? "text-destructive" : "text-white"
      } disabled:opacity-55`}
    >
      {children}
    </button>
  );
}

/** Card slot: title strip, art well, price capsule, action. */
function Slot({
  title,
  art,
  price,
  action,
  highlight,
}: {
  title: string;
  art: React.ReactNode;
  price?: React.ReactNode;
  action?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`pop-card pop-card-hot flex flex-1 flex-col items-center gap-2 rounded-2xl px-2 pb-3 pt-2 ${
          highlight ? "outline outline-4 outline-gold" : ""
        }`}
      >
        <p className="pop-label text-center text-[11px] font-black uppercase leading-tight tracking-wide">
          {title}
        </p>
        <div className="grid min-h-[4.5rem] flex-1 place-items-center">{art}</div>
        {price}
      </div>
      {action}
    </div>
  );
}

export function MenuPanel({
  panel,
  onClose,
  character,
  onSelect,
  cls,
  onSelectClass,
  best,
  muted,
  onToggleMute,
}: {
  panel: PanelKey;
  onClose: () => void;
  character: CharacterKey;
  onSelect: (k: CharacterKey) => void;
  cls: ClassKey;
  onSelectClass: (k: ClassKey) => void;
  best: number;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const { profile, patch, reset } = useProfile();
  const [toast, setToast] = useState<string | null>(null);
  const level = levelFor(profile.xp);
  const dailyReady = isNewDay(profile.lastDailyAt);
  const giftReady = isNewDay(profile.lastGiftAt);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2000);
  };

  const missions = useMemo(
    () => [
      { id: "m-play", name: "Start a run", goal: 1, have: best > 0 ? 1 : 0, reward: 250 },
      { id: "m-score-1k", name: "Score 1,000", goal: 1000, have: Math.min(best, 1000), reward: 600 },
      { id: "m-score-5k", name: "Score 5,000", goal: 5000, have: Math.min(best, 5000), reward: 1500 },
      { id: "m-level", name: "Reach level 5", goal: 5, have: Math.min(level, 5), reward: 1000 },
    ],
    [best, level],
  );

  const heroesOwned = useMemo(
    () => PLAYER_CHARACTERS.filter((c) => !HERO_COST[c.key] || profile.owned.includes(`hero:${c.key}`)).length,
    [profile.owned],
  );
  const purchases = useMemo(
    () => profile.owned.filter((o) => !o.startsWith("hero:")).length,
    [profile.owned],
  );

  const achievements = useMemo(
    () => [
      { id: "a1", icon: Target, name: "First Blood", desc: "Finish your first run", have: best > 0 ? 1 : 0, goal: 1, coins: 300, gems: 0 },
      { id: "a2", icon: Shield, name: "Survivor", desc: "Score 2,500 points", have: Math.min(best, 2500), goal: 2500, coins: 800, gems: 0 },
      { id: "a3", icon: Swords, name: "Vanguard", desc: "Score 10,000 points", have: Math.min(best, 10000), goal: 10000, coins: 2500, gems: 10 },
      { id: "a4", icon: Flame, name: "Firestorm", desc: "Score 25,000 points", have: Math.min(best, 25000), goal: 25000, coins: 6000, gems: 25 },
      { id: "a5", icon: Skull, name: "Nightmare", desc: "Score 50,000 points", have: Math.min(best, 50000), goal: 50000, coins: 15000, gems: 60 },
      { id: "a6", icon: Star, name: "Rookie Rank", desc: "Reach account level 3", have: Math.min(level, 3), goal: 3, coins: 750, gems: 0 },
      { id: "a7", icon: Star, name: "Veteran Rank", desc: "Reach account level 10", have: Math.min(level, 10), goal: 10, coins: 4000, gems: 20 },
      { id: "a8", icon: Crown, name: "Legend Rank", desc: "Reach account level 25", have: Math.min(level, 25), goal: 25, coins: 12000, gems: 50 },
      { id: "a9", icon: Coins, name: "Big Spender", desc: "Buy 1 shop item", have: Math.min(purchases, 1), goal: 1, coins: 500, gems: 0 },
      { id: "a10", icon: Package, name: "Hoarder", desc: "Buy 6 shop items", have: Math.min(purchases, 6), goal: 6, coins: 3500, gems: 15 },
      { id: "a11", icon: Rocket, name: "Recruiter", desc: "Unlock 6 heroes", have: Math.min(heroesOwned, 6), goal: 6, coins: 5000, gems: 20 },
      { id: "a12", icon: Trophy, name: "Full Roster", desc: `Unlock all ${PLAYER_CHARACTERS.length} heroes`, have: heroesOwned, goal: PLAYER_CHARACTERS.length, coins: 18000, gems: 75 },
      { id: "a13", icon: ClipboardList, name: "Taskmaster", desc: "Claim 4 missions", have: Math.min(profile.claimedMissions.length, 4), goal: 4, coins: 2000, gems: 10 },
      { id: "a14", icon: Sparkles, name: "Devoted", desc: "Claim 5 daily rewards", have: Math.min(profile.dailyClaimed, 5), goal: 5, coins: 2500, gems: 15 },
      { id: "a15", icon: Zap, name: "Overcharged", desc: "Reach 125 max energy", have: Math.min(profile.maxEnergy, 125), goal: 125, coins: 3000, gems: 10 },
      { id: "a16", icon: Gem, name: "Gem Baron", desc: "Hold 1,000 gems", have: Math.min(profile.gems, 1000), goal: 1000, coins: 8000, gems: 0 },
    ],
    [best, level, purchases, heroesOwned, profile.claimedMissions.length, profile.dailyClaimed, profile.maxEnergy, profile.gems],
  );

  const buy = (item: ShopItem) => {
    const owned = !item.repeat && profile.owned.includes(item.id);
    if (owned) return say("Already owned");
    const bal = item.cur === "coins" ? profile.coins : profile.gems;
    if (bal < item.cost) return say(`Not enough ${item.cur}`);
    patch((p) => {
      const next = { ...p, owned: [...new Set([...p.owned, item.id])] };
      if (item.cur === "coins") next.coins -= item.cost;
      else next.gems -= item.cost;
      const g = item.grant;
      if (g.coins) next.coins += g.coins;
      if (g.gems) next.gems += g.gems;
      if (g.xp) next.xp += g.xp;
      if (g.maxEnergy) next.maxEnergy += g.maxEnergy;
      if (g.fillEnergy) next.energy = next.maxEnergy;
      if (g.energy) next.energy = Math.min(next.maxEnergy, next.energy + g.energy);
      return next;
    });
    say(`${item.name} purchased`);
  };

  const buyHero = (key: CharacterKey) => {
    const priced = HERO_COST[key]!;
    const bal = priced.cur === "coins" ? profile.coins : profile.gems;
    if (bal < priced.cost) return say(`Not enough ${priced.cur}`);
    patch((p) => ({
      ...p,
      coins: priced.cur === "coins" ? p.coins - priced.cost : p.coins,
      gems: priced.cur === "gems" ? p.gems - priced.cost : p.gems,
      owned: [...new Set([...p.owned, `hero:${key}`])],
    }));
    onSelect(key);
    say(`${CHARACTERS[key].name} unlocked!`);
  };


  const claimDaily = () => {
    if (!dailyReady) return say("Come back tomorrow");
    const day = profile.dailyClaimed % DAILY.length;
    const r = DAILY[day]!;
    patch((p) => {
      const next = { ...p, dailyClaimed: p.dailyClaimed + 1, lastDailyAt: Date.now() };
      if (r.kind === "coins") next.coins += r.v;
      if (r.kind === "gems") next.gems += r.v;
      if (r.kind === "energy") next.energy = Math.min(next.maxEnergy, next.energy + r.v);
      if (r.kind === "crate") {
        next.coins += 1000;
        next.gems += 20;
      }
      return next;
    });
    say(`Day ${day + 1} claimed!`);
  };

  const body = () => {
    switch (panel) {
      case "shop":
        return (
          <div className="grid max-h-[52vh] gap-4 overflow-y-auto pr-1">
            {SHOP_SECTIONS.map((section) => (
              <div key={section.title} className="grid gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 flex-1 rounded-full bg-ink/60" />
                  <p className="pop-label text-[11px] font-black uppercase tracking-[0.2em]">
                    {section.title}
                  </p>
                  <span className="h-1.5 flex-1 rounded-full bg-ink/60" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {section.items.map((item) => {
                    const owned = !item.repeat && profile.owned.includes(item.id);
                    const Icon = item.icon;
                    return (
                      <Slot
                        key={item.id}
                        title={item.name}
                        highlight={!!item.tag}
                        art={
                          <div className="grid place-items-center gap-1">
                            <Icon
                              className={`h-12 w-12 drop-shadow-[0_3px_0_rgba(0,0,0,0.6)] ${
                                item.tint === "violet" ? "text-violet" : "text-gold"
                              }`}
                            />
                            <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">
                              {item.desc}
                            </p>
                            {item.tag && (
                              <p className="pop-label text-[9px] font-black uppercase tracking-wide text-gold">
                                {item.tag}
                              </p>
                            )}
                          </div>
                        }
                        price={<Price cur={item.cur}>{item.cost.toLocaleString()}</Price>}
                        action={
                          owned ? (
                            <QuietButton disabled>Owned</QuietButton>
                          ) : (
                            <BuyButton onClick={() => buy(item)}>Buy</BuyButton>
                          )
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <span className="h-1.5 flex-1 rounded-full bg-ink/60" />
                <p className="pop-label text-[11px] font-black uppercase tracking-[0.2em]">Heroes</p>
                <span className="h-1.5 flex-1 rounded-full bg-ink/60" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PLAYER_CHARACTERS.filter((c) => HERO_COST[c.key]).map((c) => {
                  const priced = HERO_COST[c.key]!;
                  const unlocked = profile.owned.includes(`hero:${c.key}`);
                  const stat = CHARACTERS[c.key];
                  return (
                    <Slot
                      key={c.key}
                      title={stat.name}
                      art={
                        <div className="relative grid place-items-center">
                          <Sprite src={c.portrait} className="h-20 w-14" />
                          {!unlocked && (
                            <Lock className="absolute -bottom-1 -right-1 h-5 w-5 text-white/70" />
                          )}
                        </div>
                      }
                      price={
                        unlocked ? (
                          <Price>Owned</Price>
                        ) : (
                          <Price cur={priced.cur}>{priced.cost.toLocaleString()}</Price>
                        )
                      }
                      action={
                        unlocked ? (
                          <QuietButton disabled>Unlocked</QuietButton>
                        ) : (
                          <BuyButton onClick={() => buyHero(c.key)}>Unlock</BuyButton>
                        )
                      }
                    />
                  );
                })}
              </div>
            </div>
          </div>
        );


      case "missions":
        return (
          <div className="grid gap-3">
            {missions.map((m) => {
              const done = m.have >= m.goal;
              const claimed = profile.claimedMissions.includes(m.id);
              return (
                <div key={m.id} className="pop-card flex items-center gap-3 rounded-2xl p-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-4 border-ink bg-pop-tray">
                    <ClipboardList className="h-5 w-5 text-gold" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="pop-label text-xs font-black uppercase tracking-wide">{m.name}</p>
                    <div className="mt-1.5 h-3 overflow-hidden rounded-full border-3 border-ink bg-pop-tray">
                      <div
                        className="h-full rounded-full bg-gradient-to-b from-gold to-orange"
                        style={{ width: `${Math.min(100, (m.have / m.goal) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] font-bold tabular-nums text-white/70">
                      {m.have.toLocaleString()} / {m.goal.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-24 shrink-0">
                    {claimed ? (
                      <QuietButton disabled>Claimed</QuietButton>
                    ) : (
                      <BuyButton
                        size="sm"
                        disabled={!done}
                        onClick={() => {
                          if (!done) return;
                          patch((p) => ({
                            ...p,
                            coins: p.coins + m.reward,
                            xp: p.xp + 120,
                            claimedMissions: [...p.claimedMissions, m.id],
                          }));
                          say(`+${m.reward} coins`);
                        }}
                      >
                        +{m.reward}
                      </BuyButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case "achievements": {
        const claimedCount = achievements.filter((a) =>
          profile.claimedAchievements.includes(a.id),
        ).length;
        return (
          <div className="grid gap-3">
            <div className="pop-card flex items-center gap-3 rounded-2xl px-4 py-3">
              <Trophy className="h-6 w-6 shrink-0 text-gold" />
              <div className="min-w-0 flex-1">
                <p className="pop-label text-[11px] font-black uppercase tracking-widest">
                  {claimedCount} / {achievements.length} claimed
                </p>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full border-3 border-ink bg-pop-tray">
                  <div
                    className="h-full rounded-full bg-gradient-to-b from-gold to-orange"
                    style={{ width: `${(claimedCount / achievements.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid max-h-[44vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {achievements.map((a) => {
                const done = a.have >= a.goal;
                const claimed = profile.claimedAchievements.includes(a.id);
                const Icon = a.icon;
                return (
                  <div
                    key={a.id}
                    className={`pop-card flex items-center gap-3 rounded-2xl p-3 ${
                      done && !claimed ? "outline outline-4 outline-gold" : ""
                    }`}
                  >
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border-4 border-ink ${
                        claimed ? "bg-gradient-to-b from-gold to-orange" : "bg-pop-tray"
                      }`}
                    >
                      {claimed ? (
                        <Check className="h-5 w-5 text-ink" strokeWidth={4} />
                      ) : done ? (
                        <Icon className="h-5 w-5 text-gold" />
                      ) : (
                        <Lock className="h-5 w-5 text-white/50" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="pop-label text-xs font-black uppercase tracking-wide">{a.name}</p>
                      <p className="truncate text-[11px] font-semibold text-white/70">{a.desc}</p>
                      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-pop-tray">
                        <div
                          className="h-full rounded-full bg-gradient-to-b from-gold to-orange"
                          style={{ width: `${Math.min(100, (a.have / a.goal) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 flex items-center gap-2 text-[10px] font-bold tabular-nums text-white/70">
                        <span>
                          {a.have.toLocaleString()} / {a.goal.toLocaleString()}
                        </span>
                        <span className="inline-flex items-center gap-1 text-gold">
                          <Coins className="h-3 w-3" />
                          {a.coins.toLocaleString()}
                        </span>
                        {a.gems > 0 && (
                          <span className="inline-flex items-center gap-1 text-violet">
                            <Gem className="h-3 w-3" />
                            {a.gems}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="w-20 shrink-0">
                      {claimed ? (
                        <QuietButton disabled>Done</QuietButton>
                      ) : (
                        <BuyButton
                          size="sm"
                          disabled={!done}
                          onClick={() => {
                            if (!done) return;
                            patch((p) => ({
                              ...p,
                              coins: p.coins + a.coins,
                              gems: p.gems + a.gems,
                              xp: p.xp + 200,
                              claimedAchievements: [...p.claimedAchievements, a.id],
                            }));
                            say(`${a.name} claimed`);
                          }}
                        >
                          Claim
                        </BuyButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }


      case "gift":
        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-5 gap-2">
              {DAILY.map(({ icon: Icon, label }, i) => {
                const claimed = i < profile.dailyClaimed % DAILY.length;
                const isNext = i === profile.dailyClaimed % DAILY.length;
                return (
                  <div
                    key={i}
                    className={`pop-card rounded-2xl px-1 py-3 text-center ${
                      isNext && dailyReady ? "outline outline-4 outline-gold" : ""
                    } ${claimed ? "opacity-55" : ""}`}
                  >
                    <Icon className={`mx-auto h-8 w-8 ${claimed ? "text-white/40" : "text-gold"}`} />
                    <p className="pop-label mt-1 text-[11px] font-black">{label}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-white/60">
                      Day {i + 1}
                    </p>
                  </div>
                );
              })}
            </div>
            <BuyButton disabled={!dailyReady} onClick={claimDaily}>
              {dailyReady ? "Claim" : "Claimed today"}
            </BuyButton>
            <QuietButton
              disabled={!giftReady}
              onClick={() => {
                patch((p) => ({
                  ...p,
                  coins: p.coins + 750,
                  energy: Math.min(p.maxEnergy, p.energy + 25),
                  lastGiftAt: Date.now(),
                }));
                say("+750 coins, +25 energy");
              }}
            >
              {giftReady ? "Open free gift" : "Gift opened today"}
            </QuietButton>
          </div>
        );

      case "starter": {
        const owned = profile.owned.includes("starter");
        return (
          <div className="grid gap-4 sm:grid-cols-3">
            <Slot
              title="Hero"
              art={<Sprite src={PLAYER_CHARACTERS[0]!.portrait} className="h-20 w-14" />}
              price={<Price>Unlock</Price>}
            />
            <Slot
              title="Gems"
              art={<Gem className="h-14 w-14 text-violet drop-shadow-[0_3px_0_rgba(0,0,0,0.6)]" />}
              price={<Price cur="gems">500</Price>}
            />
            <Slot
              title="Coins"
              art={<Coins className="h-14 w-14 text-gold drop-shadow-[0_3px_0_rgba(0,0,0,0.6)]" />}
              price={<Price cur="coins">2,500</Price>}
            />
            <div className="sm:col-span-3">
              <BuyButton
                disabled={owned}
                onClick={() => {
                  patch((p) => ({
                    ...p,
                    gems: p.gems + 500,
                    coins: p.coins + 2500,
                    owned: [...p.owned, "starter"],
                  }));
                  say("Starter pack unlocked!");
                }}
              >
                {owned ? "Owned" : "$2.99 — free in demo"}
              </BuyButton>
            </div>
          </div>
        );
      }

      case "leaderboard":
        return (
          <div className="grid gap-2">
            {[
              { name: "Voidwalker", score: Math.max(best + 4200, 18400) },
              { name: "Hexburn", score: Math.max(best + 1800, 12100) },
              { name: "You", score: best },
              { name: "Grimshade", score: Math.max(0, Math.floor(best * 0.6)) },
            ]
              .sort((a, b) => b.score - a.score)
              .map((row, i) => (
                <div
                  key={row.name}
                  className={`pop-card flex items-center gap-3 rounded-2xl px-4 py-3 ${
                    row.name === "You" ? "outline outline-4 outline-gold" : ""
                  }`}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full border-3 border-ink bg-pop-tray text-xs font-black text-gold">
                    {i + 1}
                  </span>
                  <span className="pop-label flex-1 text-xs font-black uppercase tracking-wide">
                    {row.name}
                  </span>
                  <Price cur="coins">{row.score.toLocaleString()}</Price>
                </div>
              ))}
          </div>
        );

      case "settings":
        return (
          <div className="grid gap-3">
            <QuietButton onClick={onToggleMute}>Sound — {muted ? "Off" : "On"}</QuietButton>
            <QuietButton
              tone="danger"
              onClick={() => {
                reset();
                say("Progress reset");
              }}
            >
              Reset progress
            </QuietButton>
          </div>
        );

      case "profile":
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["Level", String(level)],
              ["XP", `${xpInLevel(profile.xp)} / ${XP_PER_LEVEL}`],
              ["Best run", best.toLocaleString()],
              ["Coins", profile.coins.toLocaleString()],
              ["Gems", profile.gems.toLocaleString()],
              ["Energy", `${profile.energy} / ${profile.maxEnergy}`],
            ].map(([k, v]) => (
              <div key={k} className="pop-card flex items-center justify-between rounded-2xl px-4 py-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-white/70">
                  {k}
                </span>
                <span className="pop-label text-sm font-black tabular-nums">{v}</span>
              </div>
            ))}
          </div>
        );

      case "character":
        return (
          <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
            {PLAYER_CHARACTERS.map((c) => {
              const stat = CHARACTERS[c.key];
              const active = character === c.key;
              const priced = HERO_COST[c.key];
              const locked = !!priced && !profile.owned.includes(`hero:${c.key}`);
              return (
                <Slot
                  key={c.key}
                  highlight={active}
                  title={stat.name}
                  art={
                    <div className="relative grid place-items-center">
                      <Sprite
                        src={c.portrait}
                        className={`h-24 w-16 ${locked ? "opacity-45 grayscale" : ""}`}
                      />
                      {locked && (
                        <Lock className="absolute -top-1 right-0 h-5 w-5 text-white/80 drop-shadow-[0_2px_0_rgba(0,0,0,0.7)]" />
                      )}
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/65">
                        {WEAPONS[stat.weapon].name}
                      </p>
                    </div>
                  }
                  price={
                    locked ? (
                      <Price cur={priced!.cur}>{priced!.cost.toLocaleString()}</Price>
                    ) : (
                      <Price>
                        {stat.hp} HP · x{stat.damage}
                      </Price>
                    )
                  }
                  action={
                    locked ? (
                      <BuyButton onClick={() => buyHero(c.key)}>Unlock</BuyButton>
                    ) : active ? (
                      <QuietButton disabled>Equipped</QuietButton>
                    ) : (
                      <BuyButton onClick={() => onSelect(c.key)}>Equip</BuyButton>
                    )
                  }
                />
              );
            })}
          </div>
        );


      case "classes":
        return (
          <div className="grid gap-3">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-white/55">
              {CLASS_KEYS.length} classes · each one reshapes the run
            </p>
            <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
              {CLASS_KEYS.map((k) => {
                const def = CLASSES[k];
                const active = cls === k;
                return (
                  <Slot
                    key={k}
                    highlight={active}
                    title={def.name}
                    art={
                      <div className="grid w-full place-items-center gap-1">
                        <div
                          className="grid h-16 w-full place-items-center rounded-xl border-3 border-ink p-1.5"
                          style={{
                            background: `radial-gradient(circle at 50% 45%, color-mix(in oklab, ${def.color} 32%, transparent), rgba(0,0,0,0.35) 72%)`,
                          }}
                        >
                          <img
                            src={classPortrait(k)}
                            alt={def.name}
                            className="h-full w-auto object-contain"
                            style={{ imageRendering: "auto" }}
                          />
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-white/65">
                          {WEAPONS[def.weapon]?.name ?? def.weapon}
                        </p>
                        <div className="flex flex-wrap justify-center gap-1">
                          {def.buffs.slice(0, 3).map((b) => (
                            <span
                              key={b.label}
                              className="rounded-md bg-black/35 px-1 text-[8px] font-black uppercase tracking-wide"
                              style={{
                                color:
                                  b.tone === "bad"
                                    ? "#ff8f8f"
                                    : b.tone === "neutral"
                                      ? "#cfd6ff"
                                      : "#8ef2b0",
                              }}
                            >
                              {b.label} {b.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    }
                    price={
                      <Price>
                        {Math.round(def.hp * def.hpMult)} HP · x{(def.damage * def.damageMult).toFixed(2)}
                      </Price>
                    }
                    action={
                      active ? (
                        <QuietButton disabled>Selected</QuietButton>
                      ) : (
                        <BuyButton onClick={() => onSelectClass(k)}>Select</BuyButton>
                      )
                    }
                  />
                );
              })}
            </div>
          </div>
        );

      case "weapons": {
        const list = Object.values(WEAPONS);
        const order: Record<string, number> = {
          legendary: 0,
          epic: 1,
          rare: 2,
          uncommon: 3,
          common: 4,
        };
        const sorted = [...list].sort(
          (a, b) => (order[a.rarity] ?? 9) - (order[b.rarity] ?? 9) || b.damage - a.damage,
        );
        return (
          <div className="grid gap-3">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-white/55">
              {sorted.length} guns in the armoury · found in runs
            </p>
            <div className="grid max-h-[48vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
              {sorted.map((w) => {
                const owner = Object.entries(CHARACTERS).find(([, c]) => c.weapon === w.key);
                const equipped = CHARACTERS[character].weapon === w.key;
                const tone = WEAPON_RARITY_COLOR[w.rarity] ?? w.color;
                return (
                  <Slot
                    key={w.key}
                    highlight={equipped}
                    title={w.name}
                    art={
                      <div className="grid w-full place-items-center gap-1">
                        <div
                          className="grid h-16 w-full place-items-center rounded-xl border-3 border-ink p-1.5"
                          style={{
                            background: `radial-gradient(circle at 50% 45%, color-mix(in oklab, ${tone} 30%, transparent), rgba(0,0,0,0.35) 72%)`,
                          }}
                        >
                          <SpriteIcon sprite={w.sprite as string} tint={w.color} alt={w.name} />
                        </div>
                        <p
                          className="text-[9px] font-black uppercase tracking-[0.18em]"
                          style={{ color: tone }}
                        >
                          {w.rarity}
                        </p>
                      </div>
                    }
                    price={<Price>{Math.round(w.damage * w.pellets)} DMG</Price>}
                    action={
                      equipped ? (
                        <QuietButton disabled>Equipped</QuietButton>
                      ) : owner ? (
                        <BuyButton onClick={() => onSelect(owner[0] as CharacterKey)}>
                          Equip
                        </BuyButton>
                      ) : (
                        <QuietButton disabled>In runs</QuietButton>
                      )
                    }
                  />
                );
              })}
            </div>
          </div>
        );
      }


      case "upgrades":
        return (
          <div className="grid max-h-[46vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {UPGRADES.map((u) => (
              <div key={u.id} className="pop-card flex items-center gap-3 rounded-2xl p-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-4 border-ink bg-pop-tray text-xl">
                  {u.icon}
                </span>
                <div className="min-w-0">
                  <p
                    className="text-xs font-black uppercase tracking-wide"
                    style={{ color: RARITY_COLOR[u.rarity] }}
                  >
                    {u.name}
                  </p>
                  <p className="text-[11px] font-semibold leading-snug text-white/70">{u.desc}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case "echoes":
        return (
          <div className="pop-card rounded-2xl p-6 text-center">
            <Trophy className="mx-auto h-12 w-12 text-gold drop-shadow-[0_3px_0_rgba(0,0,0,0.6)]" />
            <p className="pop-label mt-3 text-base font-black uppercase tracking-widest">Echoes</p>
            <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-relaxed text-white/75">
              Every finished run is recorded. On your next attempt those runs return as Echoes —
              ghost allies repeating your old movement and firing beside you. Longer runs make
              stronger Echoes.
            </p>
            <div className="mt-4 flex justify-center">
              <Price cur="coins">Best {best > 0 ? best.toLocaleString() : "—"}</Price>
            </div>
          </div>
        );

    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[oklch(0.08_0.02_292/0.78)] p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-label={TITLES[panel]}
      onClick={onClose}
    >
      <div
        className="animate-pop-in relative w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* title sits on the panel edge, like the reference art */}
        <div className="pop-shell rounded-[2rem] px-5 pb-5 pt-4">
          <div className="relative mb-4 flex items-center justify-center">
            <h2 className="pop-title text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">
              {TITLES[panel]}
            </h2>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <Price cur="coins">{profile.coins.toLocaleString()}</Price>
            <Price cur="gems">{profile.gems.toLocaleString()}</Price>
            <span className="pop-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1">
              <Zap className="h-4 w-4 text-gold" />
              <span className="text-sm font-black tabular-nums text-white">
                {profile.energy}/{profile.maxEnergy}
              </span>
            </span>
          </div>

          <div className="pop-tray rounded-[1.5rem] p-3 sm:p-4">{body()}</div>
        </div>

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="pop-close absolute -right-3 -top-3 grid h-14 w-14 place-items-center rounded-full sm:-right-5 sm:-top-5 sm:h-16 sm:w-16"
        >
          <X className="h-7 w-7 text-white" strokeWidth={4} />
        </button>

        {toast && (
          <div className="pop-pill animate-pop-in absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full px-5 py-2 text-[11px] font-black uppercase tracking-widest text-gold">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
