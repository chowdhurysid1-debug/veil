import type { Metadata } from "next";

import { ClipsList } from "@/components/veil/ClipsList";
import { PageContainer, PageHeader } from "@/components/veil/PageHeader";

export const metadata: Metadata = {
  title: "Clips",
  description: "Stamped clips with every face blurred and locked.",
};

export default function ClipsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Clips"
        description="Every clip here was blurred, encrypted, and stamped in the browser before upload. Open one to review its alerts."
      />
      <ClipsList />
    </PageContainer>
  );
}
