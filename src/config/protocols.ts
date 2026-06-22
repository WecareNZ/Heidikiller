/**
 * ───────────────────────────────────────────────────────────────────────────
 *  REFERRAL PROTOCOLS — grounding for referral writing
 * ───────────────────────────────────────────────────────────────────────────
 *
 *  When the Scribe drafts a referral, it is grounded in the matching protocol
 *  below: it applies the when-to-refer criteria, ensures the required
 *  pre-referral workup appears in the Plan, includes everything the destination
 *  service needs, and cites the source (HealthPathways / WeCare).
 *
 *  ⚠️ LICENSING / PRIVACY — READ THIS
 *  This repository is PUBLIC. HealthPathways content is licensed and
 *  region-specific; do NOT paste real HealthPathways text into this committed
 *  file. The entries below are SYNTHETIC ILLUSTRATIONS of the shape only.
 *  Put your real, sourced protocol text in a private store — recommended:
 *    • a Supabase table (next build step), or
 *    • a git-ignored `src/config/protocols.local.ts` exporting the same array.
 *  WeCare's own protocols are yours to store as you wish.
 */

export interface ReferralProtocol {
  id: string;
  /** Human title of the pathway, e.g. "Suspected stable angina". */
  title: string;
  /** Where the criteria come from — shown/cited on the letter. */
  source: "HealthPathways" | "WeCare" | string;
  /** Region for HealthPathways (criteria differ by region). */
  region?: string;
  /** Lower-case keywords used to match a consultation to this protocol. */
  triggers: string[];
  /** Criteria for when referral is indicated. */
  whenToRefer: string;
  /** Investigations/actions required BEFORE referral (drives the Plan). */
  requiredWorkup: string;
  /** Acute/emergency criteria that mean "send to ED / acute", not routine. */
  redFlags?: string;
  /** What the referral letter MUST contain for this service. */
  referralMustInclude: string;
  /** Destination service/specialty the letter is addressed to. */
  destination: string;
}

export const REFERRAL_PROTOCOLS: ReferralProtocol[] = [
  {
    // ⚠️ SYNTHETIC ILLUSTRATION — replace with your sourced protocol (privately).
    id: "chest-pain-suspected-angina",
    title: "Suspected stable angina / new exertional chest pain",
    source: "HealthPathways",
    region: "[your region]",
    triggers: ["chest pain", "chest tightness", "angina", "exertional", "ihd"],
    whenToRefer:
      "Refer for cardiology assessment when there is new exertional chest pain with typical anginal features and intermediate-to-high pre-test probability. Urgent if escalating or rest symptoms.",
    requiredWorkup:
      "ECG; FBC, U&E, lipids, HbA1c, TSH; document CV risk factors and BP. Troponin if any acute or rest symptoms.",
    redFlags:
      "Rest pain, prolonged/escalating pain, haemodynamic instability, or ACS features → acute pathway / ED, NOT routine referral.",
    referralMustInclude:
      "Symptom pattern and triggers, CV risk factors, current meds, BP, ECG findings/result, and the specific question for the service.",
    destination: "Cardiology",
  },
  {
    // ⚠️ SYNTHETIC ILLUSTRATION — replace with your WeCare protocol text.
    id: "low-mood-primary-mh",
    title: "Low mood / anxiety — primary mental health referral",
    source: "WeCare",
    triggers: ["low mood", "depression", "anxiety", "mental health", "stress"],
    whenToRefer:
      "Refer to primary mental health / counselling for mild–moderate depression or anxiety not requiring acute crisis care.",
    requiredWorkup:
      "Document risk (SI, self-harm history), exclude mania/psychosis, screen for contributing factors, and record a validated score if used.",
    redFlags:
      "Active suicidal ideation with plan/intent, psychosis, or risk to others → acute mental health crisis pathway, NOT routine referral.",
    referralMustInclude:
      "Presentation and duration, risk assessment, current supports/medications, and what is being requested.",
    destination: "Primary mental health service / counselling",
  },
];
