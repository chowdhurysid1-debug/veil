import Link from "next/link";
import { cn } from "cn";

interface VeilLogoProps {
  href?: string;
  className?: string;
}

export function VeilLogo({ href = "/", className }: VeilLogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-3 outline-none focus-visible:ring-1 focus-visible:ring-signal",
        className,
      )}
    >
      <span
        aria-hidden
        className="size-3 rotate-45 border border-ink transition-colors duration-500 ease-veil group-hover:bg-ink"
      />
      <span className="font-display text-lg font-bold tracking-[0.32em] text-ink uppercase">
        Veil
      </span>
    </Link>
  );
}
