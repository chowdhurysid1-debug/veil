import Link from "next/link";
import { ScanFace } from "lucide-react";
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
        "group inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        className,
      )}
    >
      <span className="grid size-8 place-items-center rounded-xl bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30 transition-all duration-200 group-hover:bg-indigo-500/25 group-hover:text-indigo-300">
        <ScanFace className="size-4.5" aria-hidden />
      </span>
      <span className="text-base font-semibold tracking-tight text-white">
        Veil
      </span>
    </Link>
  );
}
