// The one place screens get data from. Every method mirrors a Tab B route and
// returns a shape from lib/contracts.ts. C9 moves screens from the in-memory
// mock to the real routes one at a time.
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
} from "../../lib/contracts";
import { httpBackend } from "./httpBackend";
import { mockBackend } from "./mockBackend";

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
}

export const veilApi: VeilApi = {
  ...mockBackend,
  // Clips: upload, list, and clip view share ids, so they move together.
  listClips: httpBackend.listClips,
  getClip: httpBackend.getClip,
  createClip: httpBackend.createClip,
  analyzeClip: httpBackend.analyzeClip,
  // Review and learning: clip view labels, learning card, /learning.
  submitFeedback: httpBackend.submitFeedback,
  getLearningStats: httpBackend.getLearningStats,
};
