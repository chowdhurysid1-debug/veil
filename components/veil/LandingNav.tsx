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
      className="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-void/85 backdrop-blur-md"
      style={{
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s ease, opacity 0.3s ease",
      }}
    >
      <div className="flex h-16 items-center justify-between gap-4 px-gutter">
        <VeilLogo href="/" />
        <div className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="label-mono hidden px-3 py-2 transition-colors duration-500 ease-veil hover:text-ink md:inline-flex"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/clips/new"
            className={cn(buttonVariants({ size: "default" }), "h-10 px-4")}
          >
            Run the demo
            <ArrowRight aria-hidden />
          </Link>
        </div>
      </div>
    </nav>
  );
}
