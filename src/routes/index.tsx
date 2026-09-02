import { createFileRoute } from "@tanstack/react-router";
import { Pause, Volume2, VolumeX } from "lucide-react";
import { MenuPanel, type PanelKey } from "@/components/MenuPanel";
import { ArtMenu, type ArtTarget } from "@/components/ArtMenu";
import type { ClassKey } from "@/game/classes";
import { useEffect, useRef, useState } from "react";
import { loadSprites, type Sprites } from "@/game/assets";
import homeArtAsset from "@/assets/echo-home-art.png.asset.json";
import { initAudio, loadMuted, playSfx, setMuted, type SfxName } from "@/game/audio";
import {
  WEAPONS,
  CHARACTERS,
  SPECIES_STATS,
  createState,
  render,
  setViewport,
  update,
  WORLD_H,
  WORLD_W,
  advanceWave,
  type Input,
} from "@/game/engine";
import { PLAYER_CHARACTERS, ensureClassSkin } from "@/game/assets";
import echoLogo from "@/assets/echo-loading-logo.png.asset.json";
import { initNative } from "@/lib/native";
import type { CharacterKey, GameState, RunMode, WeaponKey } from "@/game/types";
import { RARITY_COLOR, UPGRADE_MAP } from "@/game/upgrades";
import { WaveShop } from "@/components/WaveShop";
import { SpriteIcon } from "@/components/SpriteIcon";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Echo Vanguards" },
      {
        name: "description",
        content:
          "Survive endless zombie waves. Your gun auto-tracks up close — hold fire to aim yourself for +35% damage. Past runs return as Echoes to fight beside you.",
      },
      { property: "og:title", content: "Echo Vanguards" },
      {
        property: "og:description",
        content:
          "Survive endless zombie waves. Your gun auto-tracks up close — hold fire to aim yourself for +35% damage. Past runs return as Echoes to fight beside you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

interface Hud {
  hp: number;
  maxHp: number;
  score: number;
  wave: number;
  waveTimer: number;
  echoTimer: number;
  echoes: number;
  weapon: WeaponKey;
  over: boolean;
  won: boolean;
  level: number;
  xp: number;
  xpToNext: number;
  kills: number;
  enemies: number;
  time: number;
  perks: { id: string; n: number }[];
  paused: boolean;
  materials: number;
  phase: "wave" | "shop";
}

const INITIAL_HUD: Hud = {
  hp: 100,
  maxHp: 100,
  score: 0,
  wave: 1,
  waveTimer: 28,
  echoTimer: 30,
  echoes: 0,
  weapon: "rifle",
  over: false,
  won: false,
  level: 1,
  xp: 0,
  xpToNext: 10,
  kills: 0,
  enemies: 0,
  time: 0,
  perks: [],
  paused: false,
  materials: 0,
  phase: "wave",
};

function Stick({
  side,
  onChange,
  onEnd,
}: {
  side: "left" | "right";
  onChange: (dx: number, dy: number) => void;
  onEnd: () => void;
}) {
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const RADIUS = 56;

  return (
    <div
      className={`pointer-events-auto absolute bottom-4 ${side === "left" ? "left-4" : "right-4"} h-32 w-32 touch-none select-none rounded-full border-2 border-ink/50 bg-[oklch(0.1_0.01_265/40%)] backdrop-blur-sm sm:bottom-8`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        originRef.current = { x: e.clientX, y: e.clientY };
        setKnob({ x: 0, y: 0 });
      }}
      onPointerMove={(e) => {
        const o = originRef.current;
        if (!o) return;
        let dx = e.clientX - o.x;
        let dy = e.clientY - o.y;
        const d = Math.hypot(dx, dy);
        if (d > RADIUS) {
          dx = (dx / d) * RADIUS;
          dy = (dy / d) * RADIUS;
        }
        setKnob({ x: dx, y: dy });
        onChange(dx / RADIUS, dy / RADIUS);
      }}
      onPointerUp={() => {
        originRef.current = null;
        setKnob(null);
        onEnd();
      }}
      onPointerCancel={() => {
        originRef.current = null;
        setKnob(null);
        onEnd();
      }}
    >
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border border-primary/60 bg-primary/25"
        style={{
          transform: `translate(calc(-50% + ${knob?.x ?? 0}px), calc(-50% + ${knob?.y ?? 0}px))`,
        }}
      />
    </div>
  );
}

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createState("spike", "survival"));
  const spritesRef = useRef<Sprites | null>(null);
  const inputRef = useRef<Input>({
    keys: new Set<string>(),
    mouse: { x: WORLD_W / 2 + 120, y: WORLD_H / 2 },
    firing: false,
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    autoAim: false,
  });
  const [ready, setReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [screen, setScreen] = useState<"art" | "select" | "play">("art");
  const [mode, setMode] = useState<RunMode>("survival");
  const [panel, setPanel] = useState<PanelKey | null>("gift");
  const [character, setCharacter] = useState<CharacterKey>("spike");
  const [cls, setCls] = useState<ClassKey>("soldier");
  const [best, setBest] = useState(0);
  const [muted, setMutedState] = useState(false);
  const [touch, setTouch] = useState(false);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => {
    setMutedState(loadMuted());
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const stored = Number(window.localStorage.getItem("void-arena:best") ?? 0);
    if (Number.isFinite(stored)) setBest(stored);
    void initNative();

    const onPause = () => {
      const st = stateRef.current;
      if (!st.over && !st.paused && st.phase === "wave") st.paused = true;
    };
    window.addEventListener("echo-pause", onPause);
    return () => window.removeEventListener("echo-pause", onPause);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoadingProgress(10);
    const progressInterval = setInterval(() => {
      setLoadingProgress((p) => Math.min(p + 8, 90));
    }, 200);
    loadSprites().then((s) => {
      if (!mounted) return;
      clearInterval(progressInterval);
      setLoadingProgress(100);
      spritesRef.current = s;
      setTimeout(() => setReady(true), 300);
    });
    return () => {
      mounted = false;
      clearInterval(progressInterval);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void ensureClassSkin(cls);
  }, [ready, cls]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready || screen !== "play") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    stateRef.current = createState(character, mode, cls);
    const input = inputRef.current;
    input.firing = false;
    input.keys.clear();
    input.moveX = 0;
    input.moveY = 0;
    input.aimX = 0;
    input.aimY = 0;
    input.autoAim = touch;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);
      const aspect = cssW / cssH;
      const lh = Math.round(Math.min(1000, Math.max(520, 720 * Math.sqrt(16 / 9 / aspect))));
      const lw = Math.round(lh * aspect);
      setViewport(lw, lh);
      canvas.width = Math.floor(lw * dpr);
      canvas.height = Math.floor(lh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);

    const toWorld = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      input.mouse.x = ((clientX - r.left) / r.width) * WORLD_W;
      input.mouse.y = ((clientY - r.top) / r.height) * WORLD_H;
    };

    const onMove = (e: PointerEvent) => toWorld(e.clientX, e.clientY);
    const onDown = (e: PointerEvent) => {
      toWorld(e.clientX, e.clientY);
      if (e.button === 0) input.firing = true;
    };
    const onUp = () => {
      input.firing = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", " ", "q"].includes(k)) e.preventDefault();
      if (k === "escape" || k === "p") {
        const st = stateRef.current;
        if (!st.over) st.paused = !st.paused;
      }
      input.keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => input.keys.delete(e.key.toLowerCase());
    const onBlur = () => {
      input.keys.clear();
      input.firing = false;
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = stateRef.current;
      const sprites = spritesRef.current;
      const t0 = performance.now();
      update(s, input, dt);
      const t1 = performance.now();
      if (s.sfx.length) {
        for (const name of s.sfx) playSfx(name as SfxName);
        s.sfx.length = 0;
      }
      if (sprites) render(ctx, s, sprites, now / 1000);
      const t2 = performance.now();
      (window as unknown as Record<string, unknown>)["__perf"] = {
        u: t1 - t0,
        r: t2 - t1,
        e: s.enemies.length,
        b: s.bullets.length,
        p: s.particles.length,
      };

      hudAcc += dt;
      if (hudAcc > 0.1) {
        hudAcc = 0;
        setHud({
          hp: s.player.hp,
          maxHp: s.player.maxHp,
          score: s.score,
          wave: s.wave,
          waveTimer: Math.max(0, s.waveTimer),
          echoTimer: Math.max(0, s.echoTimer),
          echoes: s.echoes.length,
          weapon: s.player.weapon,
          over: s.over,
          won: s.won,
          level: s.level,
          xp: s.xp,
          xpToNext: s.xpToNext,
          kills: s.kills,
          enemies: s.enemies.filter((e) => !e.dying).length,
          time: s.time,
          perks: Object.entries(s.takenUpgrades).map(([id, n]) => ({ id, n })),
          paused: s.paused,
          materials: s.materials,
          phase: s.phase,
        });
        // Expose state for debugging
        (window as any).__game = s;
        if (s.over) {
          setBest((b) => {
            const next = Math.max(b, s.score);
            window.localStorage.setItem("void-arena:best", String(next));
            return next;
          });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [ready, restartKey, screen, character, touch, mode, cls]);

  const weapon = WEAPONS[hud.weapon];

  const startRun = () => {
    if (!ready) return;
    initAudio();
    playSfx("ui");
    // Random character each run
    const randomChar = PLAYER_CHARACTERS[Math.floor(Math.random() * PLAYER_CHARACTERS.length)]!.key;
    setCharacter(randomChar);
    setHud(INITIAL_HUD);
    void ensureClassSkin(cls).then(() => {
      setRestartKey((k) => k + 1);
      setScreen("play");
    });
  };

  const goToSelect = () => {
    if (!ready) return;
    initAudio();
    playSfx("ui");
    setScreen("select");
  };

  const toggleMute = () => {
    const next = !muted;
    initAudio();
    setMuted(next);
    setMutedState(next);
  };

  // Splash / loading screen
  if (!ready) {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-[#0a0812]">
        <div className="flex flex-col items-center gap-6">
          <img
            src={echoLogo.url}
            alt="Echo — survive, upgrade, echo"
            className="w-64 max-w-[70vw] drop-shadow-[0_0_40px_rgba(138,90,214,0.45)]"
          />
          <div className="w-48 overflow-hidden rounded-full border-2 border-[#0a0812] bg-[#1a1428]">
            <div
              className="h-2 rounded-full bg-linear-to-r from-[#e8b84d] to-[#c8922a] transition-[width] duration-200 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e8b84d]/60">
            Loading assets...
          </p>
        </div>
      </div>
    );
  }

  if (screen === "art") {
    return (
      <>
        <ArtMenu
          mode={mode}
          onMode={(m: RunMode) => {
            playSfx("ui");
            setMode(m);
          }}
          onPlay={startRun}
          onOpen={(t: ArtTarget) => {
            playSfx("ui");
            if (t.kind === "tab") setPanel(t.tab);
            else if (t.kind === "modal") setPanel(t.modal as PanelKey);
          }}
          muted={muted}
          onToggleMute={toggleMute}
          ready={ready}
        />

        {panel && (
          <MenuPanel
            panel={panel}
            onClose={() => {
              playSfx("ui");
              setPanel(null);
            }}
            character={character}
            onSelect={(k) => {
              playSfx("ui");
              setCharacter(k);
            }}
            cls={cls}
            onSelectClass={(k) => {
              playSfx("ui");
              setCls(k);
            }}
            best={best}
            muted={muted}
            onToggleMute={toggleMute}
          />
        )}
      </>
    );
  }

  if (screen === "select") {


    return (
      <main
        className="relative grid h-[100dvh] w-full place-items-center overflow-hidden"
        style={{
          background: `url(${homeArtAsset.url}) center/cover no-repeat, oklch(0.04 0.01 280)`,
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="relative flex h-full w-full max-w-5xl flex-col items-center gap-3 overflow-y-auto px-2 py-4 sm:gap-5 sm:py-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-1.5">
            <h2 className="text-title bg-linear-to-r from-[#ffd866] via-[#ffb347] to-[#ff8c42] bg-clip-text text-2xl font-black uppercase tracking-[0.15em] text-transparent sm:text-4xl">
              Choose Your Hero
            </h2>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[oklch(0.55_0.02_292/80%)] sm:text-xs">
              Each hero has a unique starting weapon and stats
            </p>
          </div>

          {/* Character Grid */}
          <div className="grid w-full grid-cols-2 gap-2.5 px-1 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
            {PLAYER_CHARACTERS.map((c) => {
              const stat = CHARACTERS[c.key];
              const isSelected = character === c.key;
              const weapon = WEAPONS[stat.weapon];

              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    playSfx("ui");
                    setCharacter(c.key);
                  }}
                  className={`group relative flex flex-col items-center gap-1 rounded-2xl border-2 p-2.5 transition-all duration-200 sm:p-3 ${
                    isSelected
                      ? `border-gold bg-[linear-gradient(180deg,${weapon.color}15,oklch(0.16_0.03_88/95%))] shadow-[0_0_30px_${weapon.color}25,0_4px_20px_oklch(0.0_0_0/50%)] scale-[1.04]`
                      : "border-[oklch(1_0_0/10%)] bg-[oklch(0.1_0.02_292/50%)] hover:border-[oklch(1_0_0/30%)] hover:bg-[oklch(0.13_0.02_292/65%)] hover:shadow-[0_4px_12px_oklch(0_0_0/30%)]"
                  }`}
                >
                  {/* Selected glow ring */}
                  {isSelected && (
                    <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ boxShadow: `inset 0 1px 0 ${weapon.color}33, 0 0 40px ${weapon.color}15` }} />
                  )}

                  {/* Portrait */}
                  <div className="relative">
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl border-2 sm:h-20 sm:w-20" style={{ borderColor: isSelected ? weapon.color + "55" : "oklch(1 0 0 / 8%)", background: `linear-gradient(180deg, ${weapon.color}08, transparent)` }}>
                      <div
                        className="h-full w-full [image-rendering:pixelated]"
                        style={{
                          backgroundImage: `url(${c.portrait})`,
                          backgroundSize: `calc(100% * ${c.frames || 1}) 100%`,
                          backgroundPosition: "left center",
                          backgroundRepeat: "no-repeat",
                        }}
                      />
                    </div>
                    {isSelected && (
                      <div className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-ink text-[11px] font-black text-ink shadow-lg" style={{ background: `linear-gradient(135deg, ${weapon.color}, ${weapon.color}cc)` }}>
                        ✓
                      </div>
                    )}
                  </div>

                  {/* Name + Rarity hint */}
                  <span className="text-[11px] font-black uppercase tracking-wide text-foreground sm:text-sm">
                    {stat.name}
                  </span>

                  {/* Weapon badge */}
                  <span
                    className="rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider sm:text-[9px]"
                    style={{ borderColor: weapon.color + "44", backgroundColor: weapon.color + "15", color: weapon.color }}
                  >
                    {weapon.name}
                  </span>

                  {/* Stats: DMG + ATK SPD only */}
                  <div className="flex items-center justify-center gap-3 text-[8px] font-bold uppercase tracking-wider sm:text-[9px]">
                    <span className="text-rose-400/90">DMG {stat.damage}x</span>
                    <span className="text-amber-400/90">ATK {Math.round(1 / WEAPONS[stat.weapon].rate)}s</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected hero details card */}
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[oklch(1_0_0/12%)] bg-[linear-gradient(180deg,oklch(0.12_0.03_292/70%),oklch(0.08_0.02_292/90%))] backdrop-blur-md">
            <div className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg" style={{ color: WEAPONS[CHARACTERS[character].weapon].color }}>⚔</span>
                <span className="font-display text-sm font-black" style={{ color: WEAPONS[CHARACTERS[character].weapon].color }}>
                  {WEAPONS[CHARACTERS[character].weapon].name}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[oklch(0.5_0.01_292/60%)]">•</span>
              <p className="flex-1 text-[11px] font-medium text-[oklch(0.7_0.03_292)] sm:text-xs">
                {CHARACTERS[character].blurb}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                playSfx("ui");
                setScreen("art");
              }}
              className="rounded-xl border-2 border-[oklch(1_0_0/15%)] bg-[oklch(0.12_0.02_292/70%)] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[oklch(0.7_0.01_292)] transition-all hover:border-[oklch(1_0_0/25%)] hover:bg-[oklch(0.18_0.03_292/80%)] hover:shadow-[0_2px_12px_oklch(0_0_0/20%)] sm:px-6 sm:text-sm"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={startRun}
              className="group relative flex items-center gap-2 overflow-hidden rounded-xl border-3 border-ink bg-linear-to-b from-[oklch(0.93_0.16_92)] to-[oklch(0.72_0.17_62)] px-6 py-2.5 shadow-[0_5px_0_var(--ink)] transition-all hover:brightness-110 active:translate-y-1 sm:px-10 sm:py-3"
            >
              <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative text-base font-black uppercase tracking-[0.12em] text-ink sm:text-xl">
                ▶ FIGHT
              </span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-arena-frame p-0 md:p-3">
      <h1 className="sr-only">Echo Vanguards - arena run</h1>

      <div className="relative h-full w-full">
        <canvas
          ref={canvasRef}
          className="h-full w-full md:rounded-2xl md:border-4 md:border-ink md:shadow-soft"
          style={{ cursor: "crosshair", imageRendering: "pixelated", touchAction: "none" }}
          aria-label="Game arena"
        />

        {/* BROTATO-STYLE HUD OVERLAY */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            paddingLeft: "max(0.375rem, env(safe-area-inset-left))",
            paddingRight: "max(0.375rem, env(safe-area-inset-right))",
            paddingTop: "max(0.375rem, env(safe-area-inset-top))",
            paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))",
          }}
        >
          {/* TOP ROW: HP left, timer center, score right */}
          <div className="flex items-start justify-between px-1 pt-1 sm:px-3 sm:pt-2">

            {/* LEFT: Level badge + HP bar + currency */}
            <div className="flex flex-col gap-1">
              <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[2px] border-ink bg-primary font-display text-[9px] leading-none text-white shadow-[0_2px_0_oklch(0.06_0_0/60%)]">
                {hud.level}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px]">🪙</span>
                <span className="font-display text-[11px] leading-none tabular-nums text-gold [text-shadow:0_1px_3px_oklch(0_0_0/80%)]">
                  {hud.materials}
                </span>
              </div>
            </div>

            {/* CENTER: Wave timer */}
            <div className="flex flex-col items-center" aria-live="polite">
              <span className="font-display text-2xl leading-none text-white [text-shadow:0_2px_6px_oklch(0_0_0/70%)] sm:text-3xl">
                {Math.ceil(hud.waveTimer)}
              </span>
              <p className="font-display text-[8px] uppercase tracking-[0.25em] text-white/60 [text-shadow:0_1px_3px_oklch(0_0_0/60%)] sm:text-[9px]">
                Wave {hud.wave}
              </p>
            </div>

            {/* RIGHT: Score + echo + controls */}
            <div className="flex items-start gap-1.5">
              <div className="flex flex-col items-end">
                <span className="font-display text-[10px] leading-none tabular-nums text-white [text-shadow:0_1px_4px_oklch(0_0_0/70%)] sm:text-xs">
                  {hud.score.toLocaleString()}
                </span>
                <div className="mt-0.5 flex items-center gap-1">
                  <span className="text-[8px] font-black uppercase tracking-wider text-white/50 [text-shadow:0_1px_3px_oklch(0_0_0/60%)]">
                    Echo {String(Math.ceil(hud.echoTimer)).padStart(2, "0")}
                  </span>
                  {hud.echoes > 0 && (
                    <span className="text-[9px] font-black text-primary [text-shadow:0_1px_3px_oklch(0_0_0/60%)]">x{hud.echoes}</span>
                  )}
                </div>
              </div>
              <div className="pointer-events-auto flex flex-col gap-1">
                <button
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute sound" : "Mute sound"}
                  className="grid h-7 w-7 place-items-center rounded-md border-[2px] border-ink/40 bg-[oklch(0.1_0.01_0/50%)] backdrop-blur-sm"
                >
                  {muted ? (
                    <VolumeX className="h-3.5 w-3.5 text-white/70" strokeWidth={2.75} aria-hidden />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-white/70" strokeWidth={2.75} aria-hidden />
                  )}
                </button>
                <button
                  onClick={() => {
                    const st = stateRef.current;
                    if (!st.over) st.paused = !st.paused;
                  }}
                  aria-label="Pause game"
                  className="grid h-7 w-7 place-items-center rounded-md border-[2px] border-ink/40 bg-[oklch(0.1_0.01_0/50%)] backdrop-blur-sm"
                >
                  <Pause className="h-3.5 w-3.5 text-white/70" strokeWidth={2.75} aria-hidden />
                </button>
              </div>
            </div>
          </div>

          {/* BOTTOM: Perks + weapon label + XP bar + hint */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-0.5 px-2 pb-1 sm:px-4">
            {hud.perks.length > 0 && (
              <div className="flex flex-wrap justify-center gap-0.5">
                {hud.perks.map(({ id, n }) => {
                  const u = UPGRADE_MAP[id];
                  if (!u) return null;
                  const col = RARITY_COLOR[u.rarity];
                  return (
                    <span
                      key={id}
                      title={`${u.name} - ${u.desc}`}
                      className="flex items-center gap-0.5 rounded-sm px-1 py-px text-[9px] font-black leading-none"
                      style={{
                        background: `color-mix(in oklab, ${col} 25%, transparent)`,
                        color: col,
                        border: `1px solid color-mix(in oklab, ${col} 40%, transparent)`,
                      }}
                    >
                      <span>{u.icon}</span>
                      {n > 1 && <span className="opacity-80">x{n}</span>}
                    </span>
                  );
                })}
              </div>
            )}

            <span
              className="font-display text-[9px] uppercase tracking-[0.2em] [text-shadow:0_1px_3px_oklch(0_0_0/80%)]"
              style={{ color: weapon.color }}
            >
              {weapon.name}
            </span>

            {/* equipped gun */}
            <div className="pointer-events-none flex items-end gap-1.5">
              <Slot label="1" color={weapon.color} sprite={weapon.sprite as string} cd={0} />
            </div>

            <p className="text-center text-[7px] font-bold text-white/30 [text-shadow:0_1px_2px_oklch(0_0_0/50%)] sm:text-[8px]">
              {touch ? "Left stick move - right stick focus (+35%)" : "WASD - hold click focus fire (+35%) - Esc pauses"}
            </p>
          </div>
        </div>

        {/* Touch sticks */}
        {touch && !hud.over && (
          <>
            <Stick
              side="left"
              onChange={(dx, dy) => {
                const inp = inputRef.current;
                inp.moveX = dx;
                inp.moveY = dy;
              }}
              onEnd={() => {
                const inp = inputRef.current;
                inp.moveX = 0;
                inp.moveY = 0;
              }}
            />
            <Stick
              side="right"
              onChange={(dx, dy) => {
                const inp = inputRef.current;
                inp.aimX = dx;
                inp.aimY = dy;
              }}
              onEnd={() => {
                const inp = inputRef.current;
                inp.aimX = 0;
                inp.aimY = 0;
              }}
            />
          </>
        )}

        {/* Between-wave weapon shop */}
        {hud.phase === "shop" && !hud.over && (
          <WaveShop state={stateRef.current} onLeave={() => setHud((h) => ({ ...h, phase: "wave" }))} />
        )}

        {/* Pause screen */}
        {hud.paused && !hud.over && hud.phase !== "shop" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[oklch(0.08_0.02_292/0.72)] p-4 backdrop-blur-md">
            <div className="pop-shell animate-float-up w-full max-w-sm rounded-3xl p-6 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.45em] text-gold">Standby</p>
              <h2 className="text-title mt-1 text-4xl leading-none">Paused</h2>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { k: "Wave", v: hud.wave },
                  { k: "Level", v: hud.level },
                  { k: "Kills", v: hud.kills },
                ].map((st) => (
                  <div key={st.k} className="pop-tray rounded-xl py-2">
                    <p className="text-lg font-black tabular-nums text-foreground">{st.v}</p>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-pop-edge">
                      {st.k}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={() => {
                    const st = stateRef.current;
                    st.paused = false;
                  }}
                  className="pop-buy press w-full rounded-2xl py-3 text-sm font-black uppercase tracking-[0.2em]"
                >
                  Resume
                </button>
                <button
                  onClick={() => setScreen("art")}
                  className="pop-quiet press w-full rounded-2xl py-2.5 text-xs font-black uppercase tracking-[0.2em] text-foreground"
                >
                  Quit to menu
                </button>
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Esc or P also resumes
              </p>
            </div>
          </div>
        )}

        {/* Game over screen */}
        {hud.over && (
          <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto rounded-2xl bg-[oklch(0.07_0.02_292/0.8)] p-4 backdrop-blur-md">
            <div className="pop-shell animate-float-up w-full max-w-md rounded-3xl p-6 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.45em] text-destructive">
                {hud.won ? "Signal stabilized" : "Signal lost"}
              </p>
              <h2 className="text-title mt-1 text-4xl leading-none">
                {hud.won ? "Survival cleared" : "Run over"}
              </h2>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { k: "Score", v: hud.score.toLocaleString() },
                  { k: "Wave", v: hud.wave },
                  { k: "Kills", v: hud.kills },
                  { k: "Time", v: `${Math.floor(hud.time)}s` },
                ].map((st) => (
                  <div key={st.k} className="pop-tray rounded-xl py-2">
                    <p className="text-lg font-black tabular-nums text-foreground">{st.v}</p>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-pop-edge">
                      {st.k}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                Best <span className="text-gold">{Math.max(best, hud.score).toLocaleString()}</span>
              </p>


              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => setRestartKey((k) => k + 1)}
                  className="pop-buy press flex-1 rounded-2xl py-3 text-sm font-black uppercase tracking-[0.2em]"
                >
                  Play again
                </button>
                <button
                  onClick={() => setScreen("art")}
                  className="pop-quiet press flex-1 rounded-2xl py-3 text-sm font-black uppercase tracking-[0.2em] text-foreground"
                >
                  Main menu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/** Small HUD tile showing an equipped slot and its cooldown sweep. */
function Slot({
  label,
  color,
  sprite,
  icon,
  cd,
}: {
  label: string;
  color: string;
  sprite?: string;
  icon?: string;
  cd: number;
}) {
  const pct = Math.max(0, Math.min(1, cd));
  return (
    <div
      className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl border-2"
      style={{
        borderColor: `color-mix(in oklab, ${color} 55%, transparent)`,
        background: "oklch(0.08 0.02 285 / 0.65)",
      }}
    >
      {sprite ? (
        <div className="h-9 w-9"><SpriteIcon sprite={sprite} /></div>
      ) : (
        <span className="text-xl leading-none">{icon}</span>
      )}
      {pct > 0 && (
        <span
          className="absolute inset-x-0 bottom-0 bg-[oklch(0_0_0/0.6)]"
          style={{ height: `${pct * 100}%` }}
        />
      )}
      {label && (
        <span className="absolute bottom-0 right-0.5 text-[7px] font-black text-white/60">
          {label}
        </span>
      )}
    </div>
  );
}

