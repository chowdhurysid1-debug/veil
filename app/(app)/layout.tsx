import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { LockKeyhole, Upload } from "lucide-react";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";
import { AppNav, NavLinks } from "@/components/veil/AppNav";
import { IdentityBadge } from "@/components/veil/IdentityBadge";
import { ToastProvider } from "@/components/veil/Toaster";
import { VeilLogo } from "@/components/veil/VeilLogo";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-1 bg-zinc-950">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>

        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-zinc-800/80 bg-zinc-950 px-4 py-5 md:flex">
          <VeilLogo href="/" className="px-1" />

          <Link
            href="/clips/new"
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            <Upload aria-hidden />
            Upload clip
          </Link>

          <nav aria-label="Main">
            <Suspense
              fallback={<NavLinks orientation="vertical" activeHref={null} />}
            >
              <AppNav orientation="vertical" />
            </Suspense>
          </nav>

          <div className="mt-auto flex flex-col gap-3">
            <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-zinc-500">
              <LockKeyhole
                className="mt-0.5 size-3.5 shrink-0 text-emerald-400"
                aria-hidden
              />
              Faces are encrypted in this browser. Unlocks are logged under your
              name.
            </p>
            <IdentityBadge />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex flex-col gap-3 border-b border-zinc-800/80 bg-zinc-950/85 px-4 pt-3 pb-2 backdrop-blur-md md:hidden">
            <div className="flex items-center justify-between gap-3">
              <VeilLogo href="/" />
              <div className="flex items-center gap-2">
                <Link
                  href="/clips/new"
                  className={cn(
                    buttonVariants({ size: "default" }),
                    "h-9 px-3",
                  )}
                >
                  <Upload aria-hidden />
                  Upload
                </Link>
                <IdentityBadge compact />
              </div>
            </div>
            <nav aria-label="Main">
              <Suspense
                fallback={
                  <NavLinks orientation="horizontal" activeHref={null} />
                }
              >
                <AppNav orientation="horizontal" />
              </Suspense>
            </nav>
          </header>

          <main id="main" className="relative flex flex-1 flex-col">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950/0 to-zinc-950/0"
            />
            <div className="relative flex flex-1 flex-col">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
