import { useState } from "react";
import { SpriteIcon } from "@/components/SpriteIcon";
import {
  WEAPONS,
  buyWeapon,
  closeShop,
  equipWeapon,
  rerollPrice,
  rerollShop,
  weaponPrice,
} from "@/game/engine";

import type { GameState, WeaponKey, WeaponRarity } from "@/game/types";

const RARITY_COLOR: Record<WeaponRarity, string> = {
  common: "#9fd8ff",
  uncommon: "#7bf2a8",
  rare: "#c77dff",
  epic: "#ffd166",
  legendary: "#ff7b4d",
};

function stats(key: WeaponKey) {
  const w = WEAPONS[key];
  return [
    { k: "DPS", v: Math.round((w.damage * w.pellets) / w.rate) },
    { k: "DMG", v: Math.round(w.damage * w.pellets) },
    { k: "RPS", v: (1 / w.rate).toFixed(1) },
    { k: "VEL", v: Math.round(w.speed) },
  ];
}

/** One purchasable card — big readable sprite, name, stats, price. */
function OfferCard({
  sprite,
  name,
  sub,
  color,
  rows,
  owned,
  price,
  canBuy,
  onBuy,
}: {
  sprite?: string;
  name: string;
  sub: string;
  color: string;
  rows: { k: string; v: string | number }[];
  owned: boolean;
  price: number;
  canBuy: boolean;
  onBuy: () => void;
}) {
  return (
    <div
      className="pop-tray group flex items-center gap-3 rounded-2xl p-3 text-left transition-transform duration-150 hover:-translate-y-0.5"
      style={{
        borderColor: `color-mix(in oklab, ${color} 55%, transparent)`,
        boxShadow: `0 0 0 1px color-mix(in oklab, ${color} 18%, transparent), 0 10px 22px -14px ${color}`,
      }}
    >
      <div
        className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl"
        style={{
          background: `radial-gradient(circle at 50% 45%, color-mix(in oklab, ${color} 30%, transparent), transparent 70%)`,
          border: `2px solid color-mix(in oklab, ${color} 35%, transparent)`,
        }}
      >
        {sprite ? (
          <SpriteIcon sprite={sprite} className="h-full w-full p-1" tint={color} />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm leading-tight" style={{ color }}>
          {name}
        </p>
        <p
          className="mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.2em]"
          style={{ background: `color-mix(in oklab, ${color} 22%, transparent)`, color }}
        >
          {sub}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
          {rows.map((st) => (
            <span key={st.k} className="text-[9px] font-black tabular-nums text-muted-foreground">
              {st.k} <span className="text-foreground">{st.v}</span>
            </span>
          ))}
        </div>
      </div>
      <button
        disabled={!canBuy}
        onClick={onBuy}
        className={`press shrink-0 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.15em] ${
          canBuy ? "pop-buy" : "pop-quiet opacity-50"
        }`}
      >
        {owned ? "Owned" : `🪙 ${price}`}
      </button>
    </div>
  );
}

function SlotStrip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-pop-edge">{label}</p>
      <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-2">{children}</div>
    </div>
  );
}

/** Between-wave armoury: guns only, one equipped slot. */
export function WaveShop({ state, onLeave }: { state: GameState; onLeave: () => void }) {
  const [, setTick] = useState(0);
  const bump = () => setTick((n) => n + 1);
  const s = state;
  const reroll = rerollPrice(s);

  const equippedGun = WEAPONS[s.player.weapon];
  const totalGuns = Object.keys(WEAPONS).length;

  const weaponCards = (keys: WeaponKey[]) =>
    keys.map((key) => {
      const w = WEAPONS[key];
      const price = weaponPrice(key, s.wave);
      const owned = s.arsenal.includes(key);
      return (
        <OfferCard
          key={key}
          sprite={w.sprite as string}
          name={w.name}
          sub={`${w.rarity} · ${w.archetype ?? "gun"}`}
          color={RARITY_COLOR[w.rarity]}
          rows={stats(key)}
          owned={owned}
          price={price}
          canBuy={!owned && s.materials >= price}
          onBuy={() => {
            buyWeapon(s, key);
            bump();
          }}
        />
      );
    });

  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[oklch(0.07_0.02_292/0.88)] p-3 backdrop-blur-md md:rounded-2xl">
      <div className="pop-shell animate-float-up my-auto w-full max-w-3xl rounded-3xl p-4 sm:p-6">
        <div className="flex items-end justify-between gap-3">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.45em] text-gold">
              Wave {s.wave} cleared
            </p>
            <h2 className="text-title text-3xl leading-none sm:text-4xl">Armoury</h2>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.25em] text-pop-edge">
              Guns <span className="tabular-nums text-foreground">{s.arsenal.length}</span> / {totalGuns}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border-2 border-ink/40 px-3 py-1.5">
            <span className="text-base">🪙</span>
            <span className="font-display text-lg leading-none tabular-nums text-gold">
              {s.materials}
            </span>
          </div>
        </div>

        {/* equipped weapon */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 p-3"
          style={{ borderColor: equippedGun.color, background: `color-mix(in oklab, ${equippedGun.color} 14%, transparent)` }}
        >
          <div className="h-12 w-20 shrink-0"><SpriteIcon sprite={equippedGun.sprite as string} tint={equippedGun.color} /></div>
          <div className="text-left">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-pop-edge">Equipped</p>
            <p className="text-sm font-black" style={{ color: equippedGun.color }}>
              {equippedGun.name}
            </p>
          </div>
        </div>

        <SlotStrip label="Guns for sale">{weaponCards(s.shopOffers)}</SlotStrip>
        <OwnedRow
          keys={s.arsenal}
          active={s.player.weapon}
          onPick={(k) => {
            equipWeapon(s, k);
            bump();
          }}
        />

        <div className="pop-tray sticky bottom-0 mt-5 flex flex-col gap-2 rounded-2xl p-2 sm:flex-row">
          <button
            disabled={s.materials < reroll}
            onClick={() => {
              rerollShop(s);
              bump();
            }}
            className={`press flex-1 rounded-2xl py-3 text-xs font-black uppercase tracking-[0.2em] ${
              s.materials < reroll ? "pop-quiet opacity-50" : "pop-quiet"
            }`}
          >
            Reroll 🪙 {reroll}
          </button>
          <button
            onClick={() => {
              closeShop(s);
              onLeave();
            }}
            className="pop-buy press flex-1 rounded-2xl py-3 text-sm font-black uppercase tracking-[0.2em]"
          >
            Start wave {s.wave + 1}
          </button>
        </div>
      </div>
    </div>
  );
}

function OwnedRow({
  keys,
  active,
  onPick,
}: {
  keys: WeaponKey[];
  active: WeaponKey;
  onPick: (k: WeaponKey) => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-pop-edge">Owned</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {keys.map((key) => {
          const w = WEAPONS[key];
          const on = key === active;
          return (
            <button
              key={key}
              onClick={() => onPick(key)}
              className="press flex items-center gap-1.5 rounded-xl border-2 px-2 py-1.5"
              style={{
                borderColor: on ? w.color : "color-mix(in oklab, currentColor 20%, transparent)",
                background: on ? `color-mix(in oklab, ${w.color} 22%, transparent)` : "transparent",
              }}
            >
              <div className="h-8 w-8 shrink-0"><SpriteIcon sprite={w.sprite as string} tint={w.color} /></div>
              <span
                className="text-[10px] font-black uppercase tracking-wider"
                style={{ color: w.color }}
              >
                {w.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
