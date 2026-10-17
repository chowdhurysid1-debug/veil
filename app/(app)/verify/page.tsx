import { Suspense } from "react";
import type { Metadata } from "next";

import { PageContainer, PageHeader } from "@/components/veil/PageHeader";
import { VerifyPanel, VerifySkeleton } from "@/components/veil/VerifyPanel";

export const metadata: Metadata = {
  title: "Verify",
  description: "Check a video file against the stamp it got at upload.",
};

export default function VerifyPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Verify footage"
        description="Prove a file is the footage that was stamped at upload. Change one byte and the hash stops matching."
      />
      <Suspense fallback={<VerifySkeleton />}>
        <VerifyPanel />
      </Suspense>
    </PageContainer>
  );
}
