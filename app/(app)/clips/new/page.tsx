import type { Metadata } from "next";

import { PageContainer, PageHeader } from "@/components/veil/PageHeader";
import { UploadFlow } from "@/components/veil/UploadFlow";

export const metadata: Metadata = {
  title: "Upload a clip",
  description: "Blur, encrypt, and stamp a clip in the browser.",
};

export default function NewClipPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Upload a clip"
        description="Faces are blurred and encrypted on this device first. The server only receives blurred frames, a blurred video, and sealed face crops."
      />
      <UploadFlow />
    </PageContainer>
  );
}
