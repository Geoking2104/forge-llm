import { useState } from "react";
import { cn } from "@/lib/utils";

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
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <GpuArt className={className} />;
  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-2xl bg-secondary", className)}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain p-4"
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