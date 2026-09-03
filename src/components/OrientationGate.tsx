import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Portrait is the clearest layout for the menu on smaller screens. This is a
 * recommendation, not a wall: landscape users can dismiss it and continue.
 */
export function OrientationGate() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const updateOrientation = () => {
      setShowPrompt(window.innerWidth > window.innerHeight);
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-100 grid place-items-center bg-[oklch(0_0_0/35%)] p-6 text-center backdrop-blur-[2px]">
      <div className="max-w-sm rounded-2xl border-2 border-white/20 bg-[oklch(0.14_0.01_0/94%)] p-6 shadow-2xl">
        <RotateCcw
          className="mx-auto h-14 w-14 animate-pulse text-gold"
          strokeWidth={2.5}
          aria-hidden
        />
        <h2 className="text-title mt-4 text-3xl leading-none">Portrait recommended</h2>
        <p className="mt-2 text-sm font-bold text-muted-foreground">
          Turn your device upright for clearer buttons, icons, and the full ECHO artwork.
        </p>
        <button
          type="button"
          onClick={() => setShowPrompt(false)}
          className="mt-6 rounded-xl border-4 border-ink bg-primary px-6 py-3 text-sm font-black uppercase tracking-wide text-primary-foreground shadow-soft active:translate-y-0.5"
        >
          Continue in landscape
        </button>
      </div>
    </div>
  );
}
