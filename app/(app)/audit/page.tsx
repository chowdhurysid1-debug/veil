import type { Metadata } from "next";
import { ScrollText } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/veil/PageHeader";
import { EmptyState } from "@/components/veil/States";

export const metadata: Metadata = { title: "Audit log" };

export default function Page() {
  return (
    <PageContainer>
      <PageHeader title="Audit log" description="Every face unlock, who did it, and why. Entries cannot be edited or deleted." />
      <EmptyState
        icon={ScrollText}
        title="Nothing here yet"
        description="This screen is being built next."
      />
    </PageContainer>
  );
}
