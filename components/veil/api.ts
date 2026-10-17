// The one place screens get data from. Every method mirrors a Tab B route and
// returns a shape from lib/contracts.ts, parsed from the real response.
import type {
  AnalyzeResponse,
  AuditEntry,
  ClipDetail,
  ClipSummary,
  CreateClipRequest,
  CreateClipResponse,
  FeedbackRequest,
  FeedbackResponse,
  LearningStats,
  UnlockRequest,
  UnlockResponse,
  VerifyRequest,
  VerifyResponse,
  VideoUploadResponse,
} from "../../lib/contracts";
import { httpBackend } from "./httpBackend";

export { VeilApiError, friendlyErrorMessage } from "./errors";

export interface VeilApi {
  listClips: () => Promise<ClipSummary[]>;
  getClip: (clipId: string) => Promise<ClipDetail>;
  createClip: (request: CreateClipRequest) => Promise<CreateClipResponse>;
  analyzeClip: (clipId: string) => Promise<AnalyzeResponse>;
  submitFeedback: (
    eventId: string,
    request: FeedbackRequest,
  ) => Promise<FeedbackResponse>;
  getLearningStats: () => Promise<LearningStats>;
  unlockFace: (
    faceId: string,
    request: UnlockRequest,
  ) => Promise<UnlockResponse>;
  listAudit: () => Promise<AuditEntry[]>;
  verifyClip: (
    clipId: string,
    request: VerifyRequest,
  ) => Promise<VerifyResponse>;
  createVideoUpload: (clipId: string) => Promise<VideoUploadResponse>;
  // Sends the blurred MP4 straight to storage, not through a Veil route.
  uploadVideo: (uploadUrl: string, video: Blob) => Promise<void>;
}

export const veilApi: VeilApi = httpBackend;
