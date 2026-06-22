/**
 * ───────────────────────────────────────────────────────────────────────────
 *  YOUR FORMATS LIVE HERE
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Heidikiller drafts the patient note and referrals to match the structure you
 * define below. These are starting NZ-general-practice defaults — replace the
 * `format` strings with YOUR exact headings/wording and the output will follow.
 *
 * Tips:
 *  - Be concrete. Show the exact section headings and the order you want.
 *  - You can paste a real (de-identified) example note/letter — the model will
 *    mirror its structure and tone.
 *  - `instructions` is where you put rules ("never invent findings", "use NZ
 *    spelling", "always include a safety-net", etc.).
 */

export interface NoteTemplate {
  id: string;
  name: string;
  /** The structure/sections the generated note must follow. */
  format: string;
}

export interface ReferralTemplate {
  id: string;
  name: string;
  /** When this referral type is appropriate (helps the model pick). */
  when: string;
  /** The structure the generated referral letter must follow. */
  format: string;
}

/** Global rules applied to every generated note and referral. */
export const CLINICAL_INSTRUCTIONS = `You are a clinical documentation assistant for a New Zealand clinician.

Rules:
- Write only what is supported by the consultation transcript. NEVER invent
  symptoms, findings, measurements, medications, or history that were not stated.
- If something important is missing or unclear, write "[not documented]" rather
  than guessing.
- Use New Zealand English spelling and standard NZ clinical conventions.
- Be concise and clinical. Use accepted medical abbreviations where appropriate.
- Quote vital signs / doses exactly as stated. Do not round or alter numbers.
- This is a draft for a qualified clinician to review and sign — never present
  it as final or as medical advice to a patient.`;

/**
 * ───────────────────────────────────────────────────────────────────────────
 *  HOW TO WRITE LIKE A GOOD HOUSE OFFICER
 * ───────────────────────────────────────────────────────────────────────────
 *
 * The difference between a good note and a bad one is SELECTION, not length.
 * These rules turn "be concise" (a vibe the model interprets differently every
 * time) into explicit keep/drop decisions. Tune them to your practice.
 */
export const NOTE_STYLE_RULES = `Write like an excellent house officer documenting a ward round: precise,
selective, and clinically literate. Length must scale with clinical complexity —
do NOT pad a simple presentation, and do NOT compress a complex one.

ALWAYS INCLUDE (never drop these):
- The presenting complaint and its key features (onset, duration, character,
  associated symptoms).
- Every vital sign and measurement that was stated — verbatim, exact numbers.
- Every positive examination finding.
- Pertinent NEGATIVES for the presenting complaint (e.g. for chest pain: "no
  radiation, no SOB, no diaphoresis") — a good note documents what was excluded.
- Every medication started, stopped, or changed (with dose/frequency as stated).
- Every investigation ordered and every plan item the clinician actually voiced.
- Relevant past history, allergies, and risk factors germane to THIS problem.

ALWAYS DROP (do not let these into the note):
- Social conversation, small talk, and the patient's tangents — unless they
  change management.
- Repetition and restatements of the same fact.
- Normal/incidental findings that are NOT pertinent negatives for this problem.
- Generic advice, safety-netting, or follow-up that was NOT actually discussed
  in the consultation. Do not add "standard" plan items the clinician didn't say.
- Hedging meta-commentary ("the patient reports that...", "it appears that...").
  Write in clipped clinical style.

STRUCTURE:
- No top-line summary or "Impression" on a consult note — the Assessment IS the
  impression; duplicating it is wrong even for the most complex, many-question
  consult. (Referral LETTERS are the exception and keep their opening line.)
- Number the problems in S and A when there is more than one. A complex consult
  is handled with a numbered problem list, NOT a longer prose summary.

JUDGEMENT:
- If a section has nothing to report, write a single line or omit it — don't
  invent content to fill a heading.
- When the transcript is ambiguous or garbled, prefer "[unclear]" over a guess.`;

export interface NoteExemplar {
  /** Optional: the situation/transcript this note came from (teaches selection). */
  context?: string;
  /** A real, de-identified note in the clinician's preferred style. */
  note: string;
}

/**
 * ───────────────────────────────────────────────────────────────────────────
 *  YOUR EXEMPLARS — the single biggest lever on note quality.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * The model learns your style far better from 2–4 real examples than from any
 * instruction. REPLACE the placeholder below with your own de-identified notes
 * (fake name/NHI/dates). If you can add the rough transcript/dictation in
 * `context`, even better — it teaches what to keep vs drop.
 *
 * Leave this array empty and the model falls back to NOTE_STYLE_RULES alone
 * (still good — but examples are what fix over-summarising / over-including).
 */
export const NOTE_EXEMPLARS: NoteExemplar[] = [
  {
    // Complex, multi-problem consult — numbered problems, no top summary.
    context:
      "52M brings several problems: exertional chest pain, fatigue, HTN review, ankle swelling. ?angina; needs urgent IHD exclusion; oedema likely amlodipine-related.",
    note: `S:
1. Chest pain — 2/52 intermittent central chest tightness, exertional (uphill), relieved by rest ~5 min. No radiation, no syncope/palpitations, +mild exertional SOB. No pleuritic/positional features.
2. Fatigue — 4/52 gradual ↓exercise tolerance. No wt loss/fever/night sweats. No OSA features.
3. HTN — amlodipine 10 mg OD (adherent). Home BP 140–150/85–90. No headache/visual sx.
4. Ankle swelling — 3/52 bilateral, worse evenings. No pain/redness/asymmetry.

O:
BP 148/88, HR 76 reg, SpO2 98% RA.
CVS: HS normal, no murmurs, JVP not raised. Resp: clear. Mild bilateral pitting ankle oedema. No clinical signs of CCF.

A:
1. ?Stable angina until proven otherwise — typical exertional pattern, high pre-test probability (age + HTN). Urgent IHD exclusion.
2. Fatigue / ↓exercise tolerance — likely cardiopulmonary; exclude cardiac first, consider metabolic if workup negative.
3. HTN — suboptimally controlled on monotherapy.
4. Bilateral ankle oedema — likely amlodipine-related; cardiac cause not excluded.

P:
- ECG today; bloods FBC, U&E, LFT, TSH, HbA1c, fasting lipids. Troponin if acute change.
- Urgent cardiology referral — stress test / CTCA per local pathway.
- Continue amlodipine; if oedema persists, switch to ACEi/ARB after review.
- Safety-net: ED if rest pain, ↑frequency/severity, or diaphoresis/syncope/SOB at rest. (discussed)
- Review 1–2/52, sooner if worse.`,
  },
  {
    // ⚠️ PLACEHOLDER simple single-problem example — replace with your own.
    // Shows: one problem → no numbering, 4 lines, not 20.
    context:
      "Adult, 2/7 productive cough + fever, no chest pain/SOB; chest clear; afebrile in clinic; treated as viral URTI.",
    note: `S:
2/7 productive cough, green sputum, subjective fevers. No chest pain, no SOB, no haemoptysis. Non-smoker. PMH nil; meds nil; NKDA.

O:
T 36.8, HR 78, RR 16, SpO2 98% RA, BP 124/76. Chest clear, no crackles/wheeze. Mild pharyngeal erythema.

A:
Viral URTI. No features of pneumonia.

P:
- Symptomatic: fluids, paracetamol PRN. No antibiotics indicated.
- Safety-net: return if SOB, chest pain, or fever >3/7. (discussed)`,
  },
];

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "soap",
    name: "Standard consult note (SOAP)",
    format: `Use compact SOAP headings — S, O, A, P — in clipped clinical style with
standard abbreviations (e.g. 2/52, OD, NAD, SOB).

- Do NOT write a summary or "Impression" line at the top. The Assessment section
  IS the impression — never duplicate it. (This holds even for complex consults
  where the patient brings many problems: number the problems, don't add a prose
  summary on top.)
- When the patient raises MORE THAN ONE problem, number them (1., 2., …) and use
  the SAME numbering in S and A so each history maps to its assessment. For a
  single problem, use no numbering.
- S: history per problem, then relevant PMH / meds / allergies / risk factors.
- O: vital signs (only those stated, verbatim), then examination findings.
- A: one line per problem — working diagnosis/impression with brief reasoning and
  compact hedging where appropriate (e.g. "cardiac cause not excluded").
- P: investigations, medication changes, referrals (note here; full letters are
  generated separately), safety-net advice, and follow-up interval.`,
  },
];

export const REFERRAL_TEMPLATES: ReferralTemplate[] = [
  {
    id: "general-specialist",
    name: "Specialist referral letter",
    when: "The clinician decides to refer the patient to a specialist or secondary-care service.",
    format: `Write a referral letter with this structure:

Dear [Service / Specialty],

Re: [Patient name], DOB [if stated], NHI [if stated]

Reason for referral:
<one or two sentences>

Relevant history:
<concise summary of the presenting problem and pertinent background>

Examination / investigations:
<key findings and any results stated>

Current medications:
<list, or "[not documented]">

What I am asking for:
<the specific question or action requested of the service>

Yours sincerely,
[Referring clinician]`,
  },
];
