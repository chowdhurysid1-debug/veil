"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, FileCheck, Film, ScrollText } from "lucide-react";
import { cn } from "cn";

const NAV_ITEMS = [
  { href: "/clips", label: "Clips", icon: Film },
  { href: "/learning", label: "Learning", icon: Brain },
  { href: "/audit", label: "Audit log", icon: ScrollText },
  { href: "/verify", label: "Verify", icon: FileCheck },
] as const;

type Orientation = "vertical" | "horizontal";

interface NavLinksProps {
  orientation: Orientation;
  activeHref: string | null;
}

/** Static nav markup. Also the Suspense fallback while the pathname resolves. */
export function NavLinks({ orientation, activeHref }: NavLinksProps) {
  const isVertical = orientation === "vertical";
  return (
    <ul
      className={cn(
        "flex",
        isVertical ? "flex-col" : "gap-1 overflow-x-auto",
      )}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = href === activeHref;
        return (
          <li key={href} className={isVertical ? undefined : "flex-1"}>
            <Link
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex items-center font-mono text-xs tracking-[0.14em] uppercase outline-none transition-colors duration-500 ease-veil focus-visible:ring-1 focus-visible:ring-signal",
                isVertical
                  ? "gap-3 border-l px-4 py-3"
                  : "justify-center gap-1.5 border-b px-1.5 py-2.5 whitespace-nowrap",
                isActive
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-dim hover:text-ink",
              )}
            >
              <Icon
                className={cn(
                  "shrink-0",
                  isVertical ? "size-3.5" : "size-3.5",
                )}
                aria-hidden
              />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AppNav({ orientation }: { orientation: Orientation }) {
  const pathname = usePathname();
  const activeHref =
    NAV_ITEMS.find(
      ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
    )?.href ?? null;
  return <NavLinks orientation={orientation} activeHref={activeHref} />;
}
