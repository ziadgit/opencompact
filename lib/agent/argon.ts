import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const ARGON = "gemini-4-argon";

let client: GoogleGenAI | null = null;
function ai() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

type Opts = { system?: string; temperature?: number; urlContext?: boolean };

/** One structured-output call to Gemini 4 Argon, validated with zod. */
export async function argonJSON<T>(prompt: string, schema: z.ZodType<T>, opts: Opts = {}): Promise<T> {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" });
  const res = await ai().models.generateContent({
    model: ARGON,
    contents: prompt,
    config: {
      // URL context can't be combined with a strict response schema, so describe the shape in the prompt instead.
      ...(opts.urlContext
        ? { tools: [{ urlContext: {} }] }
        : { responseMimeType: "application/json", responseJsonSchema: jsonSchema }),
      temperature: opts.temperature ?? 0.2,
      systemInstruction: opts.urlContext
        ? `${opts.system ?? ""}\nReply with JSON only, matching this JSON Schema:\n${JSON.stringify(jsonSchema)}`
        : opts.system,
    },
  });
  const text = (res.text ?? "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  return schema.parse(JSON.parse(text));
}

/** Plain-text Argon call (used for Markdown drafting). */
export async function argonText(prompt: string, opts: Opts = {}): Promise<string> {
  const res = await ai().models.generateContent({
    model: ARGON,
    contents: prompt,
    config: { temperature: opts.temperature ?? 0.3, systemInstruction: opts.system },
  });
  return res.text ?? "";
}
