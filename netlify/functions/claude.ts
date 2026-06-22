import Anthropic from "@anthropic-ai/sdk";

/**
 * Server-side proxy for Anthropic. Keeps ANTHROPIC_API_KEY off the client.
 *
 * The note pipeline runs as THREE client-orchestrated passes (one model call
 * each, so none hits the serverless timeout):
 *   1. "extract" — pull grounded clinical facts from the transcript (Sonnet).
 *   2. "compose" — write the SOAP note + referrals from those facts (Opus).
 *   3. "verify"  — audit the draft against the facts and revise (Sonnet).
 * Plus "chat" — streamed clinical Q&A (Opus).
 *
 * Splitting extract/compose/verify is what fixes "over-summarises some, bloats
 * others": the model can only compose from grounded facts (no invention) and
 * every fact is explicitly kept or dropped per the rules (no silent omission).
 */

const MODEL_COMPOSE = "claude-opus-4-8"; // judgement-heavy: selection & phrasing
const MODEL_UTILITY = "claude-sonnet-4-6"; // mechanical extract / audit: fast

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ReferralFormat {
  name: string;
  when: string;
  format: string;
}
interface Exemplar {
  context?: string;
  note: string;
}

interface ExtractPayload {
  action: "extract";
  transcript: string;
  clinicalInstructions: string;
}
interface ComposePayload {
  action: "compose";
  transcript: string;
  facts: unknown;
  clinicalInstructions: string;
  styleRules: string;
  noteFormat: string;
  exemplars: Exemplar[];
  referralFormats: ReferralFormat[];
}
interface VerifyPayload {
  action: "verify";
  transcript: string;
  facts: unknown;
  draft: { note: string; referrals: unknown[] };
  clinicalInstructions: string;
  styleRules: string;
}
interface ChatPayload {
  action: "chat";
  question: string;
  transcript?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

type Payload =
  | ExtractPayload
  | ComposePayload
  | VerifyPayload
  | ChatPayload;

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
    switch (payload.action) {
      case "extract":
        return await handleExtract(payload);
      case "compose":
        return await handleCompose(payload);
      case "verify":
        return await handleVerify(payload);
      case "chat":
        return handleChat(payload);
      default:
        return json({ error: "Unknown action." }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return json({ error: message }, 502);
  }
};

/** Single non-streaming call returning the model's text. */
async function complete(
  model: string,
  maxTokens: number,
  system: string,
  user: string,
): Promise<string> {
  const res = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Model returned no text.");
  return block.text;
}

/** Pull a JSON value out of a model response, tolerating fences/prose. */
function extractJson<T>(raw: string): T | null {
  const cleaned = raw.replace(/```json\s*|\s*```/g, "");
  const start = cleaned.search(/[{[]/);
  const endObj = cleaned.lastIndexOf("}");
  const endArr = cleaned.lastIndexOf("]");
  const end = Math.max(endObj, endArr);
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

// ── Pass 1: extract ─────────────────────────────────────────────────────────
async function handleExtract(p: ExtractPayload): Promise<Response> {
  if (!p.transcript?.trim()) {
    return json({ error: "Transcript is empty — nothing to summarise." }, 400);
  }

  const system = `${p.clinicalInstructions}

You are extracting clinical facts from a raw, possibly messy consultation
transcript (speech-to-text — may contain errors, crosstalk, and small talk).

Extract EVERY clinically relevant fact, faithfully and verbatim where it matters
(numbers, doses, vitals). Do NOT summarise, interpret, or infer — just capture
what was actually said. Ignore pure social conversation. If a value is unclear
or garbled, put it under "unclear".

Return ONLY a JSON object of this shape (no prose, no fences):
{
  "presenting_complaint": "string",
  "history": ["..."],
  "past_history_meds_allergies": ["..."],
  "social_family": ["..."],
  "vitals": ["verbatim, e.g. 'HR 78', 'BP 124/76'"],
  "exam_findings": ["..."],
  "pertinent_negatives": ["explicitly stated negatives, e.g. 'no chest pain'"],
  "investigations_ordered": ["..."],
  "assessment_or_impression": ["..."],
  "plan_items_voiced": ["only plans/advice the clinician actually stated"],
  "medication_changes": ["start/stop/change with dose as stated"],
  "unclear": ["anything garbled or ambiguous"]
}
Use [] for empty categories. Newlines inside strings escaped as \\n.`;

  const text = await complete(
    MODEL_UTILITY,
    4000,
    system,
    `Consultation transcript:\n\n${p.transcript}`,
  );
  const facts = extractJson<Record<string, unknown>>(text);
  if (!facts) return json({ error: "Could not parse extracted facts." }, 502);
  return json({ facts });
}

// ── Pass 2: compose ─────────────────────────────────────────────────────────
async function handleCompose(p: ComposePayload): Promise<Response> {
  const exemplarBlock = p.exemplars.length
    ? `Here are examples of THIS clinician's preferred note style. Match their
density, structure, selectivity, and tone — not their specific content:\n\n` +
      p.exemplars
        .map(
          (e, i) =>
            `--- Example ${i + 1} ---${
              e.context ? `\nSituation: ${e.context}` : ""
            }\nNote:\n${e.note}`,
        )
        .join("\n\n")
    : "";

  const referralGuide = p.referralFormats
    .map(
      (r, i) =>
        `### Referral type ${i + 1}: ${r.name}\nUse when: ${r.when}\nFormat:\n${r.format}`,
    )
    .join("\n\n");

  const system = `${p.clinicalInstructions}

${p.styleRules}

The patient note MUST follow this exact structure:
---
${p.noteFormat}
---

${exemplarBlock}

You will be given a structured list of clinical facts extracted from the
consultation. Write the note from THOSE FACTS as your source of truth. The raw
transcript is provided only to resolve wording/phrasing — never use it to add a
fact that is not in the extracted facts.

Also produce zero or more referral letters. Only generate a referral if the
facts indicate the clinician intends to refer. Choose the matching type:

${referralGuide}

Return ONLY JSON (no prose, no fences):
{"note": "<full SOAP note>", "referrals": [{"title": "<destination/specialty>", "body": "<full letter>"}]}
Use "referrals": [] if none. Newlines inside strings escaped as \\n.`;

  const user = `EXTRACTED FACTS (source of truth):
${JSON.stringify(p.facts, null, 2)}

RAW TRANSCRIPT (wording reference only — do not add new facts):
${p.transcript}`;

  const text = await complete(MODEL_COMPOSE, 8000, system, user);
  const parsed = extractJson<{ note?: string; referrals?: unknown[] }>(text);
  if (!parsed) return json({ error: "Could not parse the drafted note." }, 502);
  return json({
    note: typeof parsed.note === "string" ? parsed.note : "",
    referrals: Array.isArray(parsed.referrals) ? parsed.referrals : [],
  });
}

// ── Pass 3: verify & revise ──────────────────────────────────────────────────
async function handleVerify(p: VerifyPayload): Promise<Response> {
  const system = `${p.clinicalInstructions}

${p.styleRules}

You are auditing a drafted clinical note against the source material. Produce a
CORRECTED final version. Check, and fix where wrong:
1. OMISSIONS — is every voiced plan item, medication change, abnormal/stated
   vital, and positive finding present? Add any that are missing.
2. INVENTIONS — is anything in the draft (especially plan/advice/safety-netting)
   that was NOT in the facts or transcript? Remove it.
3. NUMBERS — are all vitals/doses exact and correct? Fix any drift.
4. SELECTION — is social chatter, repetition, or non-pertinent normal findings
   present? Remove it. Is the length proportionate to complexity?
Keep the existing structure and the clinician's style. Make the minimum changes
needed — do not rewrite good content.

Return ONLY JSON (no prose, no fences):
{"note": "<corrected note>", "referrals": [{"title": "...", "body": "..."}]}`;

  const user = `EXTRACTED FACTS:
${JSON.stringify(p.facts, null, 2)}

RAW TRANSCRIPT:
${p.transcript}

DRAFT TO AUDIT:
${JSON.stringify(p.draft, null, 2)}`;

  const text = await complete(MODEL_UTILITY, 8000, system, user);
  const parsed = extractJson<{ note?: string; referrals?: unknown[] }>(text);
  // If the audit output is unparseable, fall back to the unmodified draft.
  if (!parsed) return json(p.draft);
  return json({
    note: typeof parsed.note === "string" ? parsed.note : p.draft.note,
    referrals: Array.isArray(parsed.referrals) ? parsed.referrals : p.draft.referrals,
  });
}

// ── Clinical chatbot ─────────────────────────────────────────────────────────
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
          model: MODEL_COMPOSE,
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
