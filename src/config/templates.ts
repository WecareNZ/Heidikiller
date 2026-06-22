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
    // ⚠️ PLACEHOLDER — replace with your own real, de-identified notes.
    context:
      "Adult, 2-day productive cough + fever, no chest pain/SOB; chest clear; afebrile in clinic; treated as viral URTI.",
    note: `Presenting complaint:
2/7 productive cough + fever.

Subjective (History):
- Productive cough, green sputum, subjective fevers x2/7. No chest pain, no SOB, no haemoptysis. No recent travel. Non-smoker.
- PMH: nil significant. Meds: nil regular. NKDA.

Objective (Examination):
- T 36.8, HR 78, RR 16, SpO2 98% RA, BP 124/76.
- Chest: clear, no crackles/wheeze. ENT: mild pharyngeal erythema.

Assessment:
- Viral URTI. No features of pneumonia.

Plan:
- Symptomatic management: fluids, paracetamol PRN.
- Safety-net: return if SOB, chest pain, or fever >3 more days. (discussed)
- No antibiotics indicated.`,
  },
];

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "soap",
    name: "Standard consult note (SOAP)",
    format: `Produce the note with these headings, in this order:

Presenting complaint:
<one or two lines>

Subjective (History):
- HPC (history of presenting complaint)
- Relevant past medical history, medications, allergies
- Social / family history if raised

Objective (Examination):
- Vital signs (only those stated)
- Examination findings

Assessment:
- Working diagnosis / differential

Plan:
- Investigations
- Treatment / prescriptions
- Referrals (note here; full letters generated separately)
- Safety-net advice and follow-up`,
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
