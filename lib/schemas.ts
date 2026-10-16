import { z } from "zod";

export const MAX_INPUT_CHARS = 4000;

export const generateInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Enter some text to summarize.")
    .max(MAX_INPUT_CHARS, `Keep the text under ${MAX_INPUT_CHARS} characters.`),
});

export const generateOutputSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(1000),
  tags: z.array(z.string().min(1).max(40)).max(5),
});

export type GenerateInput = z.infer<typeof generateInputSchema>;
export type GenerateOutput = z.infer<typeof generateOutputSchema>;
