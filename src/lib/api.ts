import type { GeneratedDocuments, ChatMessage } from "./types";
import {
  CLINICAL_INSTRUCTIONS,
  NOTE_STYLE_RULES,
  NOTE_EXEMPLARS,
  NOTE_TEMPLATES,
  REFERRAL_TEMPLATES,
} from "../config/templates";

export type GenStage = "extracting" | "composing" | "checking";

async function callClaude<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/.netlify/functions/claude", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return data as T;
}

/**
 * Thin client for the Netlify Functions. All Claude calls go through the
 * server so API keys stay off the browser.
 */

export async function fetchDeepgramToken(): Promise<string> {
  const res = await fetch("/.netlify/functions/deepgram-token", {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Could not get a transcription token.");
  return data.token as string;
}

/**
 * Three-pass pipeline (extract → compose → verify), orchestrated client-side so
 * each model call is its own short serverless request. `onStage` drives the UI.
 */
export async function generateDocuments(
  transcript: string,
  noteTemplateId: string,
  onStage?: (stage: GenStage) => void,
): Promise<GeneratedDocuments> {
  const note = NOTE_TEMPLATES.find((t) => t.id === noteTemplateId) ?? NOTE_TEMPLATES[0];

  // Pass 1 — extract grounded clinical facts.
  onStage?.("extracting");
  const { facts } = await callClaude<{ facts: unknown }>({
    action: "extract",
    transcript,
    clinicalInstructions: CLINICAL_INSTRUCTIONS,
  });

  // Pass 2 — compose the note + referrals from the facts.
  onStage?.("composing");
  const draft = await callClaude<GeneratedDocuments>({
    action: "compose",
    transcript,
    facts,
    clinicalInstructions: CLINICAL_INSTRUCTIONS,
    styleRules: NOTE_STYLE_RULES,
    noteFormat: note.format,
    exemplars: NOTE_EXEMPLARS,
    referralFormats: REFERRAL_TEMPLATES.map((r) => ({
      name: r.name,
      when: r.when,
      format: r.format,
    })),
  });

  // Pass 3 — audit the draft against the source and revise.
  onStage?.("checking");
  const final = await callClaude<GeneratedDocuments>({
    action: "verify",
    transcript,
    facts,
    draft,
    clinicalInstructions: CLINICAL_INSTRUCTIONS,
    styleRules: NOTE_STYLE_RULES,
  });

  return {
    note: final.note ?? "",
    referrals: Array.isArray(final.referrals) ? final.referrals : [],
  };
}

/**
 * Streams a clinical answer. `onDelta` is called with each text chunk.
 */
export async function askClinicalQuestion(
  question: string,
  transcript: string,
  history: ChatMessage[],
  onDelta: (chunk: string) => void,
): Promise<void> {
  const res = await fetch("/.netlify/functions/claude", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "chat", question, transcript, history }),
  });

  if (!res.ok || !res.body) {
    let message = "Failed to get an answer.";
    try {
      message = (await res.json()).error ?? message;
    } catch {
      /* response was not JSON */
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    onDelta(decoder.decode(value, { stream: true }));
  }
}
