import { Suspense } from "react";
import type { Metadata } from "next";

import { ClipView, ClipViewSkeleton } from "@/components/veil/ClipView";
import { PageContainer } from "@/components/veil/PageHeader";

export const metadata: Metadata = {
  title: "Clip review",
  description: "Blurred frames, AI alerts, and locked faces for one clip.",
};

export default function ClipPage({ params }: PageProps<"/clips/[id]">) {
  return (
    <PageContainer>
      <Suspense fallback={<ClipViewSkeleton />}>
        {params.then(({ id }) => (
          <ClipView clipId={id} />
        ))}
      </Suspense>
    </PageContainer>
  );
}
