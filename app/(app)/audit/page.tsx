import type { Metadata } from "next";

import { AuditLog } from "@/components/veil/AuditLog";
import { PageContainer, PageHeader } from "@/components/veil/PageHeader";

export const metadata: Metadata = {
  title: "Audit log",
  description: "Every face unlock: who, why, and when.",
};

export default function AuditPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Audit log"
        description="Every face unlock, who did it, and why. The entry is written before the key is released, and Veil has no way to edit or remove one."
      />
      <AuditLog />
    </PageContainer>
  );
}
