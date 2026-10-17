// The one place screens get data from. Every method mirrors a Tab B route and
// returns a shape from lib/contracts.ts. Today it is backed by the in-memory
// mock; C9 swaps in HTTP calls one method at a time.
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
  /** Turns an unlock response into an image URL the browser can show. */
  revealFace: (unlock: UnlockResponse) => Promise<string>;
  listAudit: () => Promise<AuditEntry[]>;
  verifyClip: (
    clipId: string,
    request: VerifyRequest,
  ) => Promise<VerifyResponse>;
}

export const veilApi: VeilApi = mockBackend;
