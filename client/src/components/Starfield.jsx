import { useMemo } from "react";

/**
 * Generates a deterministic field of twinkling stars as the ambient backdrop
 * for the whole app. Pure CSS animation (respects prefers-reduced-motion via
 * global stylesheet), so it's cheap and doesn't fight with Framer Motion
 * page transitions layered on top.
 */
export default function Starfield({ density = 80 }) {
  const stars = useMemo(() => {
    return Array.from({ length: density }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
    }));
  }, [density]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
      <div className="absolute inset-0 bg-night-gradient" />
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-starlight animate-twinkle"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
