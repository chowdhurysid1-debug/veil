import type { Metadata } from "next";
import { Brain } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/veil/PageHeader";
import { EmptyState } from "@/components/veil/States";

export const metadata: Metadata = { title: "Learning" };

export default function Page() {
  return (
    <PageContainer>
      <PageHeader title="Learning" description="Every alert someone labels improves detection at every site." />
      <EmptyState
        icon={Brain}
        title="Nothing here yet"
        description="This screen is being built next."
      />
    </PageContainer>
  );
}
