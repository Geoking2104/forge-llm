import { useState } from "react";
import { cn } from "@/lib/utils";
import { displayImageSrc } from "@/lib/product-images";

export function GpuArt({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-2xl bg-secondary",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-6 rounded-xl bg-surface shadow-[var(--shadow-float)]">
        <div className="absolute inset-3 grid grid-cols-8 grid-rows-6 gap-1">
          {Array.from({ length: 48 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "rounded-sm",
                i % 7 === 0 ? "bg-primary/70" : i % 3 === 0 ? "bg-fg/20" : "bg-fg/10",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductPhoto({
  src,
  fallback,
  alt,
  className,
  imgClassName,
}: {
  src: string | null | undefined;
  fallback?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const [useFallback, setUseFallback] = useState(false);
  const [failed, setFailed] = useState(false);
  const raw = useFallback ? (fallback ?? null) : (src ?? fallback ?? null);
  const display = displayImageSrc(raw);
  if (!display || failed) return <GpuArt className={className} />;
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-2xl bg-secondary outline outline-1 -outline-offset-1 outline-black/10",
        className,
      )}
    >
      <img
        src={display}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => {
          if (!useFallback && fallback && fallback !== src) setUseFallback(true);
          else setFailed(true);
        }}
        className={cn("h-full w-full object-contain p-3", imgClassName)}
      />
    </div>
  );
}

export function ModelArt({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative aspect-video overflow-hidden rounded-2xl bg-secondary", className)}
      aria-hidden
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="size-28 rounded-full bg-primary/15" />
        <span className="absolute size-16 rounded-full bg-primary/30" />
        <span className="absolute size-7 rounded-full bg-primary" />
      </div>
      <div className="absolute inset-x-8 bottom-8 h-1.5 overflow-hidden rounded-full bg-fg/10">
        <span className="block h-full w-2/3 rounded-full bg-primary" />
      </div>
    </div>
  );
}
