"use client";

import * as React from "react";
import { createPortal } from "react-dom";

export type OdysseyLoadingProps = {
  isLoading: boolean;
  progress?: number;
};

function clampProgress(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();

    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return reduceMotion;
}

export function OdysseyLoading({ isLoading, progress }: OdysseyLoadingProps) {
  const shouldReduceMotion = usePrefersReducedMotion();
  const [shouldRender, setShouldRender] = React.useState(isLoading);
  const [isVisible, setIsVisible] = React.useState(isLoading);
  const [displayProgress, setDisplayProgress] = React.useState(
    typeof progress === "number" ? clampProgress(progress) : 0
  );

  React.useEffect(() => {
    if (isLoading) {
      setShouldRender(true);
      setIsVisible(true);
      setDisplayProgress(typeof progress === "number" ? clampProgress(progress) : 0);
    }
  }, [isLoading, progress]);

  React.useEffect(() => {
    if (typeof progress === "number") {
      setDisplayProgress(clampProgress(progress));
    }
  }, [progress]);

  React.useEffect(() => {
    if (!isLoading && isVisible) {
      setDisplayProgress(100);
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, shouldReduceMotion ? 80 : 350);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [isLoading, isVisible, shouldReduceMotion]);

  React.useEffect(() => {
    if (isVisible) return undefined;
    const timeout = setTimeout(() => {
      setShouldRender(false);
    }, shouldReduceMotion ? 80 : 450);
    return () => clearTimeout(timeout);
  }, [isVisible, shouldReduceMotion]);

  React.useEffect(() => {
    if (!isLoading || typeof progress === "number") return undefined;
    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        if (prev >= 90) return prev;
        const delta = Math.max(0.6, (90 - prev) * 0.04);
        return Math.min(90, prev + delta);
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isLoading, progress]);

  if (!shouldRender || typeof document === "undefined") return null;

  const safeProgress = clampProgress(displayProgress);
  const ringAngle = `${safeProgress * 3.6}deg`;

  return createPortal(
    <div
      className={`fixed inset-0 z-9999 flex items-center justify-center transition-opacity ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ pointerEvents: isVisible ? "auto" : "none", transitionDuration: shouldReduceMotion ? "100ms" : "450ms" }}
      aria-live="polite"
      role="status"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[10px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(40,120,255,0.12),transparent_60%)]" />

      <style>{`
        @keyframes odyssey-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes odyssey-glow {
          0% { box-shadow: 0 0 10px rgba(37,99,235,0.25), 0 0 26px rgba(37,99,235,0.18); }
          50% { box-shadow: 0 0 18px rgba(37,99,235,0.5), 0 0 40px rgba(37,99,235,0.35); }
          100% { box-shadow: 0 0 10px rgba(37,99,235,0.25), 0 0 26px rgba(37,99,235,0.18); }
        }
        .odyssey-spin {
          animation: odyssey-spin 1.1s linear infinite;
        }
        .odyssey-glow {
          animation: odyssey-glow 1.6s ease-in-out infinite;
        }
      `}</style>

      <div className="relative z-10 flex flex-col items-center gap-3 px-6">
        <div className="relative">
          <div
            className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full odyssey-spin odyssey-glow"
            style={{
              background: `conic-gradient(from 0deg, rgba(37,99,235,0) 0deg, rgba(37,99,235,0) 260deg, rgba(37,99,235,0.95) ${ringAngle}, rgba(37,99,235,0) 360deg)`,
              WebkitMaskImage: 'radial-gradient(circle, transparent 55%, black 58%)',
              maskImage: 'radial-gradient(circle, transparent 55%, black 58%)',
              willChange: 'transform',
              animation: 'odyssey-spin 1.1s linear infinite',
              transformOrigin: 'center',
            }}
            aria-hidden
          />
        </div>
        <span className="text-base font-medium text-white/80">Loading...</span>
      </div>
    </div>,
    document.body
  );
}
