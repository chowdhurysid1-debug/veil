import { DEMO_IDENTITY } from "@/lib/contracts";
import { cn } from "cn";

const ROLE = DEMO_IDENTITY.actor.replace(`, ${DEMO_IDENTITY.siteName}`, "");

const INITIALS = ROLE.split(" ")
  .map((word) => word[0])
  .join("")
  .slice(0, 2);

interface IdentityBadgeProps {
  compact?: boolean;
  className?: string;
}

/** The single hardcoded demo identity. Every unlock records this name. */
export function IdentityBadge({
  compact = false,
  className,
}: IdentityBadgeProps) {
  if (compact) {
    return (
      <span
        title={DEMO_IDENTITY.actor}
        className={cn(
          "grid size-8 place-items-center border border-hairline-strong font-mono text-[10px] tracking-[0.1em] text-ink",
          className,
        )}
      >
        <span aria-hidden>{INITIALS}</span>
        <span className="sr-only">Signed in as {DEMO_IDENTITY.actor}</span>
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 border border-hairline p-3",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center border border-hairline-strong font-mono text-xs tracking-[0.1em] text-ink"
      >
        {INITIALS}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{ROLE}</p>
        <p className="label-mono truncate">
          {DEMO_IDENTITY.siteName}
        </p>
      </div>
    </div>
  );
}
