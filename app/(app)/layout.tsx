import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";
import { AppNav, NavLinks } from "@/components/veil/AppNav";
import { IdentityBadge } from "@/components/veil/IdentityBadge";
import { ToastProvider } from "@/components/veil/Toaster";
import { VeilLogo } from "@/components/veil/VeilLogo";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-1 bg-void">
        <a
          href="#main"
          className="sr-only z-50 bg-ink px-4 py-2 text-sm font-semibold text-void focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>

        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r border-hairline bg-void px-5 py-7 md:flex">
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
            <p className="label-mono leading-relaxed">
              Faces encrypted in this browser. Every unlock logged.
            </p>
            <IdentityBadge />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex flex-col gap-3 border-b border-hairline bg-void/90 px-4 pt-3 backdrop-blur-md md:hidden">
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
            <div className="relative flex flex-1 flex-col">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
