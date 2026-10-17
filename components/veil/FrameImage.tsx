import Image from "next/image";
import { cn } from "cn";

import { FRAME_WIDTH_PX } from "@/lib/contracts";

const FRAME_HEIGHT_PX = Math.round((FRAME_WIDTH_PX * 9) / 16);

interface FrameImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

/**
 * A blurred frame. Frames arrive as data URLs or short-lived signed URLs, so
 * they skip the Next image optimizer.
 */
export function FrameImage({ src, alt, className, priority }: FrameImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={FRAME_WIDTH_PX}
      height={FRAME_HEIGHT_PX}
      unoptimized
      priority={priority}
      draggable={false}
      className={cn("h-full w-full object-cover select-none", className)}
    />
  );
}

/** Data URL for a blurred frame straight from the pipeline, which emits JPEG. */
export function frameDataUrl(base64: string): string {
  return `data:image/jpeg;base64,${base64}`;
}
