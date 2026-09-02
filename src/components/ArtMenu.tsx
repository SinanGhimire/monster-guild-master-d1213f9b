import {
  BadgeDollarSign,
  ClipboardList,
  Coins,
  Crown,
  Gem,
  Layers,
  Package,
  Play,
  Plus,
  Settings,
  ShoppingCart,
  Skull,
  Sparkles,
  Swords,
  Trophy,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { levelFor, useProfile, XP_PER_LEVEL, xpInLevel } from "@/game/profile";
import type { RunMode } from "@/game/types";
import homeArtAsset from "@/assets/echo-home-art.png.asset.json";

const desktopMenuBg = homeArtAsset.url;
const mobileMenuBg = homeArtAsset.url;

/** Rolling 1-hour countdown for the limited offer rail item. */
function useOfferTimer() {
  const [left, setLeft] = useState(() => 3600 - (Math.floor(Date.now() / 1000) % 3600));
  useEffect(() => {
    const t = window.setInterval(() => {
      setLeft(3600 - (Math.floor(Date.now() / 1000) % 3600));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);
  const m = Math.floor(left / 60);
  const s = left % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}


export type ArtTarget =
  | { kind: "play" }
  | { kind: "tab"; tab: "character" | "classes" | "weapons" | "upgrades" | "echoes" }
  | { kind: "modal"; modal: string };

type Tint = "gold" | "violet" | "teal" | "crimson" | "leaf";

type RailItem = {
  id: string;
  label: string;
  icon: typeof ShoppingCart;
  target: ArtTarget;
  badge?: string;
  tint: Tint;
  timed?: boolean;
};

const LEFT_RAIL: RailItem[] = [
  { id: "shop", label: "Shop", icon: ShoppingCart, target: { kind: "modal", modal: "shop" }, badge: "!", tint: "crimson" },
  { id: "missions", label: "Missions", icon: ClipboardList, target: { kind: "modal", modal: "missions" }, badge: "!", tint: "leaf" },
  { id: "classes", label: "Classes", icon: User, target: { kind: "tab", tab: "classes" }, tint: "violet" },
];

const RIGHT_RAIL: RailItem[] = [
  { id: "awards", label: "Awards", icon: Trophy, target: { kind: "modal", modal: "achievements" }, tint: "gold" },
  { id: "ranks", label: "Ranks", icon: Crown, target: { kind: "modal", modal: "leaderboard" }, badge: "!", tint: "crimson" },
];

const TABS: { id: string; label: string; icon: typeof User; target: ArtTarget; tint: Tint }[] = [
  { id: "weapons", label: "Weapons", icon: Swords, target: { kind: "tab", tab: "weapons" }, tint: "crimson" },
];

/** Everything, in one row — used by the compact bottom menu bar on mobile/tablet. */
const MENU_BAR: RailItem[] = [...LEFT_RAIL, ...RIGHT_RAIL];

const MODES: { id: RunMode; label: string }[] = [
  { id: "survival", label: "Survival" },
  { id: "endless", label: "Endless" },
  { id: "boss", label: "Boss Rush" },
];

const TINT_FG: Record<Tint, string> = {
  gold: "text-[oklch(0.86_0.15_88)]",
  violet: "text-[oklch(0.78_0.14_305)]",
  teal: "text-[oklch(0.84_0.11_195)]",
  crimson: "text-[oklch(0.76_0.16_25)]",
  leaf: "text-[oklch(0.82_0.13_145)]",
};

const TINT_GLOW: Record<Tint, string> = {
  gold: "group-hover:shadow-[0_0_0_1px_oklch(0.86_0.15_88/50%),0_6px_18px_-6px_oklch(0.86_0.15_88/60%)]",
  violet: "group-hover:shadow-[0_0_0_1px_oklch(0.78_0.14_305/50%),0_6px_18px_-6px_oklch(0.78_0.14_305/60%)]",
  teal: "group-hover:shadow-[0_0_0_1px_oklch(0.84_0.11_195/50%),0_6px_18px_-6px_oklch(0.84_0.11_195/60%)]",
  crimson: "group-hover:shadow-[0_0_0_1px_oklch(0.76_0.16_25/50%),0_6px_18px_-6px_oklch(0.76_0.16_25/60%)]",
  leaf: "group-hover:shadow-[0_0_0_1px_oklch(0.82_0.13_145/50%),0_6px_18px_-6px_oklch(0.82_0.13_145/60%)]",
};

/** Compact icon-only button for the mobile/tablet bottom menu bar. */
function BarButton({ item, onOpen }: { item: RailItem; onOpen: (t: ArtTarget) => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      aria-label={item.label}
      onClick={() => onOpen(item.target)}
      className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-[oklch(0.12_0.02_292/78%)] backdrop-blur-sm transition-colors active:bg-white/15"
    >
      <Icon className={`h-4 w-4 ${TINT_FG[item.tint]}`} strokeWidth={2.25} aria-hidden />

      {item.badge && (
        <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[oklch(0.62_0.22_25)] px-1 text-[9px] font-semibold leading-4 text-[oklch(0.99_0_0)] shadow-[0_0_0_2px_oklch(0.12_0.02_292/80%)]">
          {item.badge}
        </span>
      )}
    </button>
  );
}

function IconTile({
  item,
  onOpen,
  size,
  timer,
}: {
  item: RailItem;
  onOpen: (t: ArtTarget) => void;
  size: "rail" | "dock";
  timer?: string | null;
}) {
  const Icon = item.icon;
  const box =
    size === "rail"
      ? "h-10 w-10 short:h-9 short:w-9 sm:h-12 sm:w-12"
      : "h-10 w-10 short:h-9 short:w-9 sm:h-11 sm:w-11";
  return (
    <button
      type="button"
      aria-label={item.label}
      onClick={() => onOpen(item.target)}
      className="group relative flex w-[3.2rem] shrink-0 flex-col items-center gap-1 short:w-11 short:gap-0.5 sm:w-[3.8rem]"
    >
      <span
         className={`relative grid ${box} place-items-center rounded-2xl border border-[oklch(1_0_0/14%)] bg-[oklch(0.14_0.02_292/62%)] backdrop-blur-md transition-all duration-200 group-hover:-translate-y-0.5 group-hover:bg-[oklch(0.18_0.03_292/72%)] group-active:translate-y-0`}
      >
        <Icon className={`h-[18px] w-[18px] sm:h-5 sm:w-5 ${TINT_FG[item.tint]}`} strokeWidth={2} aria-hidden />
        {item.badge && (
          <span className="absolute -right-1 -top-1 grid min-w-[1rem] place-items-center rounded-full bg-[oklch(0.62_0.22_25)] px-1 text-[9px] font-semibold leading-4 text-[oklch(0.99_0_0)] shadow-[0_0_0_2px_oklch(0.12_0.02_292/80%)]">
            {item.badge}
          </span>
        )}
      </span>
      <span
        className={`rounded bg-[oklch(0.04_0_0/68%)] px-1 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[oklch(0.96_0.01_292/95%)] drop-shadow-[0_1px_2px_oklch(0_0_0/80%)] sm:text-[10px] ${
          size === "rail" ? "short:hidden" : "short:text-[8px]"
        }`}
      >
        {item.label}
      </span>
      {item.timed && timer && (
        <span className="rounded-full bg-[oklch(0.62_0.22_25/85%)] px-1.5 text-[8px] font-semibold tabular-nums leading-4 text-[oklch(0.99_0_0)] short:hidden sm:text-[9px]">
          {timer}
        </span>
      )}
    </button>
  );
}

function TopPill({
  icon: Icon,
  value,
  onPlus,
  tint,
}: {
  icon: typeof Coins;
  value: string;
  onPlus: () => void;
  tint: string;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full border border-[oklch(1_0_0/12%)] bg-[oklch(0.13_0.02_292/58%)] py-0.5 pl-1 pr-1 backdrop-blur-md sm:gap-1.5">
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full sm:h-6 sm:w-6 ${tint}`}>
        <Icon className="h-3 w-3 text-[oklch(0.12_0.02_292)] sm:h-3.5 sm:w-3.5" strokeWidth={2.5} aria-hidden />
      </span>
      <span className="min-w-8 whitespace-nowrap text-center text-[10px] font-semibold tabular-nums text-foreground sm:min-w-12 sm:text-[13px]">
        {value}
      </span>
      <button
        type="button"
        aria-label="Get more"
        onClick={onPlus}
        className="!min-h-0 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/30 bg-[oklch(0.28_0.02_292/88%)] text-[oklch(0.98_0.02_90)] transition-colors hover:bg-[oklch(0.4_0.03_292/92%)] sm:h-6 sm:w-6"
      >
        <Plus className="h-3 w-3" strokeWidth={3} aria-hidden />
      </button>
    </span>
  );
}

export function ArtMenu({
  mode,
  onMode,
  onOpen,
  onPlay,
  muted,
  onToggleMute,
  ready,
}: {
  mode: RunMode;
  onMode: (m: RunMode) => void;
  onOpen: (t: ArtTarget) => void;
  onPlay: () => void;
  muted: boolean;
  onToggleMute: () => void;
  ready: boolean;
}) {
  const { profile } = useProfile();
  const level = levelFor(profile.xp);
  const xpPct = (xpInLevel(profile.xp) / XP_PER_LEVEL) * 100;
  const offerTimer = useOfferTimer();
  const modeIndex = Math.max(0, MODES.findIndex((m) => m.id === mode));
  const currentMode = MODES[modeIndex]!;
  const nextMode = MODES[(modeIndex + 1) % MODES.length]!;


  return (
    <main
      className="relative grid h-[100dvh] w-full place-items-center overflow-hidden bg-[#0d0d0d] px-1 sm:px-2"
      style={{
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <h1 className="sr-only">Echo Vanguards — main menu</h1>

      {/* the "game screen": square stage the artwork fills — every HUD layer is
          positioned against this box so nothing floats outside the art */}
      <div className="relative aspect-square max-h-[100dvh] w-full max-w-[100dvh] overflow-hidden sm:max-h-[calc(100dvh-1rem)] lg:max-h-[100dvh]">
      {/* scene: painted arena backdrop with the squad standing centre stage */}
      <picture className="pointer-events-none">
        <source media="(max-width: 1023px)" srcSet={mobileMenuBg} />
        <img
          src={desktopMenuBg}
          alt="Echo — the squad surrounded by zombies, skeletons and blob monsters"
          className="absolute inset-0 h-full w-full object-cover object-center [image-rendering:auto]"
        />
      </picture>

      {/* ------------------------------------------------------------ top bar */}
      <header
        className="absolute inset-x-0 top-0 z-30 flex w-full max-w-full flex-col items-center px-2"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="grid w-full max-w-md grid-cols-[auto_minmax(0,1fr)] items-center gap-2 lg:max-w-3xl lg:gap-3">
          <button
            type="button"
            aria-label="Profile"
            onClick={() => onOpen({ kind: "modal", modal: "profile" })}
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-[oklch(0.12_0.02_292/55%)] backdrop-blur-sm transition-colors active:bg-white/15"
          >
            <User className="h-4 w-4 text-[oklch(0.86_0.09_200)]" strokeWidth={2.25} aria-hidden />
            <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[oklch(0.16_0.02_292)] px-1 text-[9px] font-semibold leading-4 tabular-nums text-gold shadow-[0_0_0_2px_oklch(0.12_0.02_292/80%)]">
              {level}
            </span>
            <span className="sr-only">{Math.round(xpPct)}% to next level</span>
          </button>

          <div className="flex shrink-0 items-center justify-end gap-1">
            <button
              type="button"
              aria-label={muted ? "Unmute sound" : "Mute sound"}
              onClick={onToggleMute}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-[oklch(0.12_0.02_292/55%)] backdrop-blur-sm"
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-foreground" strokeWidth={3} aria-hidden />
              ) : (
                <Volume2 className="h-4 w-4 text-foreground" strokeWidth={3} aria-hidden />
              )}
            </button>
            <button
              type="button"
              aria-label="Settings"
              onClick={() => onOpen({ kind: "modal", modal: "settings" })}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-[oklch(0.12_0.02_292/55%)] backdrop-blur-sm"
            >
              <Settings className="h-4 w-4 text-foreground" strokeWidth={3} aria-hidden />
            </button>
          </div>
        </div>
      </header>



      {/* ---------------------------------------------------------- side rails */}
       <nav
        aria-label="Live services"
         className="menu-rail no-scrollbar absolute left-1 top-14 z-20 hidden max-h-[calc(100dvh-9.5rem)] flex-col gap-1.5 overflow-y-auto sm:left-2 sm:top-20 sm:gap-2 lg:flex"
      >
        {LEFT_RAIL.map((item) => (
          <IconTile key={item.id} item={item} onOpen={onOpen} size="rail" />
        ))}
      </nav>

       <nav
        aria-label="Offers"
          className="menu-rail no-scrollbar absolute right-1 top-14 z-20 hidden max-h-[calc(100dvh-9.5rem)] flex-col items-center gap-1.5 overflow-y-auto sm:right-2 sm:top-20 sm:gap-2 lg:flex"
      >
        <TopPill
          icon={Gem}
          value={profile.gems.toLocaleString()}
          onPlus={() => onOpen({ kind: "modal", modal: "shop" })}
          tint="bg-[oklch(0.72_0.19_12)]"
        />
        <TopPill
          icon={Coins}
          value={profile.coins.toLocaleString()}
          onPlus={() => onOpen({ kind: "modal", modal: "shop" })}
          tint="bg-[oklch(0.86_0.16_88)]"
        />

        {RIGHT_RAIL.map((item) => (
          <IconTile key={item.id} item={item} onOpen={onOpen} size="rail" />
        ))}
      </nav>

      {/* ---- play button + mode toggle at very bottom ---- */}
      <div
        className="absolute inset-x-0 bottom-0 z-30 flex items-stretch gap-2 px-2 pb-1 sm:px-3"
        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={onPlay}
          disabled={!ready}
          className="flex-1 rounded-xl border-3 border-ink bg-linear-to-b from-[oklch(0.93_0.16_92)] to-[oklch(0.72_0.17_62)] py-2.5 shadow-[0_4px_0_var(--ink)] transition-transform active:translate-y-0.5 disabled:grayscale sm:py-3 sm:shadow-[0_5px_0_var(--ink)] sm:active:translate-y-1"
        >
          <div className="flex items-center justify-center gap-2">
            <Play className="h-5 w-5 text-ink sm:h-6 sm:w-6" strokeWidth={3.5} aria-hidden />
            <span className="text-lg font-black uppercase tracking-[0.12em] text-ink sm:text-2xl">
              {ready ? "Play" : "..."}
            </span>
          </div>
        </button>

        <button
          type="button"
          aria-label={`Run mode: ${currentMode.label}. Tap to change`}
          onClick={() => onMode(nextMode.id)}
          className="group shrink-0 rounded-2xl border-3 border-ink bg-[oklch(0.24_0.05_265)] p-1 shadow-[0_4px_0_var(--ink)] transition-transform active:translate-y-0.5 sm:shadow-[0_5px_0_var(--ink)] sm:active:translate-y-1"
        >
          <span className="flex h-full flex-col items-center justify-center rounded-xl bg-linear-to-b from-[oklch(0.72_0.16_248)] to-[oklch(0.48_0.19_258)] px-3 py-1 sm:px-4">
            <Swords
              className="h-3.5 w-3.5 text-[oklch(0.99_0_0)] sm:h-4 sm:w-4"
              strokeWidth={3}
              aria-hidden
            />
            <span className="mt-0.5 text-xs font-black uppercase leading-none tracking-[0.06em] text-[oklch(0.99_0_0)] sm:text-base">
              {currentMode.label}
            </span>
            <span className="text-[8px] font-black uppercase leading-none tracking-[0.18em] text-[oklch(0.88_0.06_248)] sm:text-[10px]">
              Mode
            </span>
          </span>
        </button>
      </div>

      {/* Mobile: floating currency pills + icon buttons, no backing strip */}
      <div className="absolute inset-x-0 bottom-16 z-30 flex justify-center px-2 sm:bottom-20 sm:px-3 lg:hidden">
        <nav
          aria-label="Menu"
          className="no-scrollbar flex w-full max-w-lg items-center justify-between gap-1.5 py-2 sm:gap-2"
        >

          <div className="flex items-center gap-1.5 sm:gap-2">
            <TopPill
              icon={Gem}
              value={profile.gems.toLocaleString()}
              onPlus={() => onOpen({ kind: "modal", modal: "shop" })}
              tint="bg-[oklch(0.72_0.19_12)]"
            />
            <TopPill
              icon={Coins}
              value={profile.coins.toLocaleString()}
              onPlus={() => onOpen({ kind: "modal", modal: "shop" })}
              tint="bg-[oklch(0.86_0.16_88)]"
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {MENU_BAR.map((item) => (
              <BarButton key={item.id} item={item} onOpen={onOpen} />
            ))}
          </div>
        </nav>
      </div>
      </div>
    </main>
  );
}
