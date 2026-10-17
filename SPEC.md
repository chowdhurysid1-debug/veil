# SPEC: Veil (working name)

Security cameras that forget faces unless there is a reason to remember.

## Problem

Schools, stores, and hospitals need cameras for safety, but every camera records every face. Stored face data is a legal and breach risk: Facebook paid $650M to settle an Illinois biometric privacy case ([Orrick](https://infobytes.orrick.com/2021-03-04/court-approves-650-million-biometric-privacy-class-action-settlement/)), and the EU AI Act bans building face databases from CCTV, with fines up to 7% of global turnover ([Orrick](https://www.orrick.com/en/Insights/2025/04/EU-Commission-Publishes-Guidelines-on-the-Prohibited-AI-Practices-under-the-AI-Act)). Meanwhile AI-edited video lets anyone claim real footage is fake.

Existing tools blur faces only on screen. Verkada's Live Face Blur keeps real faces in stored footage ([Verkada](https://www.verkada.com/blog/nov-2023-product-updates/)) and only works on Verkada hardware.

## User

A school safety officer reviewing camera alerts. They need to know when something real happens (a fall, a fight, a fire) without anyone being able to browse students' faces.

## What makes it different

1. **Faces are never stored in the clear.** Each face crop is encrypted in the browser before upload. Unlocking one needs a written reason and is logged forever.
2. **The AI never sees a face.** Event detection runs on already-blurred frames.
3. **It learns across every customer.** Every alert a human marks "real" or "false alarm" improves detection for all sites.
4. **Footage is stamped at upload.** Any later edit is caught by "Verify".
5. **Works with any camera.** Input is a video file, not proprietary hardware.

## The demo path

1. Upload a 20 to 30 second clip. Every face comes out blurred; a counter shows "7 faces locked, 0 stored in the clear".
2. The AI flags an event on the timeline: "Possible fall at 0:14, confidence 0.71".
3. The officer taps **False alarm** (the person sat down to tie a shoe). The learning panel updates: "Learned from 1 new label across 2 sites".
4. A second, similar clip is analyzed and is **not** flagged. A real fall in a third clip still is.
5. The officer unlocks one face. The app requires a reason; the unlock appears in the audit log.
6. Edit one byte of the stamped clip and press **Verify**: "Tampered. Hash does not match the stamp from 21:04."

## What the AI does

- **Input:** 3 to 20 blurred JPEG frames, 640px wide from one clip, plus few-shot examples of past human labels (real and false alarm) for the same event types across all sites.
- **Output (Zod, `lib/contracts.ts`):** `{ events: [{ frameIndex, type: "fall" | "fight" | "theft" | "fire" | "other", confidence: 0..1, description }] }`, max 10 events.
- **Learning:** few-shot examples retrieved from the `feedback` table, plus a per-type confidence threshold calibrated from each type's false-alarm rate. Both are visible in the learning panel.
- **Fallback:** if the call fails or the output does not parse, the clip is still stored and blurred, and the timeline shows "Analysis unavailable, review manually". No raw error reaches the UI.

## Out of scope

- Live camera streams (video files only).
- Real login. One hardcoded demo identity ("Safety Officer, Demo High School"); every unlock records it.
- Production key management. Demo wraps face keys with a server secret; the pitch says production uses a KMS.
- Audio.
- Mobile layout polish beyond "not broken".
- Face recognition of any kind. The product never identifies who someone is.
