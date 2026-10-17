"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";

import { useScrollNav } from "./useScrollNav";
import { VeilLogo } from "./VeilLogo";

const LINKS = [
  { href: "#problem", label: "Why it matters" },
  { href: "#how-it-works", label: "How it works" },
] as const;

export function LandingNav() {
  const visible = useScrollNav();
  return (
    <nav
      aria-label="Site"
      // Inert while hidden, so keyboard users never tab into an invisible bar.
      inert={!visible}
      className="fixed inset-x-0 top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md"
      style={{
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s ease, opacity 0.3s ease",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <VeilLogo href="/" />
        <div className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hidden rounded-lg px-3 py-2 text-sm text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white md:inline-flex"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/clips/new"
            className={cn(buttonVariants({ size: "default" }), "h-10 px-4")}
          >
            Open the demo
            <ArrowRight aria-hidden />
          </Link>
        </div>
      </div>
    </nav>
  );
}
