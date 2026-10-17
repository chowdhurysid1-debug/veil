"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { z } from "zod";
import {
  AlertCircle,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
  Tag,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MAX_INPUT_CHARS, generateOutputSchema } from "@/lib/schemas";

const successResponseSchema = z.object({
  data: generateOutputSchema,
  isFallback: z.boolean(),
});
const errorResponseSchema = z.object({ error: z.string() });

type Summary = z.infer<typeof generateOutputSchema>;

type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; summary: Summary; isFallback: boolean }
  | { status: "error"; message: string };

const SAMPLES = [
  {
    label: "Product update",
    text: "This sprint we cut checkout from five steps to two, added Apple Pay, and saw abandoned carts drop from 31% to 18% in the first week.",
  },
  {
    label: "Standup notes",
    text: "Standup notes: Priya is blocked on the Stripe webhook signature check. Marcus finished the onboarding email. Demo dry run moves to Thursday at 3pm. We still need a fallback screen for when the model is slow.",
  },
  {
    label: "Announcement",
    text: "The library extends weekend hours to 10pm starting in November.",
  },
];

const NETWORK_ERROR =
  "We couldn't reach the server. Check your connection and try again.";

async function requestSummary(text: string): Promise<RequestState> {
  let response: Response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    return { status: "error", message: NETWORK_ERROR };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: "error", message: NETWORK_ERROR };
  }

  const success = successResponseSchema.safeParse(body);
  if (response.ok && success.success) {
    return {
      status: "done",
      summary: success.data.data,
      isFallback: success.data.isFallback,
    };
  }

  const failure = errorResponseSchema.safeParse(body);
  return {
    status: "error",
    message: failure.success
      ? failure.data.error
      : "Something went wrong on our side. Try again in a moment.",
  };
}

export default function Home() {
  const [text, setText] = useState("");
  const [state, setState] = useState<RequestState>({ status: "idle" });

  const isLoading = state.status === "loading";
  const trimmedLength = text.trim().length;
  const isOverLimit = text.length > MAX_INPUT_CHARS;
  const canSubmit = trimmedLength > 0 && !isOverLimit && !isLoading;

  async function runSummary() {
    if (!canSubmit) return;
    setState({ status: "loading" });
    setState(await requestSummary(text));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSummary();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void runSummary();
    }
  }

  return (
    <div className="relative flex flex-1 flex-col bg-zinc-950 font-[family-name:var(--font-geist-sans)] text-zinc-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-indigo-900/25 via-zinc-950 to-zinc-950"
      />

      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <header className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            Live demo
          </span>
          <h1 className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
            Paste notes. Get the headline.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-zinc-400">
            Drop in meeting notes, an update, or an announcement. Claude returns
            a title, a short summary, and tags you can file it under.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-500">Try a sample:</span>
            {SAMPLES.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => setText(sample.text)}
                disabled={isLoading}
                className="cursor-pointer rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300 transition-all duration-200 hover:border-zinc-600 hover:text-white active:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sample.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-2 shadow-xl backdrop-blur-md transition-all duration-200 focus-within:border-indigo-500/60">
            <label htmlFor="notes" className="sr-only">
              Text to summarize
            </label>
            <Textarea
              id="notes"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste anything up to 4,000 characters..."
              aria-invalid={isOverLimit}
              disabled={isLoading}
              className="min-h-40 resize-none border-0 bg-transparent px-3 py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0 dark:bg-transparent md:text-base"
            />
            <div className="flex items-center justify-between gap-4 px-2 pb-1 pt-2">
              <span
                className={`text-xs tabular-nums ${isOverLimit ? "text-rose-400" : "text-zinc-500"}`}
              >
                {text.length.toLocaleString()} /{" "}
                {MAX_INPUT_CHARS.toLocaleString()}
                <span className="hidden sm:inline"> · Cmd+Enter to send</span>
              </span>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="h-11 cursor-pointer rounded-xl bg-indigo-600 px-5 font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 active:bg-indigo-700"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                {isLoading ? "Summarizing" : "Summarize"}
              </Button>
            </div>
          </div>
        </form>

        <section aria-live="polite" className="flex flex-col">
          <ResultPanel state={state} onRetry={() => void runSummary()} />
        </section>
      </main>
    </div>
  );
}

interface ResultPanelProps {
  state: RequestState;
  onRetry: () => void;
}

function ResultPanel({ state, onRetry }: ResultPanelProps) {
  if (state.status === "idle") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center">
        <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400">
          <FileText className="h-6 w-6" />
        </div>
        <p className="text-sm text-zinc-400">
          Your summary shows up here. Pick a sample above to see it work.
        </p>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <Card className="gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 ring-0">
        <div className="h-6 w-2/3 animate-pulse rounded-lg bg-zinc-800" />
        <div className="flex flex-col gap-2">
          <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-zinc-800" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-800" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-800" />
        </div>
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5"
      >
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
        <p className="text-sm leading-relaxed text-rose-200">{state.message}</p>
      </div>
    );
  }

  const { summary, isFallback } = state;
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl ring-0 duration-300">
      <h2 className="text-2xl font-semibold tracking-tight text-white">
        {summary.title}
      </h2>
      <p className="text-base leading-relaxed text-zinc-300">
        {summary.summary}
      </p>
      {summary.tags.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {summary.tags.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </li>
          ))}
        </ul>
      )}
      {isFallback && (
        <Button
          type="button"
          variant="secondary"
          onClick={onRetry}
          className="h-11 w-fit cursor-pointer rounded-xl border border-zinc-700 bg-zinc-800 px-5 text-zinc-100 hover:bg-zinc-700"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </Card>
  );
}
