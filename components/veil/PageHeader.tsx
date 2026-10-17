import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Small monospace label above the title, e.g. "Learning / All sites". */
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-6 border-b border-hairline pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-3xl flex-col gap-4">
        {eyebrow && <p className="label-mono">{eyebrow}</p>}
        <h1 className="font-display text-headline font-bold text-ink">
          {title}
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-ink-muted md:text-base">
          {description}
        </p>
      </div>
      {actions && <div className="flex shrink-0 gap-3">{actions}</div>}
    </header>
  );
}

/** Standard content width and padding for every app screen. */
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-gutter py-10 md:py-14">
      {children}
    </div>
  );
}
