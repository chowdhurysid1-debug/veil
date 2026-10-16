// In-memory, so the count is per server instance and resets on cold start.
// Good enough to stop runaway spend during a demo. The Anthropic console spend limit is the real backstop.
export const DAILY_GENERATE_CAP = 200;

export function createDailyCap(
  limit: number,
  now: () => Date = () => new Date(),
) {
  let day = "";
  let count = 0;

  return {
    tryConsume(): boolean {
      const today = now().toISOString().slice(0, 10);
      if (today !== day) {
        day = today;
        count = 0;
      }
      if (count >= limit) return false;
      count += 1;
      return true;
    },
  };
}

export const generateCallCap = createDailyCap(DAILY_GENERATE_CAP);
