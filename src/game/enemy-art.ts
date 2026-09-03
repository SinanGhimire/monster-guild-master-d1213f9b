import type { CritterEnemyKey } from "./critters";

/**
 * Hand-drawn enemy artwork.
 *
 * Each entry points at three ready-made horizontal sprite strips that already
 * match the engine's frame budget (idle 6, walk 8, death 10), so they are fed
 * straight to the renderer instead of being puppet-animated from a still.
 */

import skelWhiteIdle from "@/assets/foes/skel_white-idle.png";
import skelWhiteWalk from "@/assets/foes/skel_white-walk.png";
import skelWhiteDeath from "@/assets/foes/skel_white-death.png";
import skelGoldIdle from "@/assets/foes/skel_gold-idle.png";
import skelGoldWalk from "@/assets/foes/skel_gold-walk.png";
import skelGoldDeath from "@/assets/foes/skel_gold-death.png";

import mushroomIdle from "@/assets/foes/mushroom-idle.png";
import mushroomWalk from "@/assets/foes/mushroom-walk.png";
import mushroomDeath from "@/assets/foes/mushroom-death.png";

import impVioletIdle from "@/assets/foes/imp_violet-idle.png";
import impVioletWalk from "@/assets/foes/imp_violet-walk.png";
import impVioletDeath from "@/assets/foes/imp_violet-death.png";
import impBileIdle from "@/assets/foes/imp_bile-idle.png";
import impBileWalk from "@/assets/foes/imp_bile-walk.png";
import impBileDeath from "@/assets/foes/imp_bile-death.png";
import impCrimsonIdle from "@/assets/foes/imp_crimson-idle.png";
import impCrimsonWalk from "@/assets/foes/imp_crimson-walk.png";
import impCrimsonDeath from "@/assets/foes/imp_crimson-death.png";
import gnatIdle from "@/assets/foes/gnat-idle.png";
import gnatWalk from "@/assets/foes/gnat-walk.png";
import gnatDeath from "@/assets/foes/gnat-death.png";

import batIdle from "@/assets/foes/bat-idle.png";
import batWalk from "@/assets/foes/bat-walk.png";
import batDeath from "@/assets/foes/bat-death.png";
import sticklooterIdle from "@/assets/foes/sticklooter-idle.png";
import sticklooterWalk from "@/assets/foes/sticklooter-walk.png";
import sticklooterDeath from "@/assets/foes/sticklooter-death.png";
import slimeSkullIdle from "@/assets/foes/slime_skull-idle.png";
import slimeSkullWalk from "@/assets/foes/slime_skull-walk.png";
import slimeSkullDeath from "@/assets/foes/slime_skull-death.png";
import demonSlimeIdle from "@/assets/foes/demon_slime-idle.png";
import demonSlimeWalk from "@/assets/foes/demon_slime-walk.png";
import demonSlimeDeath from "@/assets/foes/demon_slime-death.png";
import nightborneIdle from "@/assets/foes/nightborne-idle.png";
import nightborneWalk from "@/assets/foes/nightborne-walk.png";
import nightborneDeath from "@/assets/foes/nightborne-death.png";

/** [idle, walk, death] strip urls. */
export type ArtStrips = [string, string, string];

export const ENEMY_ART: Partial<Record<CritterEnemyKey, ArtStrips>> = {
  e_skel_white: [skelWhiteIdle, skelWhiteWalk, skelWhiteDeath],
  e_skel_gold: [skelGoldIdle, skelGoldWalk, skelGoldDeath],
  e_imp_violet: [impVioletIdle, impVioletWalk, impVioletDeath],
  e_imp_bile: [impBileIdle, impBileWalk, impBileDeath],
  e_imp_crimson: [impCrimsonIdle, impCrimsonWalk, impCrimsonDeath],
  e_gnat: [gnatIdle, gnatWalk, gnatDeath],
  e_mushroom: [mushroomIdle, mushroomWalk, mushroomDeath],
  e_bat: [batIdle, batWalk, batDeath],
  e_nightborne: [nightborneIdle, nightborneWalk, nightborneDeath],
  e_sticklooter: [sticklooterIdle, sticklooterWalk, sticklooterDeath],
  e_slime_skull: [slimeSkullIdle, slimeSkullWalk, slimeSkullDeath],
  e_demon_slime: [demonSlimeIdle, demonSlimeWalk, demonSlimeDeath],
};
