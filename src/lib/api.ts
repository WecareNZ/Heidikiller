import type { GeneratedDocuments, ChatMessage } from "./types";
import {
  CLINICAL_INSTRUCTIONS,
  NOTE_TEMPLATES,
  REFERRAL_TEMPLATES,
} from "../config/templates";

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

export async function generateDocuments(
  transcript: string,
  noteTemplateId: string,
): Promise<GeneratedDocuments> {
  const note = NOTE_TEMPLATES.find((t) => t.id === noteTemplateId) ?? NOTE_TEMPLATES[0];

  const res = await fetch("/.netlify/functions/claude", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "generate",
      transcript,
      clinicalInstructions: CLINICAL_INSTRUCTIONS,
      noteFormat: note.format,
      referralFormats: REFERRAL_TEMPLATES.map((r) => ({
        name: r.name,
        when: r.when,
        format: r.format,
      })),
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to generate documents.");
  return {
    note: data.note ?? "",
    referrals: Array.isArray(data.referrals) ? data.referrals : [],
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
