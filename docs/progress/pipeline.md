# Progress: pipeline

One line per finished milestone: id, what shipped, commit hash.

## Contract requests

None yet.

## Milestones

- A1: Frame extraction with computeSampleTimes + extractFrames, 8 unit tests, vitest config added (49cfdca)
- A2: Face detection with MediaPipe FaceDetector, normalized bboxes, graceful fallback, 4 tests (923ec4d)
- A3: Face blurring with multi-pass box-blur, 20% padding, clamped to canvas bounds, 3 tests (cf8c565)
- A4: Face vault crypto AES-GCM 256, fresh key per face, round-trip + wrong-key tests, 5 tests (e81dc70)
- A5: SHA-256 hashing with Web Crypto, known-vector tests for empty and "hello", 5 tests (7aa7f05)
- A6: processClip orchestrator, ties A1-A5 together, progress events, validation tests, 3 tests (b63f24d)
- A7: decryptFace unlock flow tests, full sequence + edge cases (1B, 100KB), 3 tests (1e48601)
