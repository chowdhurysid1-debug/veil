import type { Metadata } from "next";
import { FileCheck } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/veil/PageHeader";
import { EmptyState } from "@/components/veil/States";

export const metadata: Metadata = { title: "Verify" };

export default function Page() {
  return (
    <PageContainer>
      <PageHeader title="Verify" description="Check a clip against the stamp it got at upload." />
      <EmptyState
        icon={FileCheck}
        title="Nothing here yet"
        description="This screen is being built next."
      />
    </PageContainer>
  );
}
