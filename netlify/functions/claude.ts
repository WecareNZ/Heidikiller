import Anthropic from "@anthropic-ai/sdk";

/**
 * Server-side proxy for Anthropic. Keeps ANTHROPIC_API_KEY off the client.
 *
 * Two actions (selected by the JSON body `action` field):
 *   - "generate": draft the patient note + referrals from a transcript.
 *                 Returns JSON: { note: string, referrals: {title,body}[] }.
 *   - "chat":     answer a clinician's question. Streams plain text back.
 */

const MODEL = "claude-opus-4-8";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface GeneratePayload {
  action: "generate";
  transcript: string;
  clinicalInstructions: string;
  noteFormat: string;
  referralFormats: { name: string; when: string; format: string }[];
}

interface ChatPayload {
  action: "chat";
  question: string;
  transcript?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

type Payload = GeneratePayload | ChatPayload;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, 500);
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  try {
    if (payload.action === "generate") return await handleGenerate(payload);
    if (payload.action === "chat") return handleChat(payload);
    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return json({ error: message }, 502);
  }
};

async function handleGenerate(p: GeneratePayload): Promise<Response> {
  if (!p.transcript?.trim()) {
    return json({ error: "Transcript is empty — nothing to summarise." }, 400);
  }

  const referralGuide = p.referralFormats
    .map(
      (r, i) =>
        `### Referral type ${i + 1}: ${r.name}\nUse when: ${r.when}\nFormat:\n${r.format}`,
    )
    .join("\n\n");

  const system = `${p.clinicalInstructions}

You will be given a raw, possibly messy transcript of a clinical consultation
(speech-to-text, may contain errors and crosstalk). Produce two things:

1. A patient note that EXACTLY follows this format:
---
${p.noteFormat}
---

2. Zero or more referral letters. Only generate a referral if the transcript
indicates the clinician intends to refer the patient. Choose the matching
referral type from these definitions:

${referralGuide}

Return your answer as JSON matching the provided schema. The "note" is the full
note text. Each entry in "referrals" has a short "title" (e.g. the destination
specialty) and the full letter "body". If no referral is warranted, return an
empty "referrals" array.`;

  const jsonSpec = `Return ONLY a JSON object (no markdown fences, no prose) of this exact shape:
{"note": "<the full note text>", "referrals": [{"title": "<short destination/specialty>", "body": "<the full referral letter>"}]}
If no referral is warranted, use "referrals": []. Newlines inside strings must be escaped as \\n.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: `${system}\n\n${jsonSpec}`,
    messages: [{ role: "user", content: `Consultation transcript:\n\n${p.transcript}` }],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    return json({ error: "Model returned no usable output." }, 502);
  }

  const parsed = extractJson(text.text);
  if (!parsed) {
    return json({ error: "Could not parse the model's output." }, 502);
  }
  return json(parsed);
}

/** Pulls a JSON object out of a model response, tolerating stray fences/prose. */
function extractJson(raw: string): { note: string; referrals: unknown[] } | null {
  const fenced = raw.replace(/```json\s*|\s*```/g, "");
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(fenced.slice(start, end + 1));
    return {
      note: typeof obj.note === "string" ? obj.note : "",
      referrals: Array.isArray(obj.referrals) ? obj.referrals : [],
    };
  } catch {
    return null;
  }
}

function handleChat(p: ChatPayload): Response {
  if (!p.question?.trim()) {
    return json({ error: "Question is empty." }, 400);
  }

  const system = `You are a clinical decision-support assistant helping a qualified
New Zealand clinician DURING a live patient consultation. Answer their clinical
questions accurately and concisely.

- Be direct and practical; the clinician is busy and mid-consult.
- Where relevant, reference NZ guidelines (e.g. NZF, BPAC, HealthPathways) by name.
- State uncertainty plainly. Do not fabricate doses, thresholds, or guideline content.
- You support the clinician's decision-making; you are not the decision-maker.
- Keep answers focused. Use short bullet points when listing.`;

  const history = (p.history ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const context = p.transcript?.trim()
    ? `Context from the current consultation so far (may be incomplete):\n${p.transcript}\n\n---\n\n`
    : "";

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const s = client.messages.stream({
          model: MODEL,
          max_tokens: 2000,
          system,
          messages: [
            ...history,
            { role: "user", content: `${context}Question: ${p.question}` },
          ],
        });
        for await (const event of s) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "stream error";
        controller.enqueue(new TextEncoder().encode(`\n\n[error: ${message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
