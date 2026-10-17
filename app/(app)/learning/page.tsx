import type { Metadata } from "next";

import { LearningDashboard } from "@/components/veil/LearningDashboard";
import { MeasuredLearning } from "@/components/veil/MeasuredLearning";
import { PageContainer, PageHeader } from "@/components/veil/PageHeader";

export const metadata: Metadata = {
  title: "Learning",
  description: "How human labels from every site tune Veil's alert thresholds.",
};

export default function LearningPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Learning"
        description="Every alert someone marks Real or False alarm tunes detection at every site. Nobody's face is part of a label."
      />
      <div className="flex flex-col gap-10">
        <MeasuredLearning />
        <LearningDashboard />
      </div>
    </PageContainer>
  );
}
