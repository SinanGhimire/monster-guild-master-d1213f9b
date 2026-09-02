import type { CritterDesign, CritterHat } from "./critters";
import type { ClassKey } from "./classes";

/**
 * One chibi look per class. Every class shares the same body so the headgear
 * (and its accent colour) is what tells them apart in-game — exactly like the
 * class sheet the roster was designed from.
 */

const SKIN = "#e8c9a0";
const SKIN_SHADE = "#b8905d";
const EYE = "#181322";

type ClassLook = {
  hat: CritterHat;
  accent?: string;
  body?: string;
  shade?: string;
  eye?: string;
  brow?: CritterDesign["brow"];
  mouth?: CritterDesign["mouth"];
  glow?: string;
};

const LOOKS: Record<ClassKey, ClassLook> = {
  brawler: { hat: "none", accent: "#d24b4b", brow: "angry" },
  bandana: { hat: "bandana", accent: "#d24b4b" },
  boomerang: { hat: "boomerang", accent: "#b07b3f" },
  soldier: { hat: "armyhelm", accent: "#6e8b46" },
  ninja: { hat: "ninjamask", accent: "#20202c", brow: "angry" },
  assassin: { hat: "hood", accent: "#6d4d94", brow: "angry" },
  pirate: { hat: "piratehat", accent: "#c9392f" },
  viking: { hat: "vikinghelm", accent: "#b9bfcb", brow: "angry" },
  knight: { hat: "knighthelm", accent: "#c2c8d4" },
  gladiator: { hat: "gladiatorhelm", accent: "#c9392f", brow: "angry" },
  hunter: { hat: "feathercap", accent: "#5c8b47" },
  ranger: { hat: "greenhood", accent: "#4d7a3c" },
  mage: { hat: "wizardhat", accent: "#6b4bb5" },
  witch: { hat: "witchhat", accent: "#241f31" },
  druid: { hat: "antlers", accent: "#8a6234" },
  shaman: { hat: "featherband", accent: "#7a6046" },
  monk: { hat: "headband", accent: "#e08a34" },
  paladin: { hat: "headband", accent: "#e9e6dd" },
  cleric: { hat: "mitre", accent: "#e2b33c" },
  engineer: { hat: "goggles", accent: "#63b7e8" },
  alchemist: { hat: "goggles", accent: "#7bd06a" },
  chemist: { hat: "gasmask", accent: "#5c6b3a" },
  doctor: { hat: "headmirror", accent: "#e7e4dc" },
  psycho: { hat: "mohawk", accent: "#9b4bd6", brow: "angry", mouth: "grin" },
  jester: { hat: "jesterhat", accent: "#cf3f46", mouth: "grin" },
  clown: { hat: "afro", accent: "#e3453f", mouth: "grin" },
  ghost: {
    hat: "sheet",
    accent: "#f4f3fb",
    body: "#f4f3fb",
    shade: "#c8c6d8",
    glow: "rgba(240,240,255,0.3)",
  },
  cultist: { hat: "cultisthood", accent: "#1c1a24", brow: "angry" },
  demon: { hat: "demonhorns", accent: "#c9392f", brow: "angry", mouth: "fangs" },
  reaper: {
    hat: "reaperhood",
    accent: "#17151f",
    brow: "angry",
    glow: "rgba(120,255,205,0.22)",
  },
};

/** Art key used by the sprite loader / renderer for a given class. */
export function classArtKey(cls: ClassKey): string {
  return `c_${cls}`;
}

export const CLASS_DESIGNS: Record<string, CritterDesign> = Object.fromEntries(
  (Object.keys(LOOKS) as ClassKey[]).map((cls) => {
    const look = LOOKS[cls];
    const design: CritterDesign = {
      key: classArtKey(cls),
      name: cls,
      body: look.body ?? SKIN,
      shade: look.shade ?? SKIN_SHADE,
      eye: look.eye ?? EYE,
      shape: "egg",
      crown: "none",
      mouth: look.mouth ?? "none",
      eyes: 2,
      legs: "two",
      arms: true,
      tail: false,
      size: 0.92,
      pattern: "none",
      brow: look.brow ?? "flat",
      hat: look.hat,
      ...(look.accent ? { accent: look.accent } : {}),
      ...(look.glow ? { glow: look.glow } : {}),
    };
    return [design.key, design];
  }),
);
