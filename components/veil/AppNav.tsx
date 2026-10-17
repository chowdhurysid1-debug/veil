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
        isVertical ? "flex-col gap-1" : "gap-1 overflow-x-auto",
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
                "flex items-center rounded-lg font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500",
                isVertical
                  ? "gap-3 px-3 py-2.5 text-sm"
                  : "justify-center gap-1 px-1.5 py-2 text-xs whitespace-nowrap",
                isActive
                  ? "bg-zinc-900 text-white ring-1 ring-zinc-800"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "shrink-0",
                  isVertical ? "size-4.5" : "size-4",
                  isActive && "text-indigo-400",
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
