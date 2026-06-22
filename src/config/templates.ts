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
