import { useEffect, useRef, useState } from "react";

/**
 * Plays one horizontal sprite strip (frames laid out left to right).
 * Frames advance on a rAF clock so death strips can play once and hold.
 */
export function AnimSprite({
  src,
  frames,
  fps = 12,
  loop = true,
  playing = true,
  flip,
  className,
  restartKey,
}: {
  src: string;
  frames: number;
  fps?: number;
  loop?: boolean;
  playing?: boolean;
  flip?: boolean;
  className?: string;
  /** change this value to replay a non-looping strip */
  restartKey?: string | number;
}) {
  const [frame, setFrame] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    setFrame(0);
    if (!playing || frames <= 1) return;
    const start = performance.now();
    const step = (now: number) => {
      const i = Math.floor(((now - start) / 1000) * fps);
      setFrame(loop ? i % frames : Math.min(i, frames - 1));
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [src, frames, fps, loop, playing, restartKey]);

  return (
    <div
      aria-hidden
      className={className}
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: `${frames * 100}% 100%`,
        backgroundPosition: `${frames > 1 ? (frame / (frames - 1)) * 100 : 0}% 50%`,
        backgroundRepeat: "no-repeat",
        transform: flip ? "scaleX(-1)" : undefined,
      }}
    />
  );
}
