import { useEffect, useState } from "react";
import { SINGLE_SRC } from "@/game/assets";
import { spriteIconUrl } from "@/game/sprite-frame";

/**
 * Renders a single weapon sprite. Animation strips are sliced down to their
 * first frame, trimmed and lifted out of near-black so every gun reads as one
 * clean, visible silhouette in menus and shops.
 */
export function SpriteIcon({
  sprite,
  className,
  alt = "",
  tint = "#e2e8ff",
}: {
  sprite: string;
  className?: string;
  alt?: string;
  /** Weapon colour — the icon is tinted towards it so dark pack art stays visible. */
  tint?: string;
}) {
  const raw = SINGLE_SRC[sprite] ?? "";
  const [url, setUrl] = useState("");

  useEffect(() => {
    let live = true;
    setUrl("");
    if (!raw) return;
    spriteIconUrl(raw, tint).then((u) => {
      if (live) setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [raw, tint]);

  if (!url) return null;
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      draggable={false}
      style={{
        imageRendering: "pixelated",
        width: "100%",
        height: "100%",
        objectFit: "contain",
        filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.55))",
      }}
    />
  );
}
